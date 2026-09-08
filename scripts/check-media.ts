import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import sharp from "sharp"
import { isMediaAsset } from "../registry/base-nova/lib/media-asset"
import {
  mediaAsset,
  prepareMedia,
} from "../registry/base-nova/lib/prepare-media"

const transparent = await sharp({
  create: {
    width: 80,
    height: 40,
    channels: 4,
    background: { r: 200, g: 40, b: 0, alpha: 0.3 },
  },
})
  .png()
  .toBuffer()
const prepared = await prepareMedia(transparent)
assert.equal(prepared.asset.width, 80)
assert.equal(prepared.asset.height, 40)
assert.deepEqual(prepared.files[0].data, transparent, "preserve originals")
assert.ok(prepared.asset.blurDataURL)
const tiny = Buffer.from(prepared.asset.blurDataURL.split(",")[1], "base64")
assert.equal((await sharp(tiny).metadata()).hasAlpha, true)
assert.ok(tiny.length < 2048, "small inline placeholder")
assert.ok(isMediaAsset(mediaAsset(prepared, (name) => `/media/${name}`)))
assert.ok(!isMediaAsset({ width: 0 }))
const avif = await prepareMedia(await sharp(transparent).avif().toBuffer())
assert.equal(avif.asset.mime, "image/avif")
assert.ok(avif.files[0].name.endsWith(".avif"))
await assert.rejects(prepareMedia(Buffer.from("not an image")))
await assert.rejects(prepareMedia(transparent, { maxBytes: 2 }))
await assert.rejects(prepareMedia(transparent, { maxPixels: 10 }))
await assert.rejects(prepareMedia(transparent, { signal: AbortSignal.abort() }))
const rotated = await sharp(transparent)
  .jpeg()
  .withMetadata({ orientation: 6 })
  .toBuffer()
const portrait = await prepareMedia(rotated)
assert.equal(portrait.asset.width, 40)
assert.equal(portrait.asset.height, 80)

const dir = await mkdtemp(join(tmpdir(), "media-check-"))
try {
  const clip = join(dir, "clip.mp4")
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=160x90:rate=30",
    "-t",
    "0.5",
    "-vf",
    "scale=160:-2",
    "-an",
    clip,
  ])
  const video = await prepareMedia(await readFile(clip), { video: true })
  assert.equal(video.asset.kind, "video")
  assert.equal(video.asset.width, 160)
  assert.ok(video.asset.duration && video.asset.duration < 1)
  assert.ok(video.files.some((f) => f.role === "poster"))
  const gif = join(dir, "animation.gif")
  execFileSync("ffmpeg", ["-v", "error", "-i", clip, "-vf", "fps=4", gif])
  const bytes = await readFile(gif)
  const animation = await prepareMedia(bytes)
  assert.equal(animation.asset.kind, "animation")
  assert.deepEqual(animation.files[0].data, bytes)
  for (const input of [await readFile(clip), bytes]) {
    const bounce = await prepareMedia(input, { playback: "boomerang" })
    assert.equal(bounce.asset.kind, "video")
    assert.equal(bounce.asset.mime, "video/mp4")
    assert.ok(bounce.asset.duration && bounce.asset.duration > 0.7)
    const output = join(dir, "bounce.mp4")
    await writeFile(output, bounce.files[0].data)
    const probe = JSON.parse(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_streams", "-of", "json", output],
        { encoding: "utf8" },
      ),
    )
    assert.equal(probe.streams.length, 1, "boomerang has no audio track")
    assert.equal(probe.streams[0].codec_name, "h264")
    const frames = execFileSync("ffmpeg", [
      "-v",
      "error",
      "-i",
      output,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "pipe:1",
    ])
    const frameSize = bounce.asset.width * bounce.asset.height
    const count = frames.length / frameSize
    assert.ok(count >= 4)
    // Every interior frame in the forward half has a matching reversed frame.
    for (let frame = 1; frame < count / 2; frame++) {
      let difference = 0
      for (let pixel = 0; pixel < frameSize; pixel++)
        difference += Math.abs(
          frames[frame * frameSize + pixel] -
            frames[(count - frame) * frameSize + pixel],
        )
      assert.ok(
        difference / frameSize < 8,
        "decoded motion reverses, allowing lossy encoding",
      )
    }
  }
  await assert.rejects(
    prepareMedia(transparent, { playback: "boomerang" }),
    /animated/,
  )
  await assert.rejects(
    prepareMedia(bytes, { playback: "boomerang", audio: true }),
    /silent/,
  )
} finally {
  await rm(dir, { recursive: true, force: true })
}
console.log(
  "✓ media: original bytes, orientation, transparency, limits, aborts, GIF frames, video rendition and poster",
)
