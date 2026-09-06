// Runnable example: `bun scripts/examples/quote-card.ts` asserts a quote's rules
// against real numbers. The lib stays free of any runtime, which is the whole reason
// an OG route or a build script can draw one.

import {
  assert,
  assertAvatar,
  assertFonts,
  QUOTE_CH,
  QUOTE_MAX,
  QUOTE_STEPS,
  quoteAccent,
  quoteFontSize,
  quoteHue,
  quoteTrim,
  quoteWrap,
  renderQuoteSvg,
} from "../../registry/base-nova/lib/quote-card"

// The accent is a FUNCTION of the seed, which is the only reason a quote looks like
// itself in a card and in the preview of the same card.
{
  const seed = "saint-exupery/wind-sand-and-stars"
  assert(
    quoteAccent(seed) ===
      quoteAccent(["saint-exupery", "wind-sand-and-stars"].join("/")),
    "the accent is not a function of the seed alone",
  )
  assert(quoteHue(seed) >= 0 && quoteHue(seed) < 360, "hue out of the wheel")
  const hues = new Set(
    ["a", "b", "c", "d", "e", "f", "g", "h"].map((s) =>
      quoteHue(`quotes/${s}`),
    ),
  )
  assert(
    hues.size > 5,
    `neighbouring seeds collapse to one colour: ${hues.size}`,
  )
  assert(quoteHue("") === 0, "an empty seed still answers")
  console.log(`accent   stable, ${hues.size}/8 distinct across near seeds`)
}

// The ladder is a SHARE of the frame, so a 1200px preview and a 768px column step
// down at the same place in the text. A ladder in px would put the break somewhere
// different on every surface, which is the drift this file exists to prevent.
{
  // The claim is that it steps at the same PLACE IN THE TEXT, not that two rounded
  // pixel sizes divide cleanly: every surface must break to the next size at the same
  // character count, or a preview and its page disagree about which quote is big.
  for (const { under } of QUOTE_STEPS.slice(0, -1))
    for (const w of [1200, 768, 400])
      assert(
        quoteFontSize(under - 1, w) > quoteFontSize(under, w),
        `no step at ${under} chars on a ${w}px frame`,
      )
  // And it IS a share, to within the rounding to whole pixels.
  for (const len of [40, 80, 120, 160, 300]) {
    const share = quoteFontSize(len, 1200) / 1200
    assert(
      Math.abs(share - quoteFontSize(len, 768) / 768) < 1 / 768,
      `the ladder is not a share at ${len} chars`,
    )
  }
  // Monotone: more words is never bigger type.
  let prev = Number.POSITIVE_INFINITY
  for (const len of [10, 59, 60, 99, 100, 139, 179, 500]) {
    const size = quoteFontSize(len, 1200)
    assert(size <= prev, `type grew at ${len} chars: ${size} > ${prev}`)
    prev = size
  }
  assert(
    QUOTE_STEPS[QUOTE_STEPS.length - 1]?.under === Number.POSITIVE_INFINITY,
    "the last rung must be open, or a long quote has no size at all",
  )
  console.log(
    `ladder   ${QUOTE_STEPS.length} rungs, ${quoteFontSize(40, 1200)}px down to ${quoteFontSize(500, 1200)}px at 1200`,
  )
}

// The trim ends on a WORD and says that it did.
{
  const long = "word ".repeat(200)
  const cut = quoteTrim(long)
  assert(cut.length <= QUOTE_MAX + 1, `trim overran: ${cut.length}`)
  assert(cut.endsWith("…"), "a cut quote must admit it was cut")
  assert(!cut.includes("  "), "whitespace is collapsed")
  const short = "The purpose of a system is what it does."
  assert(quoteTrim(short) === short, "a short quote is returned whole")
  assert(quoteTrim(`  ${short}\n\n`) === short, "and trimmed of its edges")
  console.log(`trim     ${QUOTE_MAX} chars, on a word boundary`)
}

