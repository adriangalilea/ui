import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
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
    "-i",
    "public/bunny.mp4",
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
} finally {
  await rm(dir, { recursive: true, force: true })
}
console.log(
  "✓ media: original bytes, orientation, transparency, limits, aborts, GIF frames, video rendition and poster",
)
