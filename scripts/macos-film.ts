// Films a macos timeline: an animated WebP for a README (an <img>, so GitHub plays it
// inline) and an mp4 for a site or a post.
//
//   bun scripts/macos-film.ts path/to/scene.json --out scene.webp --out scene.mp4
//     [--art path/to/art.json] [--device macbook|display] [--accent "#hex"]
//     [--width 1200] [--fps 30]
//
// The art defaults to art.json beside the timeline. Nothing needs to be running: the
// tool bundles its own page (scripts/macos-film/page.tsx, the registry's own
// component) with Bun and Tailwind and serves it for the length of the film.
//
// Why it is faster than real time: the stage is a pure function of scene time, so a
// frame can be drawn alone, in any order, by any page. The frames are split across a
// few headless pages; each page draws its frames (cheap) and takes a picture only of
// a frame whose markup differs from the one before it (a story is mostly holds while
// the viewer reads). The distinct frames go to the encoders with their durations:
// WebP stores a delay per frame, the mp4 is timed by a concat list.
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { availableParallelism, tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import tailwind from "@tailwindcss/postcss"
import { chromium } from "playwright"
import postcss from "postcss"
import sharp from "sharp"
import type { FilmOptions } from "./macos-film/page"

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i < 0 ? undefined : args[i + 1]
}
const scene = args[0]
const outs = args.flatMap((a, i) =>
  a === "--out" ? [resolve(args[i + 1] as string)] : [],
)
if (!scene || scene.startsWith("--") || outs.length === 0) {
  console.error(
    "usage: bun scripts/macos-film.ts <scene.json> --out file.webp|file.mp4 [--art art.json] [--device macbook|display] [--accent #hex] [--width 1200] [--fps 30]",
  )
  process.exit(2)
}
for (const out of outs)
  if (!out.endsWith(".webp") && !out.endsWith(".mp4"))
    throw new Error(`${out}: .webp or .mp4`)
const fps = Number(flag("fps") ?? 30)
const width = Number(flag("width") ?? 1200)
/** Twice the pixels: the mp4 keeps them, the WebP is scaled down from them. */
const DPR = 2
/** A README's column is ~840 css px; 1200 is sharp there on a retina screen. */
const WEBP_WIDTH = 1200
const options: FilmOptions = {
  timeline: JSON.parse(readFileSync(resolve(scene), "utf8")),
  art: JSON.parse(
    readFileSync(
      flag("art") ?? join(dirname(resolve(scene)), "art.json"),
      "utf8",
    ),
  ),
  device: flag("device") as FilmOptions["device"],
  accent: flag("accent"),
  width,
}
const started = performance.now()
const say = (m: string) =>
  console.error(`${((performance.now() - started) / 1000).toFixed(1)}s ${m}`)

// ── the page: the registry's component, bundled, with the site's stylesheet ──

const repo = resolve(import.meta.dir, "..")
const build = await Bun.build({
  entrypoints: [join(import.meta.dir, "macos-film/page.tsx")],
  target: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
})
if (!build.success) throw new AggregateError(build.logs, "bundle failed")
// Components import their own stylesheets (device-frame.css); Bun emits those as
// outputs of their own, and the page needs every one.
const js = await (
  build.outputs.find((o) => o.kind === "entry-point") as Blob
).text()
const componentCss = (
  await Promise.all(
    build.outputs.filter((o) => o.path.endsWith(".css")).map((o) => o.text()),
  )
).join("\n")
const globals = join(repo, "app/globals.css")
const css = (
  await postcss([tailwind({ base: repo })]).process(
    readFileSync(globals, "utf8"),
    {
      from: globals,
    },
  )
).css
const html = `<!doctype html><html class="dark"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono&display=block">
<style>${css}
${componentCss}
:root{--font-sans:"Geist",system-ui,sans-serif;--font-mono:"Geist Mono",Menlo,monospace}
body{margin:0;background:#0b0b0d;font-family:var(--font-sans)}</style>
</head><body><div id="film"></div><script type="module" src="/page.js"></script></body></html>`
const server = Bun.serve({
  port: 0,
  fetch: (req) =>
    new URL(req.url).pathname === "/page.js"
      ? new Response(js, { headers: { "content-type": "text/javascript" } })
      : new Response(html, { headers: { "content-type": "text/html" } }),
})
say("page built")

