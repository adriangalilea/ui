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

/** WHERE THE SUBJECT IS, for every picture at once. The card slides a portrait so its
 *  subject clears the dissolve, and it cannot know where that is — the fact lives in the
 *  pixels, so this side finds it and says.
 *
 *  One call for the whole corpus, not one per card. Vision costs about seven
 *  milliseconds an image once the model is warm and roughly a second to launch, so
 *  eighty-four spawns is a minute and a half of nothing but process startup. */
const focusOf = async (
  paths: readonly string[],
): Promise<Map<string, number>> => {
  if (paths.length === 0) return new Map()
  const [code, json] = await capture("swift", [
    join(HERE, "portrait.swift"),
    ...paths,
  ])
  assert(code === 0, "portrait.swift could not read the corpus")
  const found = JSON.parse(json) as {
    path: string
    face?: { x: number; w: number }
    salient?: { x: number; w: number }
  }[]
  // A face when there is one, what the attention model calls the subject when there is
  // not, and the middle when there is neither — the same ladder the crop uses.
  return new Map(
    found.map((f) => {
      const box = f.face ?? f.salient
      return [f.path, box ? box.x + box.w / 2 : 0.5]
    }),
  )
}

/** A picture, the ground it bleeds into, the ink its mark is drawn in, and where its
 *  subject sits. The first three are the same colour at different lightnesses; the
 *  fourth is why a portrait drawn to one side of its own frame survives. */
const look = async (
  path: string,
  focus?: number,
): Promise<QuoteStillOptions> => {
  const bytes = await readFile(path)
  const { ground, accent } = toneFrom(...(await averageColor(path)))
  return {
    avatar: `data:image/png;base64,${bytes.toString("base64")}`,
    background: ground,
    accent,
    ...(focus === undefined ? {} : { focus }),
  }
}

const run = (cmd: string, args: string[]): Promise<number> =>
  new Promise((ok) => {
    spawn(cmd, args, { stdio: "ignore" }).on("close", (code) => ok(code ?? 1))
  })

/** The same, when the answer is on stdout rather than in the exit code. */
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
  const slugs = only ?? authors.sort()
  const { stat } = await import("node:fs/promises")
  const avatars: string[] = []
  for (const slug of slugs) {
    const at = join(CORPUS, slug, "avatar.png")
    try {
      await stat(at)
      avatars.push(at)
    } catch {}
  }
  const focus = await focusOf(avatars)
  // `only` keeps the order it was written in, so a sweep's frames come out in the order
  // they are meant to be flicked through.
  for (const slug of slugs) {
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
    const at = join(CORPUS, slug, "avatar.png")
    let picture: QuoteStillOptions = {}
    try {
      picture = await look(at, focus.get(at))
    } catch {}
    // EVERY quote, not one per author. An author's quotes are not the same length, and
    // length is the only thing the layout has to absorb — taking the first of each threw
    // away half the corpus and most of the range in it.
    //
    // Naming the authors is the exception: a sweep names four faces because it wants
    // four cards that differ in ONE thing, and the same face three times over is noise
    // in the middle of it.
    let taken = 0
    for (const file of files
      .filter((f) => f.endsWith(".md") && f !== "index.md")
      .sort()) {
      if (out.length >= limit || (only && taken > 0)) break
      taken++
      const raw = await readFile(join(CORPUS, slug, file), "utf8")
      // Take everything after the SECOND `---`, matched as a whole line. The body between
      // the fences is OPTIONAL: two files in this corpus are `---\n---\n` with nothing at
      // all in between, so a pattern that demands a newline before the closing fence
      // never matches and the card renders "--- --- A determined person…" as the quote.
      const fence = raw.match(/^---\r?\n(?:[\s\S]*?\r?\n)?---\r?\n/)
      const body = (fence ? raw.slice(fence[0].length) : raw).trim()
      if (!body) continue
      // A date nobody wrote down is stored as year one, and "0001" under a name reads as
      // a bug rather than as an unknown. The site's own rule is the same: below the year
      // 1000 there is no date to show.
      const year = frontmatter(raw).publishedAt?.slice(0, 4)
      const shown = year && Number(year) >= 1000 ? year : null
      out.push([
        `${slug}-${file.replace(/\.md$/, "")}`,
        { text: body, author: { name: title }, date: shown },
        picture,
      ])
    }
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

/** Remove the QUOTE'S LINES and nothing else — the mark and the attribution stay, so
 *  what is judged is the real card minus the one thing that pulls an eye. They are the
 *  only `<text>` carrying no `font-size`, because they inherit it from the group, and
 *  that group also holds the name and the date: drop the group and every frame of a
 *  sweep comes out identical and empty. */
const stripWords = (svg: string) =>
  svg.replace(
    /<text x="[\d.-]+" y="[\d.-]+" fill="[^"]*">[^<]*<\/text>\s*/g,
    "",
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

/** Where the block of words sits in the band, as the share of the slack above it, and
 *  three quotes long enough apart that a placement which flatters one has nowhere to
 *  hide on the others. Whether the words may climb into the mark is exactly what this
 *  decides: high, and they do; low, and they start where it ends. */
const BLOCKS: readonly [string, number][] = [
  ["a-high", 0.382],
  ["b-centre", 0.5],
  ["c-low", 0.618],
]
const BLOCK_FACES = ["albert-einstein", "alan-watts", "confucius"]

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

const shots: [string, string][] = await (async () => {
  const mode = process.argv[2]
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
    const slugs = (await readdir(CORPUS, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
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
  if (mode === "block") {
    const faces = await loadCorpus(BLOCK_FACES.length, BLOCK_FACES)
    return BLOCKS.flatMap(([variant, blockAt]) =>
      faces.map(([slug, q, x]): [string, string] => [
        `block-${variant}-${slug}`,
        renderQuoteSvg(q, { ...LOOK, ...x, blockAt }),
      ]),
    )
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
