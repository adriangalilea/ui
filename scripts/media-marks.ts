// references/media-marks -> registry/base-nova/ui/media-spec-marks.tsx
//
// The marks `media-spec` chips wear, inlined as one generated TSX file so the item
// installs as files and never fetches artwork. The SOURCE is the folder: reviewed
// single-ink SVGs plus manifest.json naming each mark's symbol (poster rung), lockup
// (rail rung) and official hex. This script cleans each SVG down to its drawing
// (no editor metadata, no dead gradient defs, no stray ids), boxes it by viewBox,
// and emits `MARKS` plus the `Mark` component.
//
//   mise marks           regenerate
//   mise marks --check   fail when the committed file is stale (runs in `mise check`)

import { execFileSync } from "node:child_process"
import { readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const src = join(root, "references/media-marks")
const out = join(root, "registry/base-nova/ui/media-spec-marks.tsx")

type ManifestMark = {
  symbol: string | null
  lockup: string | null
  brand: string | null
  title: string
  source: string
  intrinsic_colours?: boolean
}
const manifest = JSON.parse(
  readFileSync(join(src, "manifest.json"), "utf8"),
) as {
  marks: Record<string, ManifestMark>
}

// ---- the cleaner ----

/** Drop an element and everything inside it, self-closing or paired, namespaced or not. */
function dropElements(svg: string, names: string[]): string {
  let s = svg
  for (const n of names) {
    s = s.replace(new RegExp(`<${n}\\b[^>]*/>`, "g"), "")
    s = s.replace(new RegExp(`<${n}\\b[^>]*>[\\s\\S]*?</${n}>`, "g"), "")
  }
  return s
}

/** Which ids the drawing actually points at (url(#x), href="#x"). */
function referencedIds(svg: string): Set<string> {
  const ids = new Set<string>()
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) ids.add(m[1] as string)
  for (const m of svg.matchAll(/href="#([^"]+)"/g)) ids.add(m[1] as string)
  return ids
}

/** A style="" attribute reduced to what the drawing still needs: colour is the root's
 *  business (currentColor inherits), so fill/stroke pairs go unless they say `none`. */
function cleanStyle(style: string): string {
  const kept: string[] = []
  for (const pair of style.split(";")) {
    const [k, v] = pair.split(":").map((x) => x?.trim())
    if (!k || !v) continue
    if ((k === "fill" || k === "stroke") && v !== "none") continue
    if (k === "enable-background") continue
    kept.push(`${k}:${v}`)
  }
  return kept.join(";")
}

function cleanTag(tag: string, markId: string, ids: Set<string>): string {
  const m = tag.match(/^<([\w:]+)([\s\S]*?)(\/?)>$/)
  if (!m) return tag
  const [, name, rawAttrs, close] = m as unknown as [
    string,
    string,
    string,
    string,
  ]
  const attrs: string[] = []
  for (const a of rawAttrs.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    let key = a[1] as string
    let val = a[2] as string
    if (/^(inkscape|sodipodi|xml|xmlns|rdf|cc|dc):/.test(key)) continue
    if (key === "xlink:href") key = "href"
    if (key === "class" || key === "overflow" || key === "enable-background")
      continue
    if (key === "id") {
      if (!ids.has(val)) continue
      val = `agm-${markId}-${val}`
    }
    if (key === "href" && val.startsWith("#"))
      val = `#agm-${markId}-${val.slice(1)}`
    if (
      key === "clip-path" ||
      key === "mask" ||
      key === "fill" ||
      key === "stroke"
    ) {
      val = val.replace(/url\(#([^)]+)\)/, `url(#agm-${markId}-$1)`)
    }
    if (
      (key === "fill" || key === "stroke") &&
      val === "currentColor" &&
      key === "fill"
    )
      continue // the root says so; a child repeating it is noise
    if (key === "style") {
      val = cleanStyle(val)
      if (!val) continue
    }
    attrs.push(`${key}="${val}"`)
  }
  return `<${name}${attrs.length ? ` ${attrs.join(" ")}` : ""}${close}>`
}

function clean(markId: string, file: string) {
  let s = readFileSync(join(src, file), "utf8")
  s = s.replace(/<\?xml[^>]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "")
  s = dropElements(s, [
    "defs",
    "style",
    "metadata",
    "title",
    "desc",
    "sodipodi:namedview",
    "linearGradient",
    "radialGradient",
  ])
  const rootTag = s.match(/<svg\b[^>]*>/)
  if (!rootTag) throw new Error(`${file}: no <svg> root`)
  const vb = rootTag[0].match(/viewBox="([^"]+)"/)
  if (!vb) throw new Error(`${file}: no viewBox`)
  const [, , w, h] = (vb[1] as string)
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!w || !h) throw new Error(`${file}: bad viewBox ${vb[1]}`)
  let body = s
    .slice((rootTag.index ?? 0) + rootTag[0].length)
    .replace(/<\/svg>\s*$/, "")
  const ids = referencedIds(body)
  body = body.replace(/<[^>]+>/g, (tag) =>
    tag.startsWith("</") ? tag : cleanTag(tag, markId, ids),
  )
  body = body.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim()
  return { viewBox: (vb[1] as string).trim(), aspect: w / h, body }
}