// ── the farm: draw every frame, photograph only the new ones ──

type Shot = { hash: number; jpeg?: Buffer }
const browser = await chromium.launch()
const workers = Math.max(2, Math.min(8, Math.floor(availableParallelism() / 2)))
let shots: Shot[] = []
let total = 0
try {
  const pages = await Promise.all(
    Array.from({ length: workers }, async () => {
      const page = await browser.newPage({
        viewport: { width: width + 200, height: Math.round(width * 0.9) + 300 },
        deviceScaleFactor: DPR,
      })
      await page.goto(`http://localhost:${server.port}/`)
      await page.waitForFunction(() => window.film !== undefined)
      const info = await page.evaluate((o) => window.film.load(o), options)
      const cdp = await page.context().newCDPSession(page)
      return { page, cdp, info }
    }),
  )
  const first = (pages[0] as (typeof pages)[number]).info
  total = first.total
  const count = Math.floor((total / 1000) * fps) + 1
  say(`${workers} pages, ${count} frames`)
  shots = new Array(count)
  const per = Math.ceil(count / workers)
  await Promise.all(
    pages.map(async ({ page, cdp, info }, w) => {
      let last: number | undefined
      for (let i = w * per; i < Math.min(count, (w + 1) * per); i++) {
        const hash = await page.evaluate(
          (ms) => window.film.seek(ms),
          Math.min(total, (i * 1000) / fps),
        )
        if (hash === last) {
          shots[i] = { hash }
          continue
        }
        const { data } = await cdp.send("Page.captureScreenshot", {
          format: "jpeg",
          quality: 94,
          clip: { ...info.box, scale: 1 },
          optimizeForSpeed: true,
        })
        shots[i] = { hash, jpeg: Buffer.from(data, "base64") }
        last = hash
      }
    }),
  )
} finally {
  await browser.close()
  server.stop()
}

// Distinct frames in order, each with how long it holds. A page boundary can repeat
// the frame before it; the hash folds that into one.
const film: { jpeg: Buffer; ms: number }[] = []
let held: number | undefined
for (const s of shots) {
  if (s.hash === held) (film.at(-1) as { ms: number }).ms += 1000 / fps
  else {
    film.push({ jpeg: s.jpeg as Buffer, ms: 1000 / fps })
    held = s.hash
  }
}
say(
  `${film.length} distinct of ${shots.length} frames (${(total / 1000).toFixed(1)}s of story)`,
)

// ── the encoders ──

const dir = mkdtempSync(join(tmpdir(), "macos-film-"))
const run = (cmd: string, argv: string[]) => {
  const r = spawnSync(cmd, argv, { stdio: "pipe" })
  if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`)
}
for (const [i, f] of film.entries())
  writeFileSync(join(dir, `f${String(i).padStart(5, "0")}.jpg`), f.jpeg)
for (const out of outs) {
  if (out.endsWith(".webp")) {
    // img2webp (brew `webp`) streams frame by frame with a delay each; the frames
    // are scaled to the README width first.
    await Promise.all(
      film.map((_, i) => {
        const n = `f${String(i).padStart(5, "0")}`
        return sharp(join(dir, `${n}.jpg`))
          .resize({ width: WEBP_WIDTH })
          .png({ compressionLevel: 1 })
          .toFile(join(dir, `${n}.png`))
      }),
    )
    run("img2webp", [
      "-loop",
      "0",
      "-lossy",
      "-q",
      "72",
      "-m",
      "4",
      ...film.flatMap((f, i) => [
        "-d",
        String(Math.round(f.ms)),
        join(dir, `f${String(i).padStart(5, "0")}.png`),
      ]),
      "-o",
      out,
    ])
  } else {
    // The concat list times each distinct frame; the output is constant-rate
    // (repeats are nearly free to encode).
    const list = join(dir, "frames.txt")
    writeFileSync(
      list,
      `${film
        .map(
          (f, i) =>
            `file 'f${String(i).padStart(5, "0")}.jpg'\nduration ${(f.ms / 1000).toFixed(4)}`,
        )
        .join(
          "\n",
        )}\nfile 'f${String(film.length - 1).padStart(5, "0")}.jpg'\n`,
    )
    run("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      list,
      "-vf",
      "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-fps_mode",
      "cfr",
      "-r",
      String(fps),
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
  }
  say(`✓ ${out}`)
}
rmSync(dir, { recursive: true })
