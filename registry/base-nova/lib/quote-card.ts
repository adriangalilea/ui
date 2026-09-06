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

/** The opening mark is DRAWN, not set. A glyph brought three problems at once: its
 *  shape is whatever face happens to be installed where the still is rasterized, and
 *  a still cannot assume a font is there at all; Geist's is cut on hard diagonals, so
 *  at watermark size it reads as jagged rather than as punctuation; and a glyph's left
 *  side bearing is invisible, so aligning it to the text below is guesswork that looks
 *  like a mistake.
 *
 *  Two slanted strokes with round caps: the studio's own mark is stroke-drawn, it has
 *  no corners to be harsh, and its left edge is a number rather than a bearing. */
export const MARK_EM = 1.05
/** The mark's own drawing, in a 100x140 box: a ball at the foot and a tail sweeping up
 *  and to the right, which is the shape an opening quote actually is — a rotated
 *  comma. Two straight strokes read as parallel bars however they are slanted, and a
 *  glyph reads as whatever face the rasterizer happens to find, which for a still is
 *  not a guess worth making.
 *
 *  ONE of them, at roughly the size of the words. Doubled and set at watermark size it
 *  stopped being punctuation and became a pair of sixes: loud, and the first thing the
 *  eye lands on in a frame whose whole job is to carry somebody else's sentence. A
 *  mark should be recognised, not read. */
export const MARK_PATH =
  "M100 0C55 10 15 45 5 85C-5 120 20 140 48 140C75 140 95 120 95 95C95 72 78 58 58 58C62 35 78 14 100 0Z"
export const MARK_BOX = { w: 100, h: 140 }
export const MARK_OPACITY = 0.55

/** Cap height and descender as shares of the em, for Geist and near enough for any
 *  humanist sans. The still has no way to measure text, so a block is composed from
 *  these: without them "centred" means centred on the BASELINES, which sits the words
 *  visibly high — measured on a 630px frame, 49px of air above and 81px below. */
export const CAP = 0.72
export const DESC = 0.22

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

/** THREE VOICES, and the distinction is the point: the words are the quote, the name
 *  is a person, the date is metadata. A serif says "this is a quotation" before a
 *  single word is read; mono says "this is a fact about it". All three stacks fall
 *  back to something every rasterizer has, because a still that needs a font shipped
 *  with it is a still that renders differently on the machine that builds it. */
export const QUOTE_SERIF = 'Georgia, "Times New Roman", Times, serif'
export const QUOTE_SANS = "Geist, ui-sans-serif, system-ui, sans-serif"
export const QUOTE_MONO =
  'ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace'

/** The card's ground is TINTED from the same seed the accent comes from, at a
 *  lightness low enough to read as black at a glance. A quote on pure #000 next to a
 *  photograph looks like two things pasted together; a ground that shares the accent's
 *  hue looks like one image, and it costs a hue rotation rather than decoding the
 *  picture. */
export const GROUND_SAT = 26
export const GROUND_LIGHT = 5
export function quoteGround(seed: string): string {
  return `hsl(${quoteHue(seed)}, ${GROUND_SAT}%, ${GROUND_LIGHT}%)`
}