// The wrap never drops or reorders a word: a preview that silently loses text is the
// one failure nobody sees until it is public.
{
  const text = quoteTrim(
    "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  )
  const size = quoteFontSize(text.length, 1200)
  const lines = quoteWrap(text, size, 1080)
  assert(lines.join(" ") === text, "the wrap changed the words")
  assert(lines.length > 1, "that text fits on one line, so this proves nothing")
  const per = Math.floor(1080 / (size * QUOTE_CH))
  for (const l of lines)
    assert(
      l.length <= per || !l.includes(" "),
      `a line ran past the column: ${l.length} > ${per}`,
    )
  // A word longer than the column gets its own line rather than vanishing.
  const huge = quoteWrap(
    "a Pneumonoultramicroscopicsilicovolcanoconiosis b",
    40,
    200,
  )
  assert(huge.join(" ").includes("Pneumono"), "a long word was dropped")
  console.log(`wrap     ${lines.length} lines, every word kept`)
}

// The still is well-formed, escapes what it interpolates, and REFUSES to clip.
{
  const svg = renderQuoteSvg({
    text: "The purpose of a system is what it does.",
    author: { name: "Stafford Beer" },
    date: "2002",
    seed: "beer/posiwid",
  })
  assert(svg.startsWith("<svg "), "not an svg")
  assert(svg.trimEnd().endsWith("</svg>"), "unterminated svg")
  assert(svg.includes('viewBox="0 0 1200 630"'), "not the size platforms crop")
  assert(svg.includes("Stafford Beer"), "the attribution is missing")
  const hostile = renderQuoteSvg({
    text: '</text><script>alert("x")</script> & <b>bold</b>',
    author: { name: 'a "quoted" name & co' },
  })
  assert(!hostile.includes("<script>"), "the still let markup through")
  assert(!hostile.includes("</text><text"), "a value closed its own element")
  assert(
    hostile.includes("&amp;") && hostile.includes("&lt;"),
    "nothing escaped",
  )
  // A frame too short to hold the words fails loudly instead of cutting a sentence in
  // half where only the reader of a shared link would ever see it.
  let threw = false
  try {
    renderQuoteSvg({ text: "word ".repeat(60) }, { width: 1200, height: 120 })
  } catch {
    threw = true
  }
  assert(threw, "a quote that does not fit must scream, never clip")
  console.log("still    escapes, sizes, and refuses to clip")
}

// A FACE THAT IS NOT THERE AND A PICTURE THAT DOES NOT ARRIVE ARE BOTH SILENT. Neither
// fails: the renderer substitutes a font and draws nothing for the image, and the card
// ships looking like something nobody chose. Three redesigns of the quote mark went
// into a shape that was never the one being drawn, because nothing said so.
{
  const screams = (f: () => unknown, what: string) => {
    let threw = false
    try {
      f()
    } catch {
      threw = true
    }
    assert(threw, `${what} was accepted in silence`)
  }
  screams(
    () => assertFonts(["Geist"], [], false),
    "a face that is merely hoped for",
  )
  assertFonts(["Geist"], ["Geist"], false)
  assertFonts(["Geist"], [], true)
  assertFonts(["sans-serif", "monospace"], [], false)
  assertFonts(['"Geist", sans-serif'], ["Geist"], false)

  screams(() => assertAvatar("/mark-twain.png"), "a path")
  screams(() => assertAvatar("https://example.com/a.png"), "a url")
  screams(() => assertAvatar("data:image/png;base64,"), "an empty payload")
  screams(
    () => assertAvatar("data:image/png;base64,/9j/4AAQ"),
    "png declared over jpeg bytes",
  )
  screams(
    () => assertAvatar("data:image/svg+xml;base64,PHN2Zz4="),
    "a format no renderer must draw",
  )
  assertAvatar("data:image/png;base64,iVBORw0KGgoAAAA")
  console.log("promises fonts and pictures are declared, or it screams")
}
