// Runnable example: `bun scripts/examples/quote-card.ts` asserts a quote's rules
// against real numbers. The lib stays free of any runtime, which is the whole reason
// an OG route or a build script can draw one.

import {
  assert,
  assertAvatar,
  assertFonts,
  GROUND_LIGHT,
  MEASURE_STEPS,
  QUOTE_CH,
  quoteClean,
  quoteGround,
  quoteMeasure,
  quoteSet,
  quoteWrap,
  renderQuoteSvg,
  toneFrom,
} from "../../registry/base-nova/lib/quote-card"

// THE COLOUR COMES FROM THE PICTURE, never from a hash of a name. A seeded hue lands
// wherever the hash lands, which is how a violet ground ended up behind a
// black-and-white photograph; a hue taken from the pixels cannot. Only the DIRECTION of
// the colour is kept — the average itself is a mid-grey mud no white type survives — so
// every card in a set is equally dark and only the temperature moves.
{
  assert(
    toneFrom(120, 120, 120).ground === quoteGround(0, 0),
    "a grey picture must give a grey ground",
  )
  // And a NEARLY grey one stays nearly grey. Saturation is carried from the picture
  // rather than assumed, so a black-and-white photograph cannot come out tinted.
  const grey = toneFrom(120, 122, 121)
  const sat = Number(grey.ground.split(",")[1]?.trim().replace("%", ""))
  assert(sat <= 4, `a near-grey picture tinted to ${grey.ground}`)
  const warm = toneFrom(180, 120, 70)
  assert(warm.ground.startsWith("hsl(2"), `a warm picture, got ${warm.ground}`)
  assert(
    warm.ground.endsWith(`${GROUND_LIGHT}%)`),
    "the ground takes the CARD's lightness, not the picture's",
  )
  assert(
    toneFrom(20, 13, 8).ground === toneFrom(200, 130, 80).ground,
    "the same hue at any exposure must give the same ground",
  )
  console.log(
    `tone     ${warm.ground} from a warm picture, ${grey.ground} from grey`,
  )
}

// THE LADDER IS A MEASURE, so the SAME quote breaks into the same number of lines in a
// 646px column and a 400px one — the type shrinks, the shape holds. Stated in pixels it
// could only ever be right for the column it was measured against, which is how a
// seventy-six-character quote ended up in four lines of nineteen.
{
  for (const len of [30, 60, 120, 200, 300, 500]) {
    const text = "word "
      .repeat(Math.ceil(len / 5))
      .slice(0, len)
      .trim()
    const wide = quoteSet(text, 646)
    const narrow = quoteSet(text, 400)
    assert(
      wide.lines.length === narrow.lines.length,
      `${len} chars broke into ${wide.lines.length} lines at 646 and ${narrow.lines.length} at 400`,
    )
    assert(
      wide.size > narrow.size,
      `a narrower column must set smaller type at ${len} chars`,
    )
  }
  // Monotone: more words is never a narrower measure.
  let prev = 0
  for (const len of [10, 39, 40, 89, 90, 159, 259, 500]) {
    const ch = quoteMeasure(len)
    assert(ch >= prev, `the measure narrowed at ${len} chars: ${ch} < ${prev}`)
    prev = ch
  }
  assert(
    MEASURE_STEPS[MEASURE_STEPS.length - 1]?.under === Number.POSITIVE_INFINITY,
    "the last rung must be open, or a long quote has no measure at all",
  )
  // A band it cannot fit is a THROW, never a cut.
  let screamed = false
  try {
    quoteSet("word ".repeat(400), 646, { bandH: 100 })
  } catch {
    screamed = true
  }
  assert(
    screamed,
    "a quote that cannot fit its band must scream, not be trimmed",
  )
  console.log(
    `measure  ${MEASURE_STEPS.length} rungs, ${quoteMeasure(30)} to ${quoteMeasure(500)} chars a line`,
  )
}

// NOTHING IS EVER CUT. The words arrive whole, whatever the file's own line breaks
// were, and a length the frame cannot hold is a throw rather than an ellipsis.
{
  const short = "The purpose of a system is what it does."
  assert(quoteClean(short) === short, "a quote is returned whole")
  assert(quoteClean(`  ${short}\n\n`) === short, "and trimmed of its edges")
  assert(
    quoteClean("two\n  lines\there") === "two lines here",
    "every run of whitespace is one space",
  )
  const long = "word ".repeat(200)
  assert(quoteClean(long).length === 999, "a long quote is not shortened")
  console.log("clean    whitespace only, never a cut")
}

// The wrap never drops or reorders a word: a preview that silently loses text is the
// one failure nobody sees until it is public.
{
  const text = quoteClean(
    "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  )
  const { size, lines } = quoteSet(text, 1080)
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