export interface QuoteStillOptions {
  width?: number
  height?: number
  /** The card's own surface and ink. Defaults are the studio's dark. */
  background?: string
  foreground?: string
  muted?: string
  /** Overrides the seeded accent, and the seeded ground. */
  accent?: string
  /** A DATA URI. A still cannot fetch, so a URL renders as nothing. */
  avatar?: string | null
  /** The three voices. Defaults are QUOTE_SERIF / QUOTE_SANS / QUOTE_MONO. */
  fontFamily?: string
  nameFamily?: string
  dateFamily?: string
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
    background,
    foreground = "#fafafa",
    muted = "#8f8f8f",
    accent,
    avatar,
    fontFamily = QUOTE_SERIF,
    nameFamily = QUOTE_SANS,
    dateFamily = QUOTE_MONO,
  }: QuoteStillOptions = {},
): string {
  const text = quoteTrim(quote.text)
  assert(text.length > 0, "a quote with no words")
  const seed = quote.seed ?? quote.author?.name ?? text
  const ink = accent ?? quoteAccent(seed)
  const ground = background ?? quoteGround(seed)
  const pad = Math.round(width / 20)
  const faceX = width - Math.round(width * FACE_SHARE)
  const veilX = faceX - Math.round(width * FACE_FEATHER)
  const size = quoteFontSize(text.length, width)
  const step = Math.round(size * 1.35)
  // The words run to where the veil is still SOLID, which is the picture's own left
  // edge: past that the backdrop starts giving way and a line ending there would sit
  // on the photograph.
  const textW = avatar ? faceX - pad : width - 2 * pad
  const lines = quoteWrap(text, size, textW)

  // ONE optical block: mark, words, attribution, centred on what the eye sees rather
  // than on baselines. Every height below is a visual extent.
  const markH = Math.round(size * MARK_EM)
  const markGap = Math.round(size * 0.6)
  const textH = (lines.length - 1) * step + (CAP + DESC) * size
  const nameSize = Math.round(size * 0.62)
  const dateSize = Math.round(size * 0.5)
  const nameH = quote.author ? (CAP + DESC) * nameSize : 0
  const dateH = quote.date ? (CAP + DESC) * dateSize : 0
  const footGap = nameH || dateH ? Math.round(size * 1.1) : 0
  const nameGap = nameH && dateH ? Math.round(nameSize * 0.55) : 0
  const total = markH + markGap + textH + footGap + nameH + nameGap + dateH
  const top = Math.round((height - total) / 2)
  if (top < pad)
    throw new Error(
      `quote overflows its frame (${Math.round(total)}px of block in ${height}px): shorten it or widen the frame`,
    )

  // Drawn at the text's own left margin, so its edge is a number rather than a font's
  // invisible side bearing — which is what made it look misaligned.
  const k = markH / MARK_BOX.h
  const glyph = (dx: number) =>
    `<path d="${MARK_PATH}" transform="translate(${pad + dx} ${top}) scale(${k.toFixed(4)})" fill="${ink}" opacity="${MARK_OPACITY}"/>`
  const mark = glyph(0)

  let y = top + markH + markGap + CAP * size
  const rows = lines
    .map((l, i) => {
      const at = Math.round(y + i * step)
      return `<text x="${pad}" y="${at}" fill="${foreground}">${esc(l)}</text>`
    })
    .join("\n    ")
  y += (lines.length - 1) * step + DESC * size + footGap
  const attribution = quote.author
    ? `<text x="${pad}" y="${Math.round(y + CAP * nameSize)}" font-size="${nameSize}" font-family="${esc(nameFamily)}" fill="${foreground}" opacity="0.75">${esc(quote.author.name)}</text>`
    : ""
  y += nameH + nameGap
  const when = quote.date
    ? `<text x="${pad}" y="${Math.round(y + CAP * dateSize)}" font-size="${dateSize}" font-family="${esc(dateFamily)}" fill="${muted}">${esc(quote.date)}</text>`
    : ""

  // The picture is at FULL strength and the veil does all of the fading. Dimming the
  // whole image instead leaves even the part nobody is fading washed out, so a face
  // reads as a ghost rather than as a person.
  const face = avatar
    ? `<image href="${esc(avatar)}" x="${faceX}" y="0" width="${Math.round(width * FACE_SHARE)}" height="${height}" preserveAspectRatio="xMidYMin slice"/>
  <rect x="${veilX}" y="0" width="${width - veilX}" height="${height}" fill="url(#veil)"/>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="veil" x1="0" x2="1">
      <stop offset="0" stop-color="${ground}"/>
      <stop offset="${FACE_FEATHER / (FACE_SHARE + FACE_FEATHER)}" stop-color="${ground}"/>
      <stop offset="0.62" stop-color="${ground}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${ground}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${ground}"/>
  ${face}
  ${mark}
  <g font-family="${esc(fontFamily)}" font-size="${size}" xml:space="preserve">
    ${rows}
    ${attribution}
    ${when}
  </g>
</svg>
`
}
