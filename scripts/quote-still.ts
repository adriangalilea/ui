// Draw the quote still and LOOK at it. `mise still` renders three lengths into
// `.renders/` and opens them; `mise still marks` sweeps the mark's position with the
// words stripped out. Dev tooling, not a check — the only judge of how a card reads is
// a person, and this is the shortest path to putting one in front of them.
//
// Three lengths on purpose. The attribution is anchored to the bottom of the frame and
// the mark to the top, so only the words may move between them: one card cannot show
// that and three show it at a glance.
//
// Node APIs throughout, no Bun globals, so it typechecks with everything else.
// Rasterizing needs `rsvg-convert` (librsvg); without it the SVGs are still written
// and it says so, because a missing tool is not a broken card.

import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { inflateSync } from "node:zlib"
import {
  assert,
  type Quote,
  type QuoteStillOptions,
  renderQuoteSvg,
  toneFrom,
} from "../registry/base-nova/lib/quote-card"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, "..", ".renders")
const PUBLIC = join(HERE, "..", "public")
const WIDTH = 1200
const PAD = Math.round(WIDTH / 20)

/** This machine's own face, declared honestly: these are rasterized offline by
 *  librsvg, which reads fontconfig, so what a browser has is beside the point. */
const LOOK: QuoteStillOptions = {
  systemFonts: true,
  fontFamily: "Helvetica Neue",
  nameFamily: "Helvetica Neue",
}

/** THE GROUND'S COLOUR COMES FROM THE PICTURE, and this is where that happens: the card
 *  itself has no runtime and cannot open a PNG, so the side that already holds the
 *  bytes averages them and passes a colour in.
 *
 *  `sips` does the averaging by resampling the whole image down to ONE pixel, which is
 *  the average by definition and costs no decoder here. What comes back is a 1x1 PNG,
 *  and a 1x1 PNG is small enough to read by hand: inflate the one IDAT and the pixel is
 *  the bytes after the filter byte. Every PNG filter reduces to the identity on a
 *  single pixel with nothing above it and nothing to its left, so the filter can be
 *  ignored rather than implemented. */
const averageColor = async (
  path: string,
): Promise<[number, number, number]> => {
  const out = join(
    tmpdir(),
    `quote-avg-${Math.random().toString(36).slice(2)}.png`,
  )
  assert(
    (await run("sips", ["-Z", "1", path, "--out", out])) === 0,
    `sips could not read ${path}`,
  )
  const png = await readFile(out)
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
  const [r, g, b] =
    colorType === 0 || colorType === 4
      ? [raw[1] as number, raw[1] as number, raw[1] as number]
      : [raw[1] as number, raw[2] as number, raw[3] as number]
  return [r, g, b]
}

/** A picture, the ground it bleeds into, and the ink its mark is drawn in — all three
 *  from one file, because all three are the same colour at different lightnesses. */
const look = async (path: string): Promise<QuoteStillOptions> => {
  const bytes = await readFile(path)
  const { ground, accent } = toneFrom(...(await averageColor(path)))
  return {
    avatar: `data:image/png;base64,${bytes.toString("base64")}`,
    background: ground,
    accent,
  }
}

const run = (cmd: string, args: string[]): Promise<number> =>
  new Promise((ok) => {
    spawn(cmd, args, { stdio: "ignore" }).on("close", (code) => ok(code ?? 1))
  })

const face = await look(join(PUBLIC, "mark-twain.png"))

/** `mise still corpus` draws REAL quotes with REAL portraits, read out of
 *  adriangalilea.com's own content. Three invented cards cannot show what a set of
 *  these looks like: the corpus has names of two words and of four, quotes of forty
 *  characters and of two hundred, portraits framed tight and framed loose. Tuning a
 *  layout against three specimens is how a layout ends up fitting three specimens.
 *
 *  Nothing is copied into this repo — it reads the sibling checkout if it is there and
 *  says so if it is not, because a fixture nobody else can reproduce should at least
 *  admit that it is missing rather than fail like a bug. */
