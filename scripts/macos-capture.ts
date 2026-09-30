// Films a macos scene frame by frame and encodes it: an animated WebP for a README
// (an <img>, so GitHub plays it inline), an mp4 for a site or a post. Films are
// hosted, never committed.
//
//   bun scripts/macos-capture.ts awake/lid-closed --out lid-closed.webp --out lid-closed.mp4
//     [--device macbook|display] [--accent "#e7a13c"] [--width 1200] [--fps 30]
//
// The scene is public/macos/<app>/<scene>.json (the app's compiler writes it there).
// Every motion on the stage is a function of scene time, so each frame is seeked, not
// waited for: the capture is exact however slow the machine is. Needs the demo site
// running (`mise dev`, or BASE_URL), ffmpeg and img2webp.
import { spawnSync } from "node:child_process"
import { mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium } from "playwright"

const args = process.argv.slice(2)
const scene = args[0]
if (!scene || scene.startsWith("--")) {
  console.error(
    "usage: bun scripts/macos-capture.ts <app>/<scene> --out file.webp|file.mp4 [--device macbook|display] [--accent #hex] [--width 1200] [--fps 30]",
  )
  process.exit(2)
}
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i < 0 ? undefined : args[i + 1]
}
const outs = args.flatMap((a, i) =>
  a === "--out" ? [resolve(args[i + 1] as string)] : [],
)
if (outs.length === 0) throw new Error("--out file.webp|file.mp4, at least one")
const fps = Number(flag("fps") ?? 30)
const width = Number(flag("width") ?? 1200)
const base = process.env.BASE_URL ?? "http://localhost:3100"

const q = new URLSearchParams({
  src: `/macos/${scene}.json`,
  width: String(width),
})
for (const k of ["device", "accent"]) {
  const v = flag(k)
  if (v) q.set(k, v)
}

const frames = mkdtempSync(join(tmpdir(), "macos-capture-"))
const browser = await chromium.launch()
try {
  // Twice the pixels: the mp4 keeps them, the GIF is scaled down from them.
  const page = await browser.newPage({
    viewport: { width: width + 200, height: 1400 },
    deviceScaleFactor: 2,
  })
  const url = `${base}/lab/macos-capture?${q}`
  const res = await page.goto(url).catch((e) => {
    throw new Error(`${base} is not answering (mise dev?): ${e.message}`)
  })
  if (!res?.ok()) throw new Error(`${url}: HTTP ${res?.status()}`)
  await page.waitForFunction(() => window.macosCapture !== undefined)
  const total = await page.evaluate(() => window.macosCapture?.total ?? 0)
  const stage = page.locator("#capture")
  const count = Math.ceil((total / 1000) * fps)
  // The screen measures its box on mount; a first seek lets it settle.
  await page.evaluate(() => window.macosCapture?.seek(0))
  for (let i = 0; i <= count; i++) {
    const ms = Math.min(total, (i * 1000) / fps)
    await page.evaluate((t) => window.macosCapture?.seek(t), ms)
    await stage.screenshot({
      path: join(frames, `f${String(i).padStart(5, "0")}.png`),
    })
    if (i % fps === 0) process.stderr.write(`\r${scene}: ${i}/${count} frames`)
  }
  process.stderr.write("\n")
} finally {
  await browser.close()
}

const run = (cmd: string, argv: string[]) => {
  const r = spawnSync(cmd, argv, { stdio: "pipe" })
  if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`)
}
const input = ["-y", "-framerate", String(fps), "-i", join(frames, "f%05d.png")]
for (const out of outs) {
  if (out.endsWith(".webp")) {
    // A README film: animated WebP, full colour, a fifth of a GIF's bytes, and it
    // plays inline wherever an <img> does (GitHub included). 15 fps at 1200 wide
    // (sharp on a retina README column); ffmpeg scales, img2webp (brew `webp`)
    // encodes, since ffmpeg builds rarely carry libwebp.
    const small = mkdtempSync(join(tmpdir(), "macos-webp-"))
    run("ffmpeg", [
      ...input,
      "-vf",
      "fps=15,scale=1200:-1:flags=lanczos",
      join(small, "f%05d.png"),
    ])
    const pngs = readdirSync(small)
      .sort()
      .map((f) => join(small, f))
    run("img2webp", [
      "-loop",
      "0",
      "-lossy",
      "-q",
      "72",
      "-m",
      "4",
      "-d",
      "67",
      ...pngs,
      "-o",
      out,
    ])
    rmSync(small, { recursive: true })
  } else if (out.endsWith(".mp4")) {
    run("ffmpeg", [
      ...input,
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      out,
    ])
  } else {
    throw new Error(`${out}: .webp or .mp4`)
  }
  console.log(`✓ ${out}`)
}
rmSync(frames, { recursive: true })
