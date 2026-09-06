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

/** The mark is the REAL typographic glyph, set in the quote's own face, ghosted and
 *  behind the words. Three shapes were drawn to replace it — a comma pair, a single
 *  comma, a guillemet — and every one of them was a workaround for a bug that was
 *  never about the shape: the still named a font the rasterizer did not have, so the
 *  "harsh, jagged" mark being judged was Verdana's, not the one asked for.
 *
 *  A drawn mark also cannot match the face it sits above, which a glyph does for free
 *  and in whatever family the consumer set.
 *
 *  It is the ONE element off the grid: the text, the name and the date all hang from
 *  one margin, and a frame where everything aligns reads as a form. Its position is
 *  deterministic — anchored to the words, so the composition balances the same way for
 *  any quote. */
/** Sized and placed against the FRAME, not the words: it owns the top-left corner
 *  whatever the quote says, so the composition is the same every time and a long quote
 *  cannot push it around. Huge and barely there — at this size a mark stops being a
 *  glyph on the card and becomes the surface the card is printed on. Small and shy at
 *  the edge it reads as a blob somebody forgot to delete. */
export const MARK_EM = 1.45
export const MARK_OPACITY = 0.07
export const MARK_X = -0.045
export const MARK_BASELINE = 0.98

/** Cap height and descender as shares of the em, for Geist and near enough for any
 *  humanist sans. The still has no way to measure text, so a block is composed from
 *  these: without them "centred" means centred on the BASELINES, which sits the words
 *  visibly high — measured on a 630px frame, 49px of air above and 81px below. */
export const CAP = 0.72
export const DESC = 0.22

/** Where the lines break, BALANCED. The web has `text-wrap: balance` and a still has
 *  nothing, so this is that algorithm: the fewest lines the text fits in, then the
 *  arrangement of those lines whose lengths are most even.
 *
 *  Greedy wrapping is what a first attempt writes, and it produces WIDOWS — "The
 *  purpose of a system is what it / does." leaves one word alone under a full line,
 *  which is the most visible typographic fault a card this size can have and the
 *  reason this is a dynamic program and not a loop.
 *
 *  Cost is the sum of squared slack, the last line INCLUDED. Knuth-Plass leaves the
 *  last line free because it is setting a paragraph; two or three lines is a shape,
 *  and evening every one of them is the entire point. */
export function quoteWrap(
  text: string,
  fontSize: number,
  width: number,
): string[] {
  assert(fontSize > 0, `a font size of ${fontSize}`)
  const per = Math.max(8, Math.floor(width / (fontSize * QUOTE_CH)))
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []

  // The fewest lines it fits in. Any more and the type is smaller than it needed to be.
  let count = 1
  let run = ""
  for (const w of words) {
    const next = run ? `${run} ${w}` : w
    if (next.length <= per || !run) {
      run = next
      continue
    }
    count++
    run = w
  }
  if (count === 1) return [words.join(" ")]

  const n = words.length
  const span = (i: number, j: number) =>
    words.slice(i, j).reduce((sum, w) => sum + w.length, 0) + (j - i - 1)
  const INF = Number.POSITIVE_INFINITY
  // dp[k][i]: the least raggedness of setting words[i..] in exactly k lines.
  const dp = Array.from({ length: count + 1 }, () =>
    new Array<number>(n + 1).fill(INF),
  )
  const cut = Array.from({ length: count + 1 }, () =>
    new Array<number>(n + 1).fill(-1),
  )
  ;(dp[0] as number[])[n] = 0
  for (let k = 1; k <= count; k++) {
    const row = dp[k] as number[]
    const prev = dp[k - 1] as number[]
    const marks = cut[k] as number[]
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j <= n; j++) {
        const w = span(i, j)
        // A word longer than the column still gets its own line: it cannot be broken,
        // and dropping it would be worse than letting it hang.
        if (w > per && j > i + 1) break
        const rest = prev[j] as number
        if (rest === INF) continue
        const slack = per - w
        const cost = rest + slack * slack
        // `<=`, so an equal-cost split takes the LATER break: ties then set a longer
        // first line and a rag that shortens, which is the one that looks composed.
        if (cost <= (row[i] as number)) {
          row[i] = cost
          marks[i] = j
        }
      }
    }
  }
  const out: string[] = []
  let i = 0
  for (let k = count; k > 0; k--) {
    const j = (cut[k] as number[])[i] as number
    assert(j > i, `the balancer lost the words at line ${count - k + 1}`)
    out.push(words.slice(i, j).join(" "))
    i = j
  }
  return out
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
 *  is a person, the date is metadata. They are three SLOTS, not three typefaces: a
 *  component that names Georgia and Geist forces its taste on every page that installs
 *  it, which is not a component, and the defaults here are therefore the GENERIC
 *  families every renderer resolves to the reader's own. Pass real stacks to get the
 *  three voices; pass nothing and it borrows the page's. */
