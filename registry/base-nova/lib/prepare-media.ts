import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import sharp from "sharp"
import type { MediaAsset } from "@/registry/base-nova/lib/media-asset"

const exec = promisify(execFile)
export type PreparedMedia = {
  asset: Omit<MediaAsset, "src" | "poster">
  files: {
    role: "source" | "poster"
    name: string
    mime: string
    data: Buffer
  }[]
}
export type PrepareOptions = {
  maxBytes?: number
  maxPixels?: number
  /** Explicit opt-in: requires ffmpeg/ffprobe on PATH. Images never invoke them. */
  video?: boolean
  /** Keep sound in the prepared video. Preview components still play muted. */
  audio?: boolean
  posterFormat?: "webp" | "jpeg"
  /** A chosen video poster time, clamped to the clip duration. */
  posterTime?: number
  signal?: AbortSignal
}

async function preview(
  data: Buffer,
  maxPixels: number,
  format: "webp" | "jpeg" = "webp",
) {
  const image = sharp(data, { limitInputPixels: maxPixels }).rotate()
  const poster = await image
    .clone()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFormat(format, { quality: 82 })
    .toBuffer()
  // PNG keeps transparency. Blur belongs to presentation, not a lossy preprocessing pass.
  const tiny = await image
    .clone()
    .resize({ width: 16, height: 16, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()
  return {
    poster,
    mime: `image/${format}`,
    ext: format === "jpeg" ? "jpg" : "webp",
    blurDataURL: `data:image/png;base64,${tiny.toString("base64")}`,
  }
}

/** Prepare bytes once. Upload returned files using the application's own store.
 * Originals are preserved; no credentials, remote fetch, publication, or database writes. */
export async function prepareMedia(
  input: Buffer,
  options: PrepareOptions = {},
): Promise<PreparedMedia> {
  const {
    maxBytes = 32 * 1024 * 1024,
    maxPixels = 40_000_000,
    signal,
  } = options
  signal?.throwIfAborted()
  if (!input.length || input.length > maxBytes)
    throw new Error(`Media must contain 1–${maxBytes} bytes`)
  const meta = await sharp(input, { limitInputPixels: maxPixels })
    .metadata()
    .catch(() => null)
  // Sharp identifies AVIF through its HEIF container and AV1 compression.
  const format =
    meta?.format === "heif" && meta.compression === "av1"
      ? "avif"
      : meta?.format
  if (meta && ["jpeg", "png", "webp", "gif", "avif"].includes(format ?? "")) {
    const height = meta.pageHeight ?? meta.height
    if (!meta.width || !height || meta.width * height > maxPixels)
      throw new Error("Invalid image dimensions")
    const rotated = (meta.orientation ?? 0) >= 5
    const width = rotated ? height : meta.width
    const displayHeight = rotated ? meta.width : height
    const animated = (meta.pages ?? 1) > 1
    const ext = format === "jpeg" ? "jpg" : format
    const mime = `image/${format}`
    const p = await preview(input, maxPixels, options.posterFormat)
    const id = createHash("sha256")
      .update(input)
      .update(p.poster)
      .update(p.blurDataURL)
      .digest("hex")
      .slice(0, 24)
    signal?.throwIfAborted()
    return {
      asset: {
        kind: animated ? "animation" : "image",
        width,
        height: displayHeight,
        mime,
        bytes: input.length,
        blurDataURL: p.blurDataURL,
      },
      files: [
        {
          role: "source",
          name: `${id}-${width}x${displayHeight}.${ext}`,
          mime,
          data: input,
        },
        {
          role: "poster",
          name: `${id}.poster.${p.ext}`,
          mime: p.mime,
          data: p.poster,
        },
      ],
    }
  }
  if (!options.video)
    throw new Error(
      "Unsupported image; video preparation must be explicitly enabled",
    )
  const dir = await mkdtemp(join(tmpdir(), "prepare-media-"))
  try {
    const source = join(dir, "source")
    const output = join(dir, "video.mp4")
    const posterPath = join(dir, "poster.png")
    await writeFile(source, input)
    const run = (bin: string, args: string[]) =>
      exec(bin, args, { signal, timeout: 120_000, maxBuffer: 1024 * 1024 })
    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      source,
    ])
    const probe = JSON.parse(stdout)
    const stream = probe.streams?.find(
      (s: { codec_type: string }) => s.codec_type === "video",
    )
    const duration = Number(probe.format?.duration)
    if (
      !stream ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 600 ||
      stream.width * stream.height > maxPixels
    )
      throw new Error(
        "Expected a video up to 10 minutes within the pixel limit",
      )
    // A browser-compatible rendition; preserve audio for the normal player (previews mute it).
    await run("ffmpeg", [
      "-v",
      "error",
      "-i",
      source,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-vf",
      "scale='trunc(min(1920,iw)/2)*2':-2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "23",
      ...(options.audio === false ? ["-an"] : ["-c:a", "aac"]),
      "-movflags",
      "+faststart",
      output,
    ])
    await run("ffmpeg", [
      "-v",
      "error",
      "-ss",
      String(Math.max(0, Math.min(options.posterTime ?? 0, duration / 2))),
      "-i",
      output,
      "-frames:v",
      "1",
      posterPath,
    ])
    const posterBytes = await readFile(posterPath)
    const dimensions = await sharp(posterBytes).metadata()
    if (!dimensions.width || !dimensions.height)
      throw new Error("Missing video dimensions")
    const p = await preview(posterBytes, maxPixels, options.posterFormat)
    const video = await readFile(output)
    const rev = createHash("sha256")
      .update(video)
      .update(p.poster)
      .update(p.blurDataURL)
      .digest("hex")
      .slice(0, 24)
    return {
      asset: {
        kind: "video",
        width: dimensions.width,
        height: dimensions.height,
        mime: "video/mp4",
        bytes: video.length,
        duration,
        blurDataURL: p.blurDataURL,
      },
      files: [
        { role: "source", name: `${rev}.mp4`, mime: "video/mp4", data: video },
        {
          role: "poster",
          name: `${rev}.poster.${p.ext}`,
          mime: p.mime,
          data: p.poster,
        },
      ],
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Resolve storage URLs after writing the prepared files. */
export function mediaAsset(
  prepared: PreparedMedia,
  url: (name: string) => string,
): MediaAsset {
  const source = prepared.files.find((f) => f.role === "source")
  if (!source) throw new Error("Prepared media has no source")
  const poster = prepared.files.find((f) => f.role === "poster")
  return {
    ...prepared.asset,
    src: url(source.name),
    ...(poster ? { poster: url(poster.name) } : {}),
  }
}
