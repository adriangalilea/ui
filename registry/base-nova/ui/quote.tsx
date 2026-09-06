// Somebody else's words, on the page, at THREE WEIGHTS — and every one of them reads its
// numbers from `quote-card`, the same module that draws the social preview, so there is
// nothing to keep in sync by hand and nothing that can drift when either is touched.
//
//   card     the poster: the portrait bleeding out of the right edge, the ghost mark, the
//            words composed in the band. It IS the link preview, drawn in the DOM.
//   feature  the page's own weight: no frame, no portrait — the mark, the words set at
//            display size over it, one line of attribution. What a quote's own page opens
//            with, and the step the other two left missing.
//   prose    a quotation inside an article, at the page's own type, marked by a small
//            mark rather than a rule. What an embed in a feed card is.
//
// WHAT THE THREE CANNOT SHARE WITH THE STILL is measurement. A browser knows exactly how
// wide a character is and the still has no way to find out, so the still estimates `ch`
// and these state the measure in real `ch` and let the layout engine be right. They agree
// on how many characters a line carries; they may disagree about which word ends one.
//
// It renders a real `<blockquote>` with a real `<cite>`, because that is what this is,
// and a screen reader announcing "blockquote" is information the styling cannot carry.

import {
  assert,
  BLOCK_AT,
  CAP,
  CARD_H,
  CARD_W,
  DATE_EM,
  DESC,
  DISSOLVE,
  EDGE,
  FACE_FEATHER,
  FACE_SHARE,
  FOCUS,
  GLOW,
  GROUND,
  glowOf,
  INDENT,
  LINE,
  MARGIN,
  MARK_BLUR,
  MARK_BOX,
  MARK_EM,
  MARK_OPACITY,
  MARK_PATH,
  NAME_EM,
  QUOTE_CH,
  type Quote as QuoteData,
  type QuoteTone,
  quoteClean,
  quoteMeasure,
  quoteSet,
} from "@/registry/base-nova/lib/quote-card"
import "./quote.css"

export type QuoteVariant = "card" | "feature" | "prose"

export interface QuoteProps extends QuoteData {
  /** Which weight. Defaults to `prose`, the one that shouts least. */
  variant?: QuoteVariant
  /** The picture's own colour, ground and ink. Derived from the pixels by whoever has
   *  them (`toneFrom`); without it the card is neutral, which is honest — a hue from a
   *  hash of the author's name is a colour nobody chose, and it lands wherever the hash
   *  lands. */
  tone?: QuoteTone
  /** Where the subject sits across the portrait, 0 to 1, so the card's dissolve does
   *  not eat it. Same number the still takes, from the same detector. */
  focus?: number
  /** The width the measure is set against, in px. For `card` and `feature`, and only
   *  worth passing when the quote is not in the usual reading column.
   *
   *  `source` is drawn in `feature` and `prose`, never on the card: the still has
   *  nowhere to put a link, and the card matching its own preview outranks carrying one
   *  more affordance. */
  width?: number
  /** The page's serif's average character advance, as a share of the em — see QUOTE_CH.
   *  The browser wraps in real `ch`, so this only decides the SIZE; leave it and a
   *  condensed face is set a third too small for its measure. Pass the same number the
   *  still gets, so the page and the preview set the same type. */
  ch?: number
  className?: string
  children?: React.ReactNode
}

/** The reading column a quote is set for, matching the site's `max-w-3xl`. */
export const QUOTE_WIDTH = 768

const pct = (n: number) => `${(n * 100).toFixed(3)}%`
/** A hundredth of the CONTAINER's width, whatever property it lands on. `%` means that
 *  only for horizontal offsets and widths; everywhere else it means something surprising
 *  — as font-size it is the parent's font-size, as an abspos height the container's
 *  height. */
const cqw = (n: number) => `${(n * 100).toFixed(3)}cqw`

const unit = 1 / 150
const aspect = CARD_W / CARD_H

