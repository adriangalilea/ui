// Turn any picture into the square portrait the quote card wants, cropped on the PERSON
// rather than on the middle of the frame.
//
//   mise portrait <source|wikipedia:Article_Title> <out.png> [size]
//
// Why this lives beside the component instead of in whatever site consumes it: the card
// derives its ground and its mark from the picture's own colour, and it shows the whole
// height of whatever it is handed. Both of those are only as good as the crop. A badly
// framed source does not look like a badly framed source on the card, it looks like a
// broken card — which is exactly how a decapitated Confucius got shipped and stayed.
//
// THE BUG THIS EXISTS TO KILL is the centre crop. Scaling a tall picture to a square by
// cutting equal amounts off the top and the bottom is the obvious implementation and it
// removes the head every time, because a head is at the TOP of a standing figure. Most
// portraits survive it only because an encyclopaedia's lead image is already a head
// shot; give it a full-length painting and it returns a torso.
//
// macOS only, and that is a property of the tooling, never of the component: the card
// takes whatever pixels it is given.

import { spawn } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { assert } from "../registry/base-nova/lib/quote-card"

const HERE = dirname(fileURLToPath(import.meta.url))
const SIZE = 256

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface Found {
  path: string
  width: number
  height: number
  face?: Box
  salient?: Box
}

const run = (cmd: string, args: string[]): Promise<[number, string]> =>
  new Promise((ok) => {
    const p = spawn(cmd, args)
    let out = ""
    p.stdout.on("data", (d) => {
      out += d
    })
    p.stderr.on("data", (d) => process.stderr.write(d))
    p.on("close", (code) => ok([code ?? 1, out]))
  })

/** Wikipedia's own choice of lead image, which is the picture a reader of that article
 *  sees first and therefore the one most likely to be a portrait. The original, not the
 *  thumbnail: cropping wants every pixel there is. */
const fromWikipedia = async (title: string): Promise<string> => {
  const api = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const res = await fetch(api, {
    headers: { "user-agent": "ui-portrait/1.0 (adriangalilea@gmail.com)" },
  })
  assert(res.ok, `wikipedia answered ${res.status} for "${title}"`)
  const summary = (await res.json()) as {
    originalimage?: { source: string }
    thumbnail?: { source: string }
  }
  const src = summary.originalimage?.source ?? summary.thumbnail?.source
  assert(
    src !== undefined,
    `"${title}" has no lead image on wikipedia — this one needs a picture chosen by a person`,
  )
  const img = await fetch(src, {
    headers: { "user-agent": "ui-portrait/1.0 (adriangalilea@gmail.com)" },
  })
  assert(img.ok, `${src} answered ${img.status}`)
  const out = join(
    tmpdir(),
    `portrait-${Date.now()}-${title.replace(/\W+/g, "-")}`,
  )
  await writeFile(out, Buffer.from(await img.arrayBuffer()))
  return out
}

/** How much frame a head-and-shoulders portrait gives a head. Two and a half face
 *  heights is the crop a passport photo and a Wikipedia lead image both land near, and
 *  it is what the rest of a corpus will look like. */
const FACE_ROOM = 2.6
/** Where the face sits in that square, from the top. Dead centre puts a chin in the
 *  middle of the frame and leaves the air above a head; a little above centre is where
 *  every portrait painter has put it. */
const FACE_AT = 0.38
/** With no face to find — a bust, a line drawing, an engraving — the head is at the top
 *  of whatever the attention model called the subject. This is how much of that subject
 *  to keep, as a share of its height. */
const SALIENT_KEEP = 0.55

/** The square to cut, in top-left pixels. Vision measures from the BOTTOM left, so
 *  every box arrives flipped and is turned the right way up here, once. */
export function portraitBox(found: Found): {
  x: number
  y: number
  side: number
  why: string
} {
  const { width, height, face, salient } = found
  const limit = Math.min(width, height)
  const flip = (b: Box) => ({
    x: b.x * width,
    y: (1 - b.y - b.h) * height,
    w: b.w * width,
    h: b.h * height,
  })
  const clamp = (x: number, y: number, side: number, why: string) => ({
    x: Math.round(Math.max(0, Math.min(width - side, x))),
    y: Math.round(Math.max(0, Math.min(height - side, y))),
    side: Math.round(side),
    why,
  })

  if (face) {
    const f = flip(face)
    const side = Math.min(f.h * FACE_ROOM, limit)
    return clamp(
      f.x + f.w / 2 - side / 2,
      f.y + f.h / 2 - side * FACE_AT,
      side,
      "face",
    )
  }
  if (salient) {
    const s = flip(salient)
    const side = Math.min(Math.max(s.h * SALIENT_KEEP, s.w), limit)
    return clamp(s.x + s.w / 2 - side / 2, s.y, side, "salient")
  }
  // Nothing found at all. The top of the frame is still a better guess than its middle,
  // for the same reason the whole file exists.
  return clamp((width - limit) / 2, 0, limit, "top")
}

const [, , src, out, sizeArg] = process.argv
assert(
  src !== undefined && out !== undefined,
  "usage: mise portrait <source|wikipedia:Article_Title> <out.png> [size]",
)
const size = Number(sizeArg ?? SIZE)

const source = src.startsWith("wikipedia:")
  ? await fromWikipedia(src.slice("wikipedia:".length))
  : src

const [code, json] = await run("swift", [join(HERE, "portrait.swift"), source])
assert(code === 0, `portrait.swift failed on ${source}`)
const found = (JSON.parse(json) as Found[])[0]
assert(found !== undefined, `no answer for ${source}`)

const box = portraitBox(found)
// Cropped through an SVG viewBox rather than through `sips -c`, whose offset is
// documented as one thing and behaves as another depending on the release. A viewBox is
// four numbers with one meaning, and librsvg is already required here.
const bytes = await readFile(source)
const mime = /\.png$/i.test(source) ? "image/png" : "image/jpeg"
const svg = join(tmpdir(), `portrait-${Date.now()}.svg`)
await writeFile(
  svg,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${box.x} ${box.y} ${box.side} ${box.side}">
  <image href="data:${mime};base64,${bytes.toString("base64")}" x="0" y="0" width="${found.width}" height="${found.height}" preserveAspectRatio="none"/>
</svg>
`,
)
assert(
  (
    await run("rsvg-convert", [
      "-w",
      String(size),
      "-h",
      String(size),
      svg,
      "-o",
      out,
    ])
  )[0] === 0,
  "rsvg-convert failed: brew install librsvg",
)
console.log(
  `${out}  ${size}x${size}  from ${found.width}x${found.height} at ${box.x},${box.y} +${box.side} (${box.why})`,
)