const CORPUS = join(HERE, "..", "..", "adriangalilea.com", "content", "quotes")

const frontmatter = (raw: string): Record<string, string> => {
  const end = raw.indexOf("\n---", 4)
  const head = raw.startsWith("---") && end > 0 ? raw.slice(4, end) : ""
  return Object.fromEntries(
    head
      .split("\n")
      .map((l) => l.split(/:\s*/))
      .filter((p): p is [string, string] => p.length === 2)
      .map(([k, v]) => [k.trim(), v.trim()]),
  )
}

const loadCorpus = async (
  limit: number,
  only?: readonly string[],
): Promise<[string, Quote, QuoteStillOptions][]> => {
  const { readdir } = await import("node:fs/promises")
  let authors: string[]
  try {
    authors = await readdir(CORPUS)
  } catch {
    console.error(`no corpus at ${CORPUS} — falling back to the built-in cards`)
    return [...CARDS]
  }
  const out: [string, Quote, QuoteStillOptions][] = []
  // `only` keeps the order it was written in, so a sweep's frames come out in the order
  // they are meant to be flicked through.
  for (const slug of only ?? authors.sort()) {
    if (out.length >= limit) break
    let files: string[]
    let title = slug
    try {
      files = await readdir(join(CORPUS, slug))
      const index = await readFile(join(CORPUS, slug, "index.md"), "utf8")
      title = frontmatter(index).title ?? slug
    } catch {
      continue
    }
    const quotes = files.filter((f) => f.endsWith(".md") && f !== "index.md")
    const first = quotes[0]
    if (!first) continue
    const raw = await readFile(join(CORPUS, slug, first), "utf8")
    // Take everything after the SECOND `---`, matched as a whole line. Slicing from
    // the first one it can find leaves the closing fence in the body when the
    // frontmatter is empty — which two files in this corpus have — and the card then
    // renders "--- A determined person…" as if that were the quote.
    const fence = raw.match(/^---\n[\s\S]*?\n---\n/)
    const body = (fence ? raw.slice(fence[0].length) : raw).trim()
    if (!body) continue
    let picture: QuoteStillOptions = {}
    try {
      picture = await look(join(CORPUS, slug, "avatar.png"))
    } catch {}
    // A date nobody wrote down is stored as year one, and "0001" under a name reads as
    // a bug rather than as an unknown. The site's own rule is the same: below the year
    // 1000 there is no date to show.
    const year = frontmatter(raw).publishedAt?.slice(0, 4)
    const shown = year && Number(year) >= 1000 ? year : null
    out.push([
      slug,
      { text: body, author: { name: title }, date: shown },
      picture,
    ])
  }
  return out
}

const CARDS: readonly [string, Quote, QuoteStillOptions][] = [
  [
    "medium",
    {
      text: "I did not have time to write a short letter, so I wrote a long one instead.",
      author: { name: "Mark Twain" },
      date: "1876",
    },
    face,
  ],
  [
    "short",
    {
      text: "The purpose of a system is what it does.",
      author: { name: "Stafford Beer" },
      date: "2002",
    },
    {},
  ],
  [
    "long",
    {
      text: "It is not the critic who counts, nor the man who points out how the strong man stumbles. The credit belongs to the man who is actually in the arena.",
      author: { name: "Theodore Roosevelt" },
      date: "1910",
    },
    face,
  ],
]

/** The mark's position, in multiples of the margin. With a quote on top the eye reads
 *  the text and the placement is guesswork, so the sweep strips the words — from the
 *  FINISHED card, so the frame, the photograph and the veil under it are the real
 *  ones. */
const MARKS: readonly [string, number, number][] = [
  ["a-left-low", 0.5, 1],
  ["b-mid-low", 1, 1],
  ["c-right-low", 1.6, 1],
  ["d-left-high", 0.5, 0.4],
  ["e-mid-high", 1, 0.4],
  ["f-right-high", 1.6, 0.4],
]

/** Remove the QUOTE'S LINES and nothing else. They are the only `<text>` that carries
 *  no `font-size`, because they inherit it from the group — which also holds the name
 *  and the date, so dropping the whole group takes the attribution with it and every
 *  variant of a sweep comes out identical and empty. */
