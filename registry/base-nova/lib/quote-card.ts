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

/** How big the words are set, by how many there are. A short line earns display size; a
 *  long one has to fit, and the step down is what keeps it inside the frame.
 *
 *  Read as a share of the frame's width, not in px, so the web card and a still of any
 *  size step at the same PLACE in the text rather than at the same pixel.
 *
 *  THE LADDER GOES ALL THE WAY DOWN, and nothing is ever cut. It used to stop at 240
 *  characters and hand whatever was left to an ellipsis, which is the one thing a quote
 *  must never do: an author is made to trail off mid-sentence, and the reader is told
 *  the card ran out of room rather than the thinking. The words are the content. They
 *  set the size; the size does not set them.
 *
 *  When even the last rung will not hold the text the card THROWS. A quote too long for
 *  a preview is a decision for whoever wrote it, made at build time with the whole
 *  sentence in front of them — never a silent amputation made here. */
export const QUOTE_STEPS: readonly { under: number; em: number }[] = [
  { under: 60, em: 0.0433 },
  { under: 100, em: 0.0383 },
  { under: 140, em: 0.0333 },
  { under: 180, em: 0.03 },
  { under: 240, em: 0.0283 },
  { under: 320, em: 0.0258 },
  { under: 420, em: 0.0233 },
  { under: Number.POSITIVE_INFINITY, em: 0.0208 },
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

/** The golden minor divides the frame SIDE TO SIDE: the picture takes this much and the
 *  words the rest, and the column of words ends exactly where the picture begins, so one
 *  ratio settles both of those questions instead of two numbers arguing.
 *
 *  It does NOT divide the vertical. Tried against three lengths at once it puts a long
 *  quote's first line straight through the middle of the mark, which is an overlap that
 *  reads as an accident. See BLOCK_AT. */
export const GOLDEN_MINOR = 0.382

/** Past about half the frame the picture's slot turns wider than a square source, the
 *  scaling flips to the width, and the crop starts eating the top and the bottom — which
 *  is where heads go. */
export const FACE_SHARE = GOLDEN_MINOR
/** How far the dissolve runs INTO the picture, as a share of it.
 *
 *  Into it, not beside it: a feather laid in the empty band to the LEFT of the picture
 *  fades a region with no picture in it, so the photograph still ends on a straight
 *  vertical cut and the fade only adds a second edge of its own.
 *
 *  A share of the PICTURE, never of the frame. Measured against the frame it is a fixed
 *  number of pixels eating an arbitrary fraction of whatever the picture turns out to
 *  be: at a third of the frame the same feather dissolved two thirds of the portrait. */
export const FACE_FEATHER = 0.52

/** Where the subject is ACROSS the picture: 0 at its left edge, 1 at its right, and a
 *  half when nobody said. The card slides the picture so this point lands in the middle
 *  of the band that survives the dissolve.
 *
 *  It exists because no fixed alignment can be right. The dissolve always eats the same
 *  side, so a subject sitting there is always the one that suffers — Confucius drawn to
 *  the left of his square and Eric Gill to the right cannot both be saved by a rule that
 *  does not know where they are. That fact is in the PIXELS, and this module has none;
 *  whoever draws the card can find it (`scripts/portrait.swift` asks Vision) and say.
 *
 *  A DETECTED FOCUS IS A GUESS, and it is right often rather than always: two people in
 *  a frame, a face in profile at the edge, a bust whose plinth outweighs its head, and
 *  the model answers something defensible that is not what a person would have picked.
 *  This number is the escape hatch and it is meant to be used — pass it by hand and the
 *  detector is out of the loop entirely for that card. */
export const FOCUS = 0.5

/** THE DISSOLVE'S CURVE, sampled as mask stops. A straight ramp is what a first attempt
 *  writes and it has two visible ends: the picture jumps out of nothing at the start,
 *  and it stops arriving on a line at the finish. Both are edges, which is the one thing
 *  a dissolve exists to avoid.
 *
 *  This is smoothstep, 3t²-2t³ — flat where it leaves the ground and flat where it
 *  reaches the photograph, steep only in the middle where nobody is looking for a
 *  boundary. The haze a linear ramp leaves over a bright wall is the failure it fixes. */
export const DISSOLVE: readonly [number, number][] = [
  [0, 0],
  [0.125, 0.043],
  [0.25, 0.156],
  [0.375, 0.316],
  [0.5, 0.5],
  [0.625, 0.684],
  [0.75, 0.844],
  [0.875, 0.957],
  [1, 1],
]

/** The mark is a DRAWING that ships with the component: the opening quote of
 *  Instrument Serif, outline extracted and normalised into a y-down 260x228 box with
 *  its ink at the origin. No font to load, no bytes to fetch, no promise to keep — and
 *  the shape is the same on every machine, which is what three rounds of judging the
 *  wrong glyph were actually about.
 *
 *  Instrument Serif is Copyright 2022 The Instrument Serif Project Authors, under the
 *  SIL Open Font License 1.1, which permits exactly this: extract, modify, embed and
 *  redistribute. A system face like Times New Roman looks the part and cannot be used
 *  — Monotype's licence forbids shipping its outlines.
 *
 *  It is the ONE element off the grid. The text, the name and the date all hang from
 *  one margin, and a frame where everything aligns reads as a form; its own position
 *  is anchored to the FRAME so the composition is identical whatever the quote says. */
export const MARK_PATH =
  "M54.0 227.8Q29.0 227.8 14.5 209.8Q0.0 191.8 0.0 160.8Q0.0 114.8 20.5 76.8Q41.0 38.8 87.0 5.8Q99.0 -3.2 106.0 1.8Q110.0 4.8 110.0 10.3Q110.0 15.8 103.0 20.8Q69.0 49.8 59.5 65.3Q50.0 80.8 50.0 97.8Q50.0 115.8 58.0 125.3Q66.0 134.8 76.0 141.3Q86.0 147.8 94.0 156.8Q102.0 165.8 102.0 183.8Q102.0 201.8 89.5 214.8Q77.0 227.8 54.0 227.8ZM204.0 227.8Q179.0 227.8 164.5 209.8Q150.0 191.8 150.0 160.8Q150.0 114.8 170.5 76.8Q191.0 38.8 237.0 5.8Q249.0 -3.2 256.0 1.8Q260.0 4.8 260.0 10.3Q260.0 15.8 253.0 20.8Q219.0 49.8 209.5 65.3Q200.0 80.8 200.0 97.8Q200.0 115.8 208.0 125.3Q216.0 134.8 226.0 141.3Q236.0 147.8 244.0 156.8Q252.0 165.8 252.0 183.8Q252.0 201.8 239.5 214.8Q227.0 227.8 204.0 227.8Z"
export const MARK_BOX = { w: 260, h: 228 }
/** The ink's height as a share of the frame. It is the one measurement here that is
 *  NOT a rung: the scale governs the gaps between things, and how big a drawing is
 *  belongs to the drawing. Where it sits is a rung, like everything else. */
export const MARK_EM = 0.245
export const MARK_OPACITY = 0.1
/** Blur, as a share of the mark. It is what makes a ghost a ghost rather than a big
 *  faint drawing: the edges stop competing with the type, and a shape this size with
 *  crisp edges reads as an object sitting on the card. */
export const MARK_BLUR = 0.026
/** The gap between the name and the date on their one line, in name-ems. */
export const ATTRIB_GAP = 1.6
/** The attribution's two sizes, as shares of the FRAME. Fixed for every card. */
export const NAME_EM = 0.0233
export const DATE_EM = 0.0183

/** ONE SCALE, AND EVERY DISTANCE ON THE CARD IS A RUNG OF IT. The studio's 8·2ⁿ, as a
 *  share of the frame so it survives any size: `unit` is 8 px on a 1200 px card, and
 *  the rungs are 1, 2, 4, 8, 16 — 8, 16, 32, 64, 128.
 *
 *  This exists because the alternative was what came before it: 0.4 of a margin here,
 *  3.5 there, 1.2 somewhere else. Every one of those was a number chosen by eye, so
 *  every one of them had to be argued about separately and none of them could be
 *  derived from any other. A scale means an indent is not an opinion, it is a rung,
 *  and the only question left is which one. */
export const unitOf = (width: number): number => width / 150

/** MARGIN is the card's own edge, and the mark and the attribution hang from it.
 *  EDGE is how far the mark is from the ceiling and the attribution from the floor —
 *  the same rung on purpose, so the two of them read as a matched pair holding the
 *  frame. INDENT sets the words in from the margin, which is what makes them the thing
 *  inside the frame rather than a third item in a list.
 *
 *  There is no rung between the mark's foot and the words' cap, because the words do not
 *  hang off the mark. They are COMPOSED in the space the mark and the attribution leave,
 *  and they are allowed to climb into the mark — that overlap is what gives the card its
 *  depth, and the mark is at a tenth of an opacity precisely so it can be climbed on.
 *  Hanging them off the mark is what put 223px of air above a long quote and 79 below. */
export const MARGIN = 8
export const EDGE = 4
export const INDENT = 4

/** Where the words sit in the band between the ceiling and the attribution, as the share
 *  of the slack that goes above them: CENTRED. The band is the same for every quote, so
 *  what varies between cards is the type, never the composition.
 *
 *  Centred and not on a ratio, judged across a long quote, a medium and a short one at
 *  the same time. Higher and a long quote cuts the mark in half; lower and a short quote
 *  drifts down to the attribution. Centred, both extremes land somewhere a person would
 *  have put them. */
export const BLOCK_AT = 0.5

/** STACKING THE WORDS OVER THE MARK IS THE POINT — it is what gives the card depth,
 *  and holding them apart is what made every earlier version read as two pictures side
 *  by side. What stacking costs is contrast: near-white type over the mark's pale grey
 *  is the one place on this card where the ratio fails.
 *
 *  So the words carry a scrim, and it is a RADIAL GRADIENT rather than a blurred
 *  shape. A blurred rectangle was tried and it still reads as a panel: 47 px of blur
 *  on a 728 px box softens the boundary and does not remove it, so the card grows a
 *  rounded slab behind the text. A gradient has no edge to soften — it is opaque where
 *  the words are and transparent by the time it reaches anything, which is
 *  edgelessness by construction and not by tuning.
 *
 *  THERE IS NO SCRIM UNDER THE WORDS, and there must not be one. It belonged to a card
 *  whose ground was a blurred photograph and whose lines ran out over the picture, and
 *  neither is true now: the words stop at the golden line, where the picture has no
 *  strength yet, and the mark sits at a tenth of an opacity. A darkening laid over a FLAT
 *  ground has nothing to hide in — it reads as a stain in the middle of the frame. If
 *  type ever stops being legible here, the ground is wrong or the column is, and a wash
 *  over the top would only be covering for it. */

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

/** One space between words, none at the ends. A quote arrives with the line breaks of
 *  the file it was typed into, and those are not the card's line breaks. */
export function quoteClean(text: string): string {
  return text.replace(/\s+/g, " ").trim()
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

/** THE BACKGROUND IS TWO THINGS AND ONLY TWO: a flat tinted ground, and the picture,
 *  with a dissolve between them. Nothing is blurred underneath and nothing happens in
 *  the corners.
 *
 *  It was a blurred copy of the portrait once, so the ground would carry the picture's
 *  colour with no decoder involved. That is a smear, not a colour: it is lighter in one
 *  corner than another, it darkens at every edge where the gaussian runs off the image,
 *  and a card with weather in its corners reads as an effect rather than as a ground.
 *
 *  A flat ground cannot be derived here — this module has no runtime and cannot open a
 *  PNG. It does not need to. Whoever draws the card HAS the pixels, so the colour is an
 *  argument, and `groundFrom` is the rule for turning those pixels into one. */
/** Dark enough that near-white type sits on it without a thought, and NOT so dark that
 *  the colour in it is a rumour. Lightness 5 with saturation capped at a quarter was
 *  the first attempt and it renders every picture, salmon drawing included, as black:
 *  a tint nobody can see is not a tint. */
export const GROUND_SAT = 40
export const GROUND_LIGHT = 9
export function quoteGround(hue: number, sat = GROUND_SAT): string {
  return `hsl(${hue}, ${sat}%, ${GROUND_LIGHT}%)`
}

/** The picture's own colour, twice: the ground it sits on and the ink the mark is drawn
 *  in. Both are the average's HUE at the card's own lightness — the average itself is a
 *  mid-grey mud no white type survives — so a set of cards is uniformly dark and
 *  uniformly legible, and only the temperature moves between them.
 *
 *  The mark takes it too. A ghost drawn in the type's own white belongs to the text and
 *  reads as a smudge on the card; drawn in the picture's colour it belongs to the
 *  photograph, which is what a thing sitting BEHIND the words should belong to.
 *
 *  Saturation is carried, never assumed. A hue off a hash gave a violet ground behind a
 *  black-and-white photograph; a hue off the picture cannot, but a GREY picture has no
 *  hue at all and taking one on faith puts red behind it. So a grey average stays grey,
 *  and only a picture with colour in it tints. */
export interface QuoteTone {
  ground: string
  accent: string
}
export function toneFrom(r: number, g: number, b: number): QuoteTone {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0)
    return { ground: quoteGround(0, 0), accent: `hsl(0, 0%, ${QUOTE_LIGHT}%)` }
  const s = (l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100
  const h = Math.round(
    max === rr
      ? ((gg - bb) / d + (gg < bb ? 6 : 0)) * 60
      : max === gg
        ? ((bb - rr) / d + 2) * 60
        : ((rr - gg) / d + 4) * 60,
  )
  return {
    ground: quoteGround(h, Math.round(Math.min(GROUND_SAT, s))),
    accent: `hsl(${h}, ${Math.round(Math.min(QUOTE_SAT, s * 1.5))}%, ${QUOTE_LIGHT}%)`,
  }
}

/** Lifted off pure black, and NEUTRAL. What a card gets when nobody passed a colour and
 *  there is no picture to take one from. */
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
  /** THE FUSION, and the one part of this card that legitimately depends on the
   *  picture: how much frame the portrait takes, and how far it dissolves into the
   *  ground. The defaults suit a portrait; a wide painting or a near-white photograph
   *  are the cases worth overriding for. */
  faceShare?: number
  faceFeather?: number
  /** Where the subject sits across the picture, 0 to 1. Defaults to the middle; pass the
   *  real one and a face on either side of its own frame survives. */
  focus?: number
  /** Where the block of words sits in the band between the ceiling and the attribution,
   *  as the share of the slack that goes ABOVE it. Defaults to BLOCK_AT. */
  blockAt?: number
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
    faceShare = FACE_SHARE,
    faceFeather = FACE_FEATHER,
    focus = FOCUS,
    blockAt = BLOCK_AT,
  }: QuoteStillOptions = {},
): string {
  const text = quoteClean(quote.text)
  assert(text.length > 0, "a quote with no words")
  assertFonts([fontFamily, nameFamily, dateFamily], fonts, systemFonts)
  if (avatar) assertAvatar(avatar)
  const ink = accent ?? foreground
  const ground = background ?? GROUND
  const unit = unitOf(width)
  const pad = Math.round(unit * MARGIN)
  // THE PICTURE IS NEVER CROPPED SIDEWAYS, and it is not aligned either — it is SLID so
  // that its subject lands in the band that survives the dissolve.
  //
  // Cropping it into a narrow slot was the first attempt, and then the alignment decides
  // whose face lives: centred, a subject in the middle of the source falls in the fade
  // and appears bitten; aligned left, the right of the source is cut away and a portrait
  // framed to that side loses its head. Both are one mistake, asking a crop to do a
  // fade's job. Sliding a square drawn at full height cuts nothing and works for a face
  // on the left, in the middle or on the right — but only because it is TOLD which.
  //
  // The travel is bounded at both ends: never so far left that ground shows past the
  // right edge, never so far right that the fade has no picture in it.
  const faceX = width - Math.round(width * faceShare)
  const featherX = faceX + Math.round((width - faceX) * faceFeather)
  const slotX = Math.round(
    Math.max(
      width - height,
      Math.min(faceX, (featherX + width) / 2 - focus * height),
    ),
  )
  const size = quoteFontSize(text.length, width)
  const step = Math.round(size * 1.35)
  // The column ends exactly where the picture begins, so ONE ratio divides the card and
  // there is no second number to argue about. At that line the dissolve has not started,
  // so a line ending there sits on the ground, not on a face.
  const textX = Math.round(unit * (MARGIN + INDENT))
  const textW = (avatar ? faceX : width - pad) - textX
  const lines = quoteWrap(text, size, textW)

  // WHAT MOVES AND WHAT DOES NOT. The attribution is anchored to the bottom of the
  // frame and the mark to the top of it, both at the same place for every quote; only
  // the WORDS move, centred in the band left between them. A name and a date that
  // shift from card to card make a set of them read as unrelated pictures, and the
  // amount of text is the one thing that legitimately varies.
  // FIXED, off the frame — never off the quote's own size. Derived from it, a long
  // quote steps the ladder down and drags the name and the date down with it, so a set
  // of cards has an attribution that changes size for a reason nobody can see. It is a
  // caption: it is the same caption on every card.
  const nameSize = Math.round(width * NAME_EM)
  const dateSize = Math.round(width * DATE_EM)
  // ONE LINE: the name, then the date after it. Stacked they read as two facts of
  // equal weight and take twice the room at the foot of a card that has none to spare;
  // side by side they read as one caption, which is what they are. It sits as far off
  // the floor as the mark hangs from the ceiling — the two anchors are a pair.
  const attrBase = Math.round(height - unit * EDGE - DESC * nameSize)
  const dateX =
    pad +
    Math.round(
      (quote.author?.name.length ?? 0) * nameSize * QUOTE_CH +
        nameSize * ATTRIB_GAP,
    )
  const attrTop =
    quote.author || quote.date ? attrBase - CAP * nameSize : height - pad
  // The ghost is anchored to the frame's top-left, EDGE from the ceiling against MARGIN
  // from the wall: a clean two-to-one, and the same rung the attribution keeps off the
  // floor. It takes no space — at this opacity the words pass over it.
  const markH = Math.round(height * MARK_EM)
  const markK = markH / MARK_BOX.h
  const markY = Math.round(unit * EDGE)

  // THE WORDS ARE COMPOSED IN THE BAND, not hung off the mark. The band runs from the
  // composition's ceiling — the rung the mark starts at — to the attribution, and the
  // block is centred in it.
  //
  // Hanging them off the mark instead made the air depend on the LENGTH of the quote:
  // measured on Einstein, 223px above the words and 79 below.
  const textH = (lines.length - 1) * step + (CAP + DESC) * size
  const slack = attrTop - markY - textH
  if (slack < 0)
    throw new Error(
      `quote overflows its frame (${Math.round(textH)}px of words in a ${Math.round(attrTop - markY)}px band): shorten it or widen the frame`,
    )
  const top = Math.round(markY + slack * blockAt)
  const mark = `<path d="${MARK_PATH}" transform="translate(${pad} ${markY}) scale(${markK.toFixed(4)})" fill="${ink}" opacity="${MARK_OPACITY}" filter="url(#soften)"/>`

  const y = top + CAP * size
  const rows = lines
    .map((l, i) => {
      const at = Math.round(y + i * step)
      return `<text x="${textX}" y="${at}" fill="${foreground}">${esc(l)}</text>`
    })
    .join("\n    ")
  const attribution = quote.author
    ? `<text x="${pad}" y="${Math.round(attrBase)}" font-size="${nameSize}" font-family="${esc(nameFamily)}" fill="${foreground}" opacity="0.75">${esc(quote.author.name)}</text>`
    : ""
  const when = quote.date
    ? `<text x="${quote.author ? dateX : pad}" y="${Math.round(attrBase)}" font-size="${dateSize}" font-family="${esc(dateFamily)}" fill="${muted}">${esc(quote.date)}</text>`
    : ""

  // The picture dissolves into the flat ground, and there is nothing between them.
  const face = avatar
    ? `<image href="${esc(avatar)}" x="${slotX}" y="0" width="${height}" height="${height}" preserveAspectRatio="xMidYMid slice" mask="url(#dissolve)"/>`
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="soften" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="${Math.round(markH * MARK_BLUR)}"/>
    </filter>
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="${faceX}" x2="${featherX}">
      ${DISSOLVE.map(([at, on]) => `<stop offset="${at}" stop-color="#fff" stop-opacity="${on}"/>`).join("\n      ")}
    </linearGradient>
    <mask id="dissolve" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect x="${faceX}" y="0" width="${width - faceX}" height="${height}" fill="url(#fade)"/>
    </mask>
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
