// Draw the quote still to disk. `mise still` renders three built-in lengths into
// `.renders/`; `corpus` draws every real quote, `faces` sheets the source portraits,
// `ground`/`share`/`block` sweep ONE variable each. Dev tooling, not a check — the only
// judge of how a card reads is a person, and a person judges it in a browser, never in
// Preview: nothing here opens anything.
//
// Node APIs throughout, no Bun globals, so it typechecks with everything else.
// Rasterizing needs `rsvg-convert` (librsvg); without it the SVGs are still written
// and it says so, because a missing tool is not a broken card.

import { spawn } from "node:child_process"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  type Quote,
  type QuoteStillOptions,
  renderQuoteSvg,
  toneFrom,
} from "../registry/base-nova/lib/quote-card"
import { averageColor, focusOf, readSidecar, type Sidecar } from "./pixels"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, "..", ".renders")
const PUBLIC = join(HERE, "..", "public")
const WIDTH = 1200

/** This machine's own face, declared honestly: these are rasterized offline by
 *  librsvg, which reads fontconfig, so what a browser has is beside the point. */
const LOOK: QuoteStillOptions = {
  systemFonts: true,
  fontFamily: "Georgia",
  // Georgia's average advance, measured with fontTools — see QUOTE_CH. Naming a face
  // without saying how wide it runs sets the type for some other face.
  ch: 0.434,
  nameFamily: "Helvetica Neue",
}

/** A picture and what the card needs to know about it — its tone and where its subject
 *  sits — read from the SIDECAR `mise portrait` wrote beside it. That is the contract a
 *  consumer lives by: two numbers in a JSON file, no pixels touched at build.
 *
 *  This is a dev tool on the machine that has the tools, so a portrait WITHOUT a sidecar
 *  is not fatal here: the numbers are computed in memory and the gap is said out loud,
 *  because the fix is one command and the corpus should not render differently on a
 *  machine that has run it and one that has not. */
const look = async (
  path: string,
  fallback?: Sidecar,
): Promise<QuoteStillOptions> => {
  const bytes = await readFile(path)
  const side = (await readSidecar(path)) ?? fallback
  const tone = side ? toneFrom(...side.average) : null
  return {
    avatar: `data:image/png;base64,${bytes.toString("base64")}`,
    ...(side && tone
      ? { background: tone.ground, accent: tone.accent, focus: side.focus }
      : {}),
  }
}

/** Sidecars computed in memory for the portraits that lack one on disk. */
const unwritten = async (
  pngs: readonly string[],
): Promise<Map<string, Sidecar>> => {
  const missing: string[] = []
  for (const png of pngs)
    if ((await readSidecar(png)) === null) missing.push(png)
  if (missing.length === 0) return new Map()
  console.error(
    `${missing.length} portraits have no sidecar; computing in memory. Persist with \`mise portraits <dir>\`.`,
  )
  const focus = await focusOf(missing)
  const out = new Map<string, Sidecar>()
  for (const png of missing)
    out.set(png, {
      focus: focus.get(png) ?? 0.5,
      average: await averageColor(png),
    })
  return out
}

const run = (cmd: string, args: string[]): Promise<number> =>
  new Promise((ok) => {
    spawn(cmd, args, { stdio: "ignore" }).on("close", (code) => ok(code ?? 1))
  })

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
    return builtin()
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
  const side = await unwritten(avatars)
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
      picture = await look(at, side.get(at))
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

/** The three invented cards, built ON DEMAND: assembling them reads and averages the
 *  Twain portrait, and most modes never look at them — a corpus render paying a sips
 *  call for cards it will not draw is work done to be thrown away. */
const builtin = async (): Promise<[string, Quote, QuoteStillOptions][]> => {
  const twain = join(PUBLIC, "mark-twain.png")
  const face = await look(twain, (await unwritten([twain])).get(twain))
  return [
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
}

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
    let entries: import("node:fs").Dirent[]
    try {
      entries = await readdir(CORPUS, { withFileTypes: true })
    } catch {
      // The same admission the corpus loader makes: a fixture that is not there is
      // said out loud, not thrown as a raw ENOENT.
      console.error(`no corpus at ${CORPUS} — nothing to sheet`)
      return []
    }
    const slugs = entries
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
  return (await builtin()).map(([name, q, x]): [string, string] => [
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
// Written, never opened. Preview adds banding to a dark ground that is not in the file,
// so nothing can be judged there; what is to be looked at goes on the item's demo page,
// in a browser. This prints where the files went and stops.
console.log(pngs.map((p) => p.slice(OUT.length + 1)).join("  "))