const stripWords = (svg: string) =>
  svg
    .replace(/<text x="[\d.-]+" y="[\d.-]+" fill="[^"]*">[^<]*<\/text>\s*/g, "")
    // The scrim exists to carry those lines, so it goes with them. Left behind it is a
    // dark blob in the middle of a frame that is being judged for its evenness.
    .replace(/<ellipse[^>]*\/>\s*/, "")
/** The mark is drawn with one `translate`, so a sweep is a substitution on it and
 *  nothing else about the card changes between frames. */
const moveMark = (svg: string, x: number, y: number) =>
  svg.replace(
    /(<path d="M[\s\S]*?transform="translate\()[\d.-]+ [\d.-]+/,
    `$1${x} ${y}`,
  )

/** The attribution's two lines, found by what makes each one what it is: the name is
 *  the one drawn at reduced opacity, the date is the one in the muted ink. Neither
 *  changes SIZE in any variant below — the whole question is where they sit. */
const NAME =
  /(<text x=")([\d.-]+)(" y=")([\d.-]+)("[^>]*opacity="0\.75">)([^<]*)(<\/text>)/
const DATE =
  /(<text x=")([\d.-]+)(" y=")([\d.-]+)("[^>]*fill="#8f8f8f">)([^<]*)(<\/text>)/

const place = (
  svg: string,
  re: RegExp,
  at: (x: number, y: number) => { x: number; y: number; extra?: string },
) =>
  svg.replace(re, (_m, a, x, b, y, c, text, d) => {
    const p = at(Number(x), Number(y))
    const tail = p.extra ? c.replace(">", ` ${p.extra}>`) : c
    return `${a}${p.x}${b}${p.y}${tail}${text}${d}`
  })

/** Where the name and the date go. Same faces, same sizes, same left margin: only the
 *  arrangement moves, which is the one thing that can be judged by looking. */
const ATTRIBS: readonly [string, (svg: string) => string][] = [
  ["a-stacked", (s) => s],
  [
    "b-lower",
    (s) =>
      place(
        place(s, NAME, (x, y) => ({ x, y: y + 22 })),
        DATE,
        (x, y) => ({ x, y: y + 22 }),
      ),
  ],
  [
    "c-higher",
    (s) =>
      place(
        place(s, NAME, (x, y) => ({ x, y: y - 40 })),
        DATE,
        (x, y) => ({ x, y: y - 40 }),
      ),
  ],
  [
    "d-one-line",
    (s) =>
      place(
        place(s, NAME, (x, y) => ({ x, y: y + 44 })),
        DATE,
        (_x, y) => ({
          x: 260,
          y,
        }),
      ),
  ],
  [
    "e-date-first",
    (s) =>
      place(
        place(s, NAME, (x, y) => ({ x, y: y + 44 })),
        DATE,
        (x, y) => ({
          x,
          y: y - 44,
        }),
      ),
  ],
  [
    "f-spread",
    (s) =>
      place(
        place(s, NAME, (x, y) => ({ x, y: y + 44 })),
        DATE,
        (_x, y) => ({
          x: 636,
          y,
          extra: 'text-anchor="end"',
        }),
      ),
  ],
]

/** Where the WORDS sit, in px from where they sit now. Stacking them over the mark is
 *  encouraged — the overlap is what gives the card depth — so the sweep deliberately
 *  climbs into it, and the scrim is what keeps near-white type legible over the pale
 *  grey when it gets there. */
const TEXTS: readonly [string, number][] = [
  ["a-now", 0],
  ["b-up-40", -40],
  ["c-up-90", -90],
  ["d-up-140", -140],
  ["e-up-190", -190],
  ["f-down-40", 40],
]

/** How far right the words may run, as a share of the width, against a scrim strong
 *  enough to carry them there. The picture starts at 0.58, so everything past it is
 *  type over photograph and the scrim is the only reason it reads. */
const WIDTHS: readonly [string, number, number][] = [
  ["a-58", 0.58, 0.72],
  ["b-64", 0.64, 0.8],
  ["c-70", 0.7, 0.86],
  ["d-76", 0.76, 0.9],
]

/** Raise the scrim's own opacity in the finished card: the two stops it uses are the
 *  full value and four fifths of it. */
const scrimAt = (svg: string, o: number) =>
  svg
    .replace(
      /(<stop offset="0" stop-color="[^"]*" stop-opacity=")[\d.]+/,
      `$1${o}`,
    )
    .replace(
      /(<stop offset="0\.55" stop-color="[^"]*" stop-opacity=")[\d.]+/,
      `$1${(o * 0.8).toFixed(3)}`,
    )

