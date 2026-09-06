// A quote's RULES, framework-free: the accent it keeps, the size its text is set at,
// where the lines break, and the SVG still. ONE source feeding two emitters, the web
// card (ui/quote.tsx) and the social preview a build script rasterizes — the same
// arrangement the terminal and its session still use, and for the same reason.
//
// The reason is worth stating, because a site that draws these twice always ends up
// with two: a card and its preview drift the first time either is touched, and the
// drift is invisible until someone shares a link. Here the size ladder, the hue and
// the wrap are decided once and both emitters read them, so the preview IS the card.
//
// Nothing here may import React or touch the DOM. `bun scripts/examples/quote-card.ts`.

export interface QuoteAuthor {
  name: string
  /** A URL on the web; a data URI in the still, which cannot fetch. */
  avatar?: string | null
  href?: string | null
}

export interface Quote {
  text: string
  author?: QuoteAuthor | null
  source?: string | null
  /** Already formatted for display: this module does not own a locale. */
  date?: string | null
  /** Any stable string — a slug, a path. The accent is derived from it, so a quote
   *  keeps its colour across renders without anybody choosing one. */
  seed?: string
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`quote: ${msg}`)
}

/** A stable hue from a string. Not for identity or security: it exists so a quote
 *  looks like itself every time, and so a wall of them is varied without a palette
 *  to maintain. */
export function quoteHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++)
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  return Math.abs(h % 360)
}
export const QUOTE_SAT = 70
export const QUOTE_LIGHT = 65
export function quoteAccent(seed: string): string {
  return `hsl(${quoteHue(seed)}, ${QUOTE_SAT}%, ${QUOTE_LIGHT}%)`
}

/** How big the words are set, by how many there are. A short line earns display size;
 *  a long one has to fit, and the step down is what stops a 240-character quote
 *  overflowing its frame or being clipped without a word.
 *
 *  Read as a share of the frame's width, not in px, so the web card and a still of any
 *  size step at the same PLACE in the text rather than at the same pixel. */
export const QUOTE_STEPS: readonly { under: number; em: number }[] = [
  { under: 60, em: 0.0433 },
  { under: 100, em: 0.0383 },
  { under: 140, em: 0.0333 },
  { under: 180, em: 0.03 },
  { under: Number.POSITIVE_INFINITY, em: 0.0283 },
]

/** The type size for `length` characters across a frame `width` wide. */
export function quoteFontSize(length: number, width: number): number {
  assert(width > 0, `a frame ${width} wide`)
  const step = QUOTE_STEPS.find((s) => length < s.under)
  assert(step, "the size ladder has no last rung")
  return Math.round(step.em * width)
}

/** Roughly how many characters fit on a line at this size. Geist and the mono faces
 *  both average near this ratio of the em; the still measures nothing, so a constant
 *  is the honest tool and the wrap is allowed to be approximate. */
export const QUOTE_CH = 0.52

/** How much of the frame the face takes, and how far the veil reaches BEYOND it. The
 *  feather is what stops the picture having a visible left edge. */
export const FACE_SHARE = 0.5
export const FACE_FEATHER = 0.12

/** The opening mark, as a share of the frame. It is a watermark, drawn behind the
 *  words: big enough to read as one, small enough that the glyph's own ascender is
 *  not cut off by the top edge, which reads as a mistake rather than as a crop. */
export const MARK_EM = 0.22
export const MARK_Y = 0.4

export function quoteWrap(
  text: string,
  fontSize: number,
  width: number,
): string[] {
  assert(fontSize > 0, `a font size of ${fontSize}`)
  const per = Math.max(8, Math.floor(width / (fontSize * QUOTE_CH)))
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (next.length <= per) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines
}

/** The longest a preview carries. Past this the reader is being asked to read a page
 *  in a thumbnail, so it ends on an ellipsis and the link does the rest. */
