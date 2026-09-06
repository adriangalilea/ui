// Turn any picture into the square portrait the quote card wants, cropped on the PERSON
// rather than on the middle of the frame.
//
//   mise portrait <source|wikipedia:Article_Title> <out.png> [size]
//   mise portraits <dir>            fill every author folder under <dir> that has none
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
import { readFile, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { assert, IMAGE_MAGIC } from "../registry/base-nova/lib/quote-card"
import { annotate } from "./pixels"

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

/** One picture in, one square portrait out. */
const portrait = async (
  src: string,
  out: string,
  size: number,
): Promise<string> => {
  const source = src.startsWith("wikipedia:")
    ? await fromWikipedia(src.slice("wikipedia:".length))
    : src
  const [code, json] = await run("swift", [
    join(HERE, "portrait.swift"),
    source,
  ])
  assert(code === 0, `portrait.swift failed on ${source}`)
  const found = (JSON.parse(json) as Found[])[0]
  assert(found !== undefined, `no answer for ${source}`)

  const box = portraitBox(found)
  // Cropped through an SVG viewBox rather than through `sips -c`, whose offset is
  // documented as one thing and behaves as another depending on the release. A viewBox
  // is four numbers with one meaning, and librsvg is already required here.
  const bytes = await readFile(source)
  // The mime comes from the BYTES, never from the name: a Wikipedia download lands in a
  // tmp file with no extension at all, and librsvg draws NOTHING — silently, exit 0 —
  // for a data URI whose declared type disagrees with its payload. Guessing jpeg wrote
  // fully transparent avatars for every PNG original, and the never-overwrite rule then
  // protected the blanks forever.
  const b64 = bytes.toString("base64")
  const mime = Object.entries(IMAGE_MAGIC).find(([, magic]) =>
    b64.startsWith(magic),
  )?.[0]
  assert(
    mime !== undefined,
    `${source} is not a raster image this can crop (starts "${b64.slice(0, 12)}") — an svg or an html error page both land here`,
  )
  const svg = join(tmpdir(), `portrait-${Date.now()}.svg`)
  await writeFile(
    svg,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${box.x} ${box.y} ${box.side} ${box.side}">
  <image href="data:${mime};base64,${b64}" x="0" y="0" width="${found.width}" height="${found.height}" preserveAspectRatio="none"/>
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
  // A corpus run otherwise leaves one download and one crop svg in tmpdir per author.
  await unlink(svg).catch(() => {})
  if (source !== src) await unlink(source).catch(() => {})
  // THE SIDECAR IS PART OF THE PORTRAIT. Tone and focus are computed here, once, from the
  // finished crop, and written beside it; the card's consumer reads two numbers and
  // never touches a pixel. A portrait without its sidecar is an asset half-prepared.
  await annotate([out])
  return `${found.width}x${found.height} at ${box.x},${box.y} +${box.side} (${box.why})`
}

/** A slug is already the article title nine times in ten. Deriving it beats keeping a
 *  map of forty-odd names that has to be edited before anyone can add an author, and the
 *  tenth case is what `portraits.json` is for. */
const titleOf = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("_")

/** FILL A CORPUS: every folder under `dir` that has no `avatar.png` gets one.
 *
 *  The slug-to-article exceptions live in `<dir>/portraits.json`, WITH the content,
 *  because that is content: which article is the right Felipe II is a fact about this
 *  collection, not about cropping. `null` means no encyclopaedia has a usable picture
 *  and a person has to choose one — anonymous authors, living people with no free
 *  photograph, anyone whose portrait is better generated than borrowed.
 *
 *  It NEVER overwrites. A portrait someone chose by hand outranks anything fetched, and
 *  a fetcher that reaches in and replaces it is a fetcher nobody can leave running. */
const fill = async (dir: string, size: number) => {
  const { readdir, stat } = await import("node:fs/promises")
  let map: Record<string, string | null> = {}
  try {
    map = JSON.parse(await readFile(join(dir, "portraits.json"), "utf8"))
  } catch {}
  const ok: string[] = []
  const have: string[] = []
  const asks: string[] = []
  const broke: [string, string][] = []
  for (const slug of (await readdir(dir)).sort()) {
    if (!(await stat(join(dir, slug))).isDirectory()) continue
    const out = join(dir, slug, "avatar.png")
    try {
      await stat(out)
      have.push(out)
      continue
    } catch {}
    const title = slug in map ? map[slug] : titleOf(slug)
    if (title === null || title === "") {
      asks.push(slug)
      continue
    }
    try {
      console.log(
        `  ${slug}  ${await portrait(`wikipedia:${title}`, out, size)}`,
      )
      ok.push(slug)
    } catch (e) {
      broke.push([slug, e instanceof Error ? e.message : String(e)])
    }
  }
  // Portraits that were already there get their sidecar too, if they lack one: the
  // corpus was cropped before tone and focus were written down, and a consumer reading
  // sidecars must find one beside every picture.
  const annotated = await annotate(have)
  console.log(
    `\nfetched ${ok.length}, annotated ${annotated.length}, ${asks.length} need a person, ${broke.length} failed`,
  )
  for (const [slug, why] of broke) console.log(`  FAILED  ${slug}: ${why}`)
  // NEVER pick for these. A generic engraving of the wrong century is worse than a card
  // with no picture on it, and the card is designed to read without one.
  if (asks.length)
    console.log(
      `\nthese need a picture chosen by a person, then \`mise portrait <file> ${dir}/<slug>/avatar.png\`:\n  ${asks.join("\n  ")}`,
    )
}

const [, , a, b, c] = process.argv
if (a === "--fill") {
  assert(b !== undefined, "usage: mise portraits <dir>")
  await fill(b, Number(c ?? SIZE))
} else {
  assert(
    a !== undefined && b !== undefined,
    "usage: mise portrait <source|wikipedia:Article_Title> <out.png> [size]",
  )
  const size = Number(c ?? SIZE)
  console.log(`${b}  ${size}x${size}  from ${await portrait(a, b, size)}`)
}
