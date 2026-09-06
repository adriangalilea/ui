// EVERYTHING THE QUOTE CARD NEEDS FROM A PORTRAIT'S PIXELS, computed once, on the Mac,
// and written down beside the file. The card takes a tone and a focus as arguments
// because it has no runtime; a consumer's build should not have one either. Decoding a
// PNG for its average colour and asking a vision model where the face is are ASSET
// PREPARATION, like the crop — they happen when the portrait is made, with the tools this
// machine has, and what ships is a JSON file two numbers long.
//
//   avatar.png  →  avatar.json  { "focus": 0.51, "average": [r, g, b] }
//
// THE SIDECAR HOLDS FACTS, NOT DECISIONS. The average colour is a fact about the pixels
// and it is what needs the tools; the tone the card draws in is `toneFrom(average)`, a
// rule, pure arithmetic a consumer runs at build with no pixel in sight. Storing the tone
// instead would have left every sidecar stale the first time the rule moved — and the
// rule moves whenever a card is judged.
//
// A consumer reads the sidecar. It never runs sips, sharp or Vision.

import { spawn } from "node:child_process"
import { readFile, stat, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { inflateSync } from "node:zlib"
import { assert, FOCUS } from "../registry/base-nova/lib/quote-card"

const HERE = dirname(fileURLToPath(import.meta.url))

export interface Sidecar {
  /** Where the subject sits across the picture, 0 to 1. */
  focus: number
  /** The picture's average colour, 0 to 255 each. `toneFrom(...average)` is the tone. */
  average: [number, number, number]
  /** Natural pixels, width then height — what a lightbox needs to fly it home. */
  size: [number, number]
}

/** The sidecar's path for a portrait: the same name, `.json`. */
export const sidecarOf = (png: string) => png.replace(/\.[^.]+$/, ".json")

const run = (cmd: string, args: string[]): Promise<number> =>
  new Promise((ok) => {
    spawn(cmd, args, { stdio: "ignore" }).on("close", (code) => ok(code ?? 1))
  })

const capture = (cmd: string, args: string[]): Promise<[number, string]> =>
  new Promise((ok) => {
    const p = spawn(cmd, args)
    let out = ""
    p.stdout.on("data", (d) => {
      out += d
    })
    p.stderr.on("data", (d) => process.stderr.write(d))
    p.on("close", (code) => ok([code ?? 1, out]))
  })

/** THE AVERAGE COLOUR, without a decoder. `sips` resamples the whole image down to ONE
 *  pixel, which is the average by definition, and a 1x1 PNG is small enough to read by
 *  hand: inflate the one IDAT and the pixel is the bytes after the filter byte. Every PNG
 *  filter reduces to the identity on a single pixel with nothing above it and nothing to
 *  its left, so the filter is ignored rather than implemented. */
export async function averageColor(
  path: string,
): Promise<[number, number, number]> {
  const out = join(
    tmpdir(),
    `quote-avg-${Math.random().toString(36).slice(2)}.png`,
  )
  // `-z 1 1`, not `-Z 1`: the latter fits the LONGER side to one pixel and rounds the
  // other to zero on anything that is not square, and sips rejects a 1x0 image.
  assert(
    (await run("sips", ["-z", "1", "1", path, "--out", out])) === 0,
    `sips could not read ${path}`,
  )
  const png = await readFile(out)
  await unlink(out).catch(() => {})
  let at = 8
  const idat: Buffer[] = []
  let colorType = -1
  let depth = -1
  while (at < png.length) {
    const len = png.readUInt32BE(at)
    const type = png.toString("ascii", at + 4, at + 8)
    const body = png.subarray(at + 8, at + 8 + len)
    if (type === "IHDR") {
      depth = body[8] as number
      colorType = body[9] as number
    }
    if (type === "IDAT") idat.push(body)
    at += len + 12
  }
  assert(
    depth === 8 && [0, 2, 4, 6].includes(colorType),
    `sips wrote a ${depth}-bit type-${colorType} PNG, which this reader does not decode`,
  )
  const raw = inflateSync(Buffer.concat(idat))
  return colorType === 0 || colorType === 4
    ? [raw[1] as number, raw[1] as number, raw[1] as number]
    : [raw[1] as number, raw[2] as number, raw[3] as number]
}

/** WHERE THE SUBJECT IS, across each picture, 0 at its left edge and 1 at its right. One
 *  Vision call for all of them: about seven milliseconds an image once the model is warm
 *  against a second to launch, so a corpus is one spawn, not forty. A face when there is
 *  one, what the attention model calls the subject when there is not, the middle when
 *  there is neither — the same ladder the crop uses. A path Vision cannot read is skipped
 *  by the Swift side and simply absent here. */
export async function focusOf(
  paths: readonly string[],
): Promise<Map<string, number>> {
  if (paths.length === 0) return new Map()
  const [code, json] = await capture("swift", [
    join(HERE, "portrait.swift"),
    ...paths,
  ])
  assert(code === 0, "portrait.swift failed")
  const found = JSON.parse(json) as {
    path: string
    face?: { x: number; w: number }
    salient?: { x: number; w: number }
  }[]
  return new Map(
    found.map((f) => {
      const box = f.face ?? f.salient
      return [f.path, box ? box.x + box.w / 2 : FOCUS]
    }),
  )
}

/** Read a portrait's sidecar, or null when it has none yet. */
export async function readSidecar(png: string): Promise<Sidecar | null> {
  try {
    return JSON.parse(await readFile(sidecarOf(png), "utf8")) as Sidecar
  } catch {
    return null
  }
}

/** WRITE THE SIDECARS for every portrait that lacks one. Idempotent: a sidecar already
 *  there is left alone, because a number somebody set by hand outranks the detector's
 *  guess, and re-running this must never undo that. Returns what it wrote. */
export async function annotate(pngs: readonly string[]): Promise<string[]> {
  const missing: string[] = []
  for (const png of pngs) {
    try {
      await stat(sidecarOf(png))
    } catch {
      missing.push(png)
    }
  }
  const focus = await focusOf(missing)
  const written: string[] = []
  for (const png of missing) {
    // Natural size straight off the PNG header: width and height are the first two
    // fields of IHDR, at bytes 16 and 20, and IHDR is always the first chunk.
    const head = await readFile(png)
    assert(
      head.toString("ascii", 1, 4) === "PNG",
      `${png} is not a PNG, and a sidecar describes a PNG`,
    )
    const sidecar: Sidecar = {
      focus: Math.round((focus.get(png) ?? FOCUS) * 1000) / 1000,
      average: await averageColor(png),
      size: [head.readUInt32BE(16), head.readUInt32BE(20)],
    }
    await writeFile(sidecarOf(png), `${JSON.stringify(sidecar, null, 2)}\n`)
    written.push(sidecarOf(png))
  }
  return written
}