export const QUOTE_MAX = 240
export function quoteTrim(text: string, max = QUOTE_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export interface QuoteStillOptions {
  width?: number
  height?: number
  /** The card's own surface and ink. Defaults are the studio's dark. */
  background?: string
  foreground?: string
  muted?: string
  /** Overrides the seeded accent. */
  accent?: string
  /** A DATA URI. A still cannot fetch, so a URL renders as nothing. */
  avatar?: string | null
  fontFamily?: string
}

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

/** The quote as a social preview: the mark, the words, the attribution, and the
 *  author's face bled into the right edge under a gradient. 1200x630 is the size every
 *  platform crops from, so it is the default and not a parameter anyone should have to
 *  learn.
 *
 *  Throws when the words overflow the frame. A preview that clips mid-sentence is
 *  worse than one that fails a build: the build can be fixed, the tweet cannot. */
export function renderQuoteSvg(
  quote: Quote,
  {
    width = 1200,
    height = 630,
    background = "#0a0a0a",
    foreground = "#fafafa",
    muted = "#8f8f8f",
    accent,
    avatar,
    fontFamily = "Geist, ui-sans-serif, system-ui, sans-serif",
  }: QuoteStillOptions = {},
): string {
  const text = quoteTrim(quote.text)
  assert(text.length > 0, "a quote with no words")
  const ink = accent ?? quoteAccent(quote.seed ?? quote.author?.name ?? text)
  const pad = Math.round(width / 20)
  const faceX = width - Math.round(width * FACE_SHARE)
  const veilX = faceX - Math.round(width * FACE_FEATHER)
  const size = quoteFontSize(text.length, width)
  const step = Math.round(size * 1.35)
  // The words run to where the veil is still SOLID, which is the picture's own left
  // edge: past that the backdrop starts giving way and a line ending there would sit
  // on the photograph. Not to where the veil begins, which is a column so narrow the
  // ladder cannot save it.
  const textW = avatar ? faceX - pad : width - 2 * pad
  const lines = quoteWrap(text, size, textW)
  const foot = quote.author || quote.date ? Math.round(size * 2.6) : 0
  const block = lines.length * step
  const top = Math.round((height - block - foot) / 2) + size
  if (top < pad + size)
    throw new Error(
      `quote overflows its frame (${lines.length} lines at ${size}px in ${height}px): shorten it or widen the frame`,
    )

  const rows = lines
    .map(
      (l, i) =>
        `<text x="${pad}" y="${top + i * step}" fill="${foreground}">${esc(l)}</text>`,
    )
    .join("\n    ")
  const by = top + block + Math.round(size * 1.4)
  const attribution = quote.author
    ? `<text x="${pad}" y="${by}" font-size="${Math.round(size * 0.62)}" fill="${ink}">${esc(quote.author.name)}</text>`
    : ""
  const when = quote.date
    ? `<text x="${pad}" y="${by + Math.round(size * 0.9)}" font-size="${Math.round(size * 0.5)}" fill="${muted}">${esc(quote.date)}</text>`
    : ""
  // The veil starts BEFORE the picture and is still fully opaque where the picture
  // begins, so its left edge is feathered away. A veil that has already started fading
  // there leaves a hard vertical cut down the middle of the frame, which is the one
  // thing that makes a preview look assembled rather than composed.
  const face = avatar
    ? `<image href="${esc(avatar)}" x="${faceX}" y="0" width="${Math.round(width * FACE_SHARE)}" height="${height}" preserveAspectRatio="xMidYMin slice" opacity="0.55"/>
  <rect x="${veilX}" y="0" width="${width - veilX}" height="${height}" fill="url(#veil)"/>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="veil" x1="0" x2="1">
      <stop offset="0" stop-color="${background}"/>
      <stop offset="${FACE_FEATHER / (FACE_SHARE + FACE_FEATHER)}" stop-color="${background}"/>
      <stop offset="0.62" stop-color="${background}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${background}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${face}
  <text x="${pad - Math.round(size * 0.5)}" y="${Math.round(height * MARK_Y)}" font-size="${Math.round(width * MARK_EM)}" fill="${ink}" opacity="0.2" font-family="${esc(fontFamily)}">&#8220;</text>
  <g font-family="${esc(fontFamily)}" font-size="${size}" xml:space="preserve">
    ${rows}
    ${attribution}
    ${when}
  </g>
</svg>
`
}