export function Quote({
  text,
  author,
  source,
  date,
  variant = "prose",
  tone,
  focus = FOCUS,
  width = QUOTE_WIDTH,
  ch = QUOTE_CH,
  className,
  children,
}: QuoteProps) {
  const words = quoteClean(text)
  const body = children ?? <p>{words}</p>
  const ink = tone?.accent ?? "currentColor"
  const classes = `ag-quote ag-quote-${variant}${className ? ` ${className}` : ""}`

  if (variant === "prose")
    return (
      <figure
        className={classes}
        style={{ "--ag-quote-ink": ink } as React.CSSProperties}
      >
        <Mark />
        <blockquote className="ag-quote-body">{body}</blockquote>
        <By author={author} date={date} source={source} face />
      </figure>
    )

  if (variant === "feature") {
    // The words are set in from the left by the still's INDENT and the mark sits at the
    // margin the words are indented FROM, so the two stack the way they do on the card —
    // the overlap is the depth. No band to centre in: the block flows, and it starts
    // half way down the mark so the words climb into it rather than hang below it.
    const column = 1 - unit * INDENT
    const { size } = quoteSet(words, width * column, { ch })
    return (
      <figure
        className={classes}
        style={
          {
            "--ag-quote-ink": ink,
            "--ag-quote-indent": pct(unit * INDENT),
            "--ag-quote-measure": `${quoteMeasure(words.length)}ch`,
            "--ag-quote-size": cqw(size / width),
            "--ag-quote-mark": cqw(MARK_EM / aspect),
            "--ag-quote-mark-fill": String(MARK_OPACITY),
            "--ag-quote-soften": cqw((MARK_EM / aspect) * MARK_BLUR),
            "--ag-quote-line": String(LINE),
            "--ag-quote-gap": cqw(unit * EDGE),
          } as React.CSSProperties
        }
      >
        <Mark />
        <blockquote className="ag-quote-body">{body}</blockquote>
        <By author={author} date={date} source={source} face />
      </figure>
    )
  }

  // THE CARD. Every number below is the still's, recomputed as a share of the frame
  // rather than in pixels, so one set of constants drives both surfaces at any size.
  //
  // BLOCK_AT is the one that cannot cross: placing a block at an arbitrary fraction of
  // the slack means knowing how tall it turned out, and here the browser decides that
  // after this code has run. Centring is the only fraction the DOM gives for free, so
  // the two surfaces agree exactly while BLOCK_AT is a half and would need a measuring
  // pass the day it is not.
  assert(
    BLOCK_AT === 0.5,
    `the web card can only centre its words; BLOCK_AT is ${BLOCK_AT}`,
  )
  const height = width / aspect
  // Without a picture the words take the whole frame, exactly as the still gives it to
  // them; sizing them for the picture's column anyway set a bare quote 59% small.
  const column = author?.avatar
    ? 1 - FACE_SHARE - unit * (MARGIN + INDENT)
    : 1 - unit * (2 * MARGIN + INDENT)
  // The band the still composes in, so a quote too long for the frame THROWS here the
  // way it throws there. Without it the fixed aspect-ratio box just clipped the words
  // mid-sentence, silently — the one thing the module promises never happens.
  const nameSize = NAME_EM * width
  const band = height - 2 * unit * EDGE * width - (CAP + DESC) * nameSize
  const { size } = quoteSet(words, width * column, { bandH: band, ch })

  // The picture is a square as tall as the frame, slid so the subject clears the
  // dissolve, and bounded so it neither leaves ground at the right edge nor empties the
  // fade. Identical arithmetic to the still's, in fractions of the width.
  const faceX = 1 - FACE_SHARE
  const featherX = faceX + (1 - faceX) * FACE_FEATHER
  const slotX = Math.max(
    1 - 1 / aspect,
    Math.min(faceX, (featherX + 1) / 2 - focus / aspect),
  )
  // The mask runs across the PICTURE, so the stops are in its own coordinates.
  const into = (x: number) => pct((x - slotX) * aspect)
  const dissolve = `linear-gradient(to right, ${DISSOLVE.map(
    ([at, on]) => `rgb(0 0 0 / ${on}) ${into(faceX + (featherX - faceX) * at)}`,
  ).join(", ")})`

  return (
    <figure
      className={classes}
      style={
        {
          "--ag-quote-ground": `radial-gradient(${GLOW.r * 100}% ${GLOW.r * 100}% at ${GLOW.cx * 100}% ${GLOW.cy * 100}%, ${glowOf(tone?.ground ?? GROUND).join(", ")})`,
          "--ag-quote-ink": ink,
          "--ag-quote-aspect": `${CARD_W} / ${CARD_H}`,
          "--ag-quote-margin": pct(unit * MARGIN),
          "--ag-quote-indent": pct(unit * (MARGIN + INDENT)),
          "--ag-quote-edge": pct(unit * EDGE * aspect),
          "--ag-quote-floor": pct(
            unit * EDGE * aspect + (CAP + DESC) * NAME_EM * aspect,
          ),
          "--ag-quote-column": pct(column),
          "--ag-quote-measure": `${quoteMeasure(words.length)}ch`,
          "--ag-quote-size": cqw(size / width),
          "--ag-quote-name": cqw(NAME_EM),
          "--ag-quote-date": cqw(DATE_EM),
          "--ag-quote-mark": cqw(MARK_EM / aspect),
          "--ag-quote-mark-fill": String(MARK_OPACITY),
          "--ag-quote-soften": cqw((MARK_EM / aspect) * MARK_BLUR),
          "--ag-quote-line": String(LINE),
          "--ag-quote-slot": pct(slotX),
          "--ag-quote-square": cqw(1 / aspect),
          "--ag-quote-dissolve": dissolve,
        } as React.CSSProperties
      }
    >
      {author?.avatar && (
        // Decorative: the name below it is the accessible attribution, and a screen
        // reader reading the same person twice is noise.
        // biome-ignore lint/performance/noImgElement: an item cannot assume next/image
        <img className="ag-quote-bleed" src={author.avatar} alt="" />
      )}
      <Mark />
      <blockquote className="ag-quote-body">{body}</blockquote>
      <By author={author} date={date} />
    </figure>
  )
}