// ---- the rungs ----
//
// A symbol is a square-ish glyph and sits at the text's own size. A lockup carries a
// word, so it rises above the x-height to give the wordmark a cap height the text can
// stand beside: the wider the lockup, the less it needs. Tuned once, on the demo page.
const SYMBOL_EM = 1
function lockupEm(aspect: number): number {
  if (aspect >= 3.5) return 1.15
  if (aspect >= 2) return 1.45
  return 1.6
}

// ---- emit ----

/** Rec. 709 relative luminance of a hex, resolved at generation time: the fact a
 *  dark-surface consumer needs, stated instead of eyeballed (brandgen's rule). */
function luminance(hex: string): number {
  const v = Number.parseInt(hex, 16)
  const r = ((v >> 16) & 0xff) / 255
  const g = ((v >> 8) & 0xff) / 255
  const b = (v & 0xff) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const marks = Object.entries(manifest.marks)
const entries = marks.map(([id, m]) => {
  const symbol = m.symbol ? clean(id, m.symbol) : null
  const lockup = m.lockup ? clean(id, m.lockup) : null
  const art = (a: NonNullable<typeof symbol>, em: number) =>
    `{ viewBox: ${JSON.stringify(a.viewBox)}, aspect: ${a.aspect.toFixed(4)}, em: ${em}, body: ${JSON.stringify(a.body)} }`
  return `  ${JSON.stringify(id)}: {
    title: ${JSON.stringify(m.title)},
    brand: ${m.brand ? JSON.stringify(`#${m.brand}`) : "null"},
    luminance: ${m.brand ? luminance(m.brand).toFixed(3) : "null"},
    symbol: ${symbol ? art(symbol, SYMBOL_EM) : "null"},
    lockup: ${lockup ? art(lockup, lockupEm(lockup.aspect)) : "null"},
  },`
})

const generated = `// GENERATED by \`mise marks\` from references/media-marks. Do not edit: change the
// artwork or manifest.json there and regenerate; \`mise check\` fails on a stale copy.
//
// The marks \`media-spec\` chips wear. Every body is a single-ink drawing: with no
// fill of its own it takes the <svg>'s, which is the chip's ink (currentColor) or the
// brand's official hex. The Spain flag keeps its own colours whatever the tone. A
// SYMBOL is the poster rung (a glyph at the text's size); a LOCKUP is the rail rung
// (the wordmark, risen to a cap height). Origins and licences: references/media-marks/README.md.

import { cn } from "@/lib/utils"

export type MarkId =
${marks.map(([id]) => `  | ${JSON.stringify(id)}`).join("\n")}
export type MarkForm = "symbol" | "lockup"
export type MarkTone = "ink" | "brand"

export interface MarkArt {
  viewBox: string
  /** width / height of the viewBox: the width an inline mark takes at a given height */
  aspect: number
  /** the height the mark wants, in em of the surrounding text */
  em: number
  body: string
}
export interface MarkEntry {
  title: string
  /** the official hex, or null for a mark that keeps its own colours */
  brand: string | null
  /** relative luminance of \`brand\` (0 black … 1 white), null when there is none */
  luminance: number | null
  symbol: MarkArt | null
  lockup: MarkArt | null
}

export const MARKS: Record<MarkId, MarkEntry> = {
${entries.join("\n")}
}

export interface MarkProps {
  id: MarkId
  /** the rung; a form the mark lacks falls back to the one it has */
  form?: MarkForm
  tone?: MarkTone
  /** override the mark's own height, in em */
  em?: number
  className?: string
  style?: React.CSSProperties
}

/** A brand whose official colour is near-black (Dolby, HDR10, DVD) has no colour to
 *  show: painted \`#000\` on a dark chip it is not a brand statement but a missing logo,
 *  so under \`brand\` tone it stays in the ink like the text. */
const BRAND_FLOOR = 0.15

/** The fill a mark takes for a tone: the official hex where it is a real colour, the
 *  surrounding ink otherwise. Original-colour marks (the flag) paint themselves. */
export function markFill(entry: MarkEntry, tone: MarkTone): string {
  if (tone !== "brand" || !entry.brand || entry.luminance === null)
    return "currentColor"
  return entry.luminance >= BRAND_FLOOR ? entry.brand : "currentColor"
}

/** One mark, inline, sized in em so it follows the text it sits beside. Decorative:
 *  the chip that wears it carries the accessible name. */
export function Mark({
  id,
  form = "lockup",
  tone = "ink",
  em,
  className,
  style,
}: MarkProps) {
  const entry = MARKS[id]
  const art = entry[form] ?? entry.lockup ?? entry.symbol
  if (!art) return null
  const height = em ?? art.em
  return (
    <svg
      viewBox={art.viewBox}
      aria-hidden="true"
      data-slot="media-mark"
      data-mark={id}
      data-form={entry[form] ? form : art === entry.lockup ? "lockup" : "symbol"}
      fill={markFill(entry, tone)}
      className={cn("inline-block shrink-0 align-middle", className)}
      style={{ height: \`\${height}em\`, width: \`\${height * art.aspect}em\`, ...style }}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static markup generated from this repo's own reviewed artwork, never from a user or the network
      dangerouslySetInnerHTML={{ __html: art.body }}
    />
  )
}
`

// The committed file is biome-formatted like every other source, so the emitter's
// output goes through the formatter before it is written or compared: `--check` must
// answer "would regenerating change the file", not "does the emitter's whitespace
// match".
function formatted(text: string): string {
  const tmp = join(root, "registry/base-nova/ui/.media-spec-marks.tmp.tsx")
  writeFileSync(tmp, text)
  try {
    execFileSync("pnpm", ["biome", "format", "--write", tmp], {
      cwd: root,
      stdio: "ignore",
    })
    return readFileSync(tmp, "utf8")
  } finally {
    unlinkSync(tmp)
  }
}

const next = formatted(generated)
if (process.argv.includes("--check")) {
  let current = ""
  try {
    current = readFileSync(out, "utf8")
  } catch {}
  if (current !== next) {
    console.error(
      "media-marks: registry/base-nova/ui/media-spec-marks.tsx is stale: run `mise marks` and commit",
    )
    process.exit(1)
  }
  console.log(`media-marks: ${marks.length} marks, generated file current`)
} else {
  writeFileSync(out, next)
  console.log(`media-marks: ${marks.length} marks -> ${out}`)
}