/** THE GROUND ALONE: the frame, the portrait and the tone it bleeds into, with the
 *  words, the mark and the scrim all taken out. Whether a picture melts into its
 *  background is a judgement about two adjacent greys, and it cannot be made at all
 *  while a quote sits on top of them asking to be read.
 *
 *  Four faces, deliberately unalike — a grainy black-and-white photograph, an oil
 *  painting, a line drawing, a modern colour shot. A treatment that fuses one of those
 *  and halos another has not been found yet, it has been fitted to one picture. */
const GROUND_FACES = [
  "alan-watts",
  "benjamin-franklin",
  "confucius",
  "naval-ravikant",
]

/** How far the picture dissolves into the ground, as a share of the width. THE ONE
 *  variable in this sweep: the ground's colour is the picture's own and the share it
 *  takes is fixed, so what moves between frames is the transition and nothing else. */
const GROUNDS: readonly [string, number][] = [
  ["a-08", 0.08],
  ["b-14", 0.14],
  ["c-22", 0.22],
  ["d-32", 0.32],
]

/** How much frame the picture takes. THE REAL FRAMING CONTROL, and the reason a sweep
 *  of anchors would have shown four identical cards: these portraits are square and the
 *  slot is taller than it is wide, so the image scales to the height and the whole of it
 *  is always on screen. Only the slot's SHAPE decides what gets cut.
 *
 *  Past about half the width the slot turns wider than the source, the scaling flips to
 *  the width, and the crop starts eating the top and the bottom instead — which is where
 *  heads begin to go, and where a focal point would start to earn its keep. */
const SHARES: readonly [string, number][] = [
  ["a-third", 1 / 3],
  ["b-golden", 0.382],
  ["c-42", 0.42],
  ["d-half", 0.5],
  ["e-58", 0.58],
]

/** Move every line of the quote, and the scrim under them, by the same amount. */
const moveWords = (svg: string, dy: number) =>
  svg
    .replace(
      /<rect x="[\d.-]+" y="([\d.-]+)"([^>]*filter="url\(#scrim\)")/,
      (_m, y, rest) => `<rect x="${PAD - 46}" y="${Number(y) + dy}"${rest}`,
    )
    .replace(
      /<text x="([\d.-]+)" y="([\d.-]+)" fill="([^"]*)">/g,
      (_m, x, y, fill) =>
        `<text x="${x}" y="${Number(y) + dy}" fill="${fill}">`,
    )