/** The ghost. One drawing, shipped as an outline, the same at every weight. */
function Mark() {
  return (
    <svg
      className="ag-quote-mark"
      viewBox={`0 0 ${MARK_BOX.w} ${MARK_BOX.h}`}
      aria-hidden="true"
    >
      <path d={MARK_PATH} />
    </svg>
  )
}

/** ONE LINE: the name, then the date, then — where the weight has room for it — the
 *  source. The name is a NAME and stays in the page's own colour: colouring it makes the
 *  accent mean "person", which it means nowhere else, and pulls the eye off the
 *  sentence. */
function By({
  author,
  date,
  source,
  face = false,
}: Pick<QuoteData, "author" | "date" | "source"> & { face?: boolean }) {
  if (!author && !date && !source) return null
  return (
    <figcaption className="ag-quote-by">
      {face && author?.avatar && (
        // biome-ignore lint/performance/noImgElement: an item cannot assume next/image
        <img
          className="ag-quote-face"
          src={author.avatar}
          alt=""
          width={40}
          height={40}
        />
      )}
      {author &&
        (author.href ? (
          <cite>
            <a href={author.href}>{author.name}</a>
          </cite>
        ) : (
          <cite>{author.name}</cite>
        ))}
      {date && <span className="ag-quote-date">{date}</span>}
      {source && (
        <a
          className="ag-quote-source"
          href={source}
          target="_blank"
          rel="noopener noreferrer"
        >
          source ↗
        </a>
      )}
    </figcaption>
  )
}