export const QUOTE_SANS = "sans-serif"
export const QUOTE_MONO = "monospace"

/** The families a renderer resolves without being told anything. Naming anything else
 *  is a promise the caller has to keep. */
export const GENERIC_FAMILIES = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "inherit",
]

/** The first family of a stack, unquoted. */
export function firstFamily(stack: string): string {
  return (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "")
}

/** THE FONT A STILL ASKS FOR IS A PROMISE, and an unkept one is silent. A missing
 *  family does not fail: the renderer substitutes, and the card ships looking like
 *  something nobody chose. Measured on this machine, `sans-serif` resolves to Verdana,
 *  and three redesigns of the quote mark were spent on a shape that was never the one
 *  being drawn.
 *
 *  So naming a real face means declaring it will be there — `fonts: ["Geist"]` when
 *  the page or the rasterizer has it — or saying `systemFonts` and accepting whatever
 *  turns up. Silence is the one thing that is not allowed. */
export function assertFonts(
  used: readonly string[],
  available: readonly string[],
  systemFonts: boolean,
): void {
  if (systemFonts) return
  const missing = used
    .map(firstFamily)
    .filter(
      (f) =>
        f.length > 0 &&
        !GENERIC_FAMILIES.includes(f.toLowerCase()) &&
        !available.some((a) => firstFamily(a) === f),
    )
  assert(
    missing.length === 0,
    `these faces are named but not declared available: ${[...new Set(missing)].join(", ")}. ` +
      "List them in `fonts` when the page or the rasterizer really has them, or pass " +
      "`systemFonts: true` to accept a substitute. A still that silently substitutes " +
      "is a still nobody chose the look of.",
  )
}

/** The card's ground is TINTED from the same seed the accent comes from, at a
 *  lightness low enough to read as black at a glance. A quote on pure #000 next to a
 *  photograph looks like two things pasted together; a ground that shares the accent's
 *  hue looks like one image, and it costs a hue rotation rather than decoding the
 *  picture. */
export const GROUND_SAT = 26
export const GROUND_LIGHT = 5
export function quoteGround(hue: number): string {
  return `hsl(${hue}, ${GROUND_SAT}%, ${GROUND_LIGHT}%)`
}
/** Lifted off pure black, and NEUTRAL. A hue seeded from a slug is a colour nobody
 *  chose, and it lands wherever the hash lands: a violet ground behind a
 *  black-and-white photograph is the case that proves it. `quoteAccent` and
 *  `quoteGround` stay exported for a consumer who knows what the picture looks like;
 *  nothing here guesses on their behalf. */
export const GROUND = "#0d0d0f"

/** The first bytes of a format, as base64 sees them. A data URI can declare any mime
 *  it likes; these are what the payload actually IS. */
export const IMAGE_MAGIC: Readonly<Record<string, string>> = {
  "image/png": "iVBORw0KGgo",
  "image/jpeg": "/9j/",
  "image/gif": "R0lGOD",
  "image/webp": "UklGR",
}