const shots: [string, string][] = await (async () => {
  const mode = process.argv[2]
  const [, quote, extra] = CARDS[0] as (typeof CARDS)[number]
  const bare = () => stripWords(renderQuoteSvg(quote, { ...LOOK, ...extra }))
  if (mode === "corpus")
    return (await loadCorpus(Number(process.argv[3] ?? 12))).map(
      ([name, q, x]): [string, string] => [
        `corpus-${name}`,
        renderQuoteSvg(q, { ...LOOK, ...x }),
      ],
    )
  if (mode === "ground") {
    const faces = await loadCorpus(GROUND_FACES.length, GROUND_FACES)
    return GROUNDS.flatMap(([variant, faceFeather]) =>
      faces.map(([slug, q, x]): [string, string] => [
        `ground-${variant}-${slug}`,
        stripWords(renderQuoteSvg(q, { ...LOOK, ...x, faceFeather })),
      ]),
    )
  }
  // Every source portrait at once, unretouched and unscaled beyond fitting the sheet.
  // A card that cuts a head is either cropping badly or drawing a file that arrived
  // cropped, and those two have opposite fixes: one is this module's problem and the
  // other is the content's. Nothing tells them apart faster than looking at the files.
  if (mode === "faces") {
    const { readdir } = await import("node:fs/promises")
    const slugs = (await readdir(CORPUS))
      .filter((s) => !s.endsWith(".md"))
      .sort()
    const COLS = 8
    const CELL = 150
    const rows = Math.ceil(slugs.length / COLS)
    // Embedded, not referenced: librsvg refuses to follow an href out of the SVG's own
    // directory, and a sheet of empty boxes with correct labels under them is the most
    // convincing wrong answer this script could produce.
    const cells: string[] = []
    for (const [i, slug] of slugs.entries()) {
      let png: string
      try {
        png = (await readFile(join(CORPUS, slug, "avatar.png"))).toString(
          "base64",
        )
      } catch {
        png = ""
      }
      const x = (i % COLS) * CELL
      const y = Math.floor(i / COLS) * (CELL + 22)
      cells.push(
        `${png ? `<image href="data:image/png;base64,${png}" x="${x + 5}" y="${y + 5}" width="${CELL - 10}" height="${CELL - 10}" preserveAspectRatio="xMidYMid meet"/>` : ""}
  <text x="${x + CELL / 2}" y="${y + CELL + 12}" font-size="11" font-family="monospace" fill="${png ? "#8f8f8f" : "#c05050"}" text-anchor="middle">${slug}</text>`,
      )
    }
    const w = COLS * CELL
    const h = rows * (CELL + 22)
    return [
      [
        "faces",
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0d0d0f"/>
  ${cells.join("\n  ")}
</svg>
`,
      ],
    ]
  }
  if (mode === "share") {
    const faces = await loadCorpus(GROUND_FACES.length, GROUND_FACES)
    return SHARES.flatMap(([variant, faceShare]) =>
      faces.map(([slug, q, x]): [string, string] => [
        `share-${variant}-${slug}`,
        stripWords(renderQuoteSvg(q, { ...LOOK, ...x, faceShare })),
      ]),
    )
  }
  if (mode === "width")
    return WIDTHS.map(([name, right, scrim]): [string, string] => [
      `width-${name}`,
      scrimAt(
        renderQuoteSvg(quote, { ...LOOK, ...extra, textRight: right }),
        scrim,
      ),
    ])
  if (mode === "text")
    return TEXTS.map(([name, dy]): [string, string] => [
      `text-${name}`,
      moveWords(renderQuoteSvg(quote, { ...LOOK, ...extra }), dy),
    ])
  if (mode === "marks")
    return MARKS.map(([name, kx, ky]): [string, string] => [
      `mark-${name}`,
      moveMark(bare(), Math.round(PAD * kx), Math.round(PAD * ky)),
    ])
  if (mode === "attrib")
    return ATTRIBS.map(([name, move]): [string, string] => [
      `attrib-${name}`,
      move(bare()),
    ])
  return CARDS.map(([name, q, x]): [string, string] => [
    `quote-${name}`,
    renderQuoteSvg(q, { ...LOOK, ...x }),
  ])
})()

await mkdir(OUT, { recursive: true })
const pngs: string[] = []
for (const [name, svg] of shots) {
  const svgPath = join(OUT, `${name}.svg`)
  const pngPath = join(OUT, `${name}.png`)
  await writeFile(svgPath, svg)
  if (
    (await run("rsvg-convert", [
      "-w",
      String(WIDTH),
      svgPath,
      "-o",
      pngPath,
    ])) === 0
  )
    pngs.push(pngPath)
}

if (pngs.length === 0) {
  console.error(
    `wrote ${shots.length} svg to ${OUT}, but rsvg-convert did not run: brew install librsvg`,
  )
  process.exit(0)
}
await run("open", pngs)
console.log(pngs.map((p) => p.slice(OUT.length + 1)).join("  "))