/** A PICTURE THAT DOES NOT ARRIVE IS SILENT, exactly like a font that does not. An
 *  `<image>` a renderer cannot resolve is not an error: it draws nothing, the veil
 *  covers nothing, and the card ships as a column of text against empty space, which
 *  looks deliberate. So the avatar has to be bytes and has to be the bytes it claims.
 *
 *  A URL is the common mistake and it is checked first, because it works on the page —
 *  the browser fetches it — and fails only where the preview is actually made. */
export function assertAvatar(avatar: string): void {
  assert(
    avatar.startsWith("data:"),
    `an avatar must be a data URI, got ${avatar.slice(0, 48)}… — a still has no browser, ` +
      "no network and no origin to resolve a path against. Read the file and base64 it.",
  )
  const [head, payload] = avatar.slice(5).split(";base64,")
  assert(
    payload !== undefined && payload.length > 0,
    "an avatar data URI with no base64 payload",
  )
  const mime = (head ?? "").trim()
  const magic = IMAGE_MAGIC[mime]
  assert(
    magic !== undefined,
    `an avatar of type "${mime}", which no renderer is required to draw. One of: ${Object.keys(IMAGE_MAGIC).join(", ")}`,
  )
  assert(
    payload.startsWith(magic),
    `an avatar declared "${mime}" whose bytes are not ${mime} (starts "${payload.slice(0, 12)}"). ` +
      "A truncated read or the wrong extension both land here, and both draw nothing at all.",
  )
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
  /** The three voices. Defaults are the GENERIC families, which every renderer has. */
  fontFamily?: string
  nameFamily?: string
  dateFamily?: string
  /** Faces the caller promises the renderer can resolve. Naming one anywhere above
   *  without listing it here throws. */
  fonts?: readonly string[]
  /** Accept whatever the renderer substitutes. Deliberate, and it says so. */
  systemFonts?: boolean
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
    fontFamily = QUOTE_SANS,
    nameFamily = QUOTE_SANS,
    dateFamily = QUOTE_MONO,
    fonts = [],
    systemFonts = false,
  }: QuoteStillOptions = {},
): string {
  const text = quoteTrim(quote.text)
  assert(text.length > 0, "a quote with no words")
  assertFonts([fontFamily, nameFamily, dateFamily], fonts, systemFonts)
  if (avatar) assertAvatar(avatar)
  const ink = accent ?? foreground
  const ground = background ?? GROUND
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

  // ONE optical block: words and attribution, centred on what the EYE sees rather than
  // on baselines. Every height below is a visual extent. The mark is not in it — it is
  // behind, and a decoration that shifts the words is a decoration in the way.
  const textH = (lines.length - 1) * step + (CAP + DESC) * size
  const nameSize = Math.round(size * 0.62)
  const dateSize = Math.round(size * 0.5)
  const nameH = quote.author ? (CAP + DESC) * nameSize : 0
  const dateH = quote.date ? (CAP + DESC) * dateSize : 0
  const footGap = nameH || dateH ? Math.round(size * 1.1) : 0
  const nameGap = nameH && dateH ? Math.round(nameSize * 0.55) : 0
  const total = textH + footGap + nameH + nameGap + dateH
  const top = Math.round((height - total) / 2)
  if (top < pad)
    throw new Error(
      `quote overflows its frame (${Math.round(total)}px of block in ${height}px): shorten it or widen the frame`,
    )

  // The ghost owns the corner: the real opening quote, at frame scale, bleeding off
  // the top and the left so it reads as the surface rather than as an object on it.
  const markSize = Math.round(height * MARK_EM)
  const mark = `<text x="${Math.round(width * MARK_X)}" y="${Math.round(height * MARK_BASELINE)}" font-size="${markSize}" font-family="${esc(fontFamily)}" fill="${ink}" opacity="${MARK_OPACITY}">&#8220;</text>`

  let y = top + CAP * size
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
