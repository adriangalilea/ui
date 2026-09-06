// Somebody else's words, on the page — and in `display`, the SAME COMPOSITION that
// `renderQuoteSvg` draws for a link preview. Not a similar one: the ground, the mark,
// the dissolve, the margins, the measure and the block's place in the band are all read
// from `quote-card`, so there is nothing to keep in sync by hand and nothing that can
// drift when either surface is touched.
//
// WHAT THE TWO CANNOT SHARE is measurement. A browser knows exactly how wide a
// character is and the still has no way to find out, so the still estimates `ch` and
// this one states the measure in real `ch` and lets the layout engine be right. They
// agree on how many characters a line carries; they may disagree about which word ends
// a particular line, and that is the whole of the difference.
//
// It renders a real `<blockquote>` with a real `<cite>`, because that is what this is,
// and a screen reader announcing "blockquote" is information the styling cannot carry.

import {
  assert,
  BLOCK_AT,
  CARD_H,
  CARD_W,
  DATE_EM,
  DISSOLVE,
  EDGE,
  FACE_FEATHER,
  FACE_SHARE,
  FOCUS,
  GROUND,
  INDENT,
  MARGIN,
  MARK_BOX,
  MARK_EM,
  MARK_OPACITY,
  MARK_PATH,
  NAME_EM,
  type Quote as QuoteData,
  type QuoteTone,
  quoteClean,
  quoteMeasure,
  quoteSet,
} from "@/registry/base-nova/lib/quote-card"
import "./quote.css"

export interface QuoteProps extends QuoteData {
  /** Display draws the CARD: the portrait bleeding out of the right edge, the ghost
   *  mark, the words composed in the band. Inline keeps the page's own type, for a
   *  quote inside prose that must not shout over it. */
  display?: boolean
  /** The picture's own colour, ground and ink. Derived from the pixels by whoever has
   *  them (`toneFrom`); without it the card is neutral, which is honest — a hue from a
   *  hash of the author's name is a colour nobody chose, and it lands wherever the hash
   *  lands. */
  tone?: QuoteTone
  /** Where the subject sits across the portrait, 0 to 1, so the dissolve does not eat
   *  it. Same number the still takes, from the same detector. */
  focus?: number
  /** The width the measure is set against, in px. Only for `display`, and only worth
   *  passing when the card is not the usual reading column. */
  width?: number
  className?: string
  children?: React.ReactNode
}

/** The reading column a display quote is set for, matching the site's `max-w-3xl`. */
export const QUOTE_WIDTH = 768

const pct = (n: number) => `${(n * 100).toFixed(3)}%`

export function Quote({
  text,
  author,
  source,
  date,
  display = false,
  tone,
  focus = FOCUS,
  width = QUOTE_WIDTH,
  className,
  children,
}: QuoteProps) {
  const words = quoteClean(text)
  if (!display)
    return (
      <Prose
        words={words}
        author={author}
        source={source}
        date={date}
        tone={tone}
        className={className}
      >
        {children}
      </Prose>
    )

  // Every number below is the still's, recomputed as a share of the frame rather than
  // in pixels, so one set of constants drives both surfaces at any size.
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
  const unit = 1 / 150
  const aspect = CARD_W / CARD_H
  const column = 1 - FACE_SHARE - unit * (MARGIN + INDENT)
  const { size } = quoteSet(words, width * column)

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
      className={`ag-quote ag-quote-card${className ? ` ${className}` : ""}`}
      style={
        {
          "--ag-quote-ground": tone?.ground ?? GROUND,
          "--ag-quote-ink": tone?.accent ?? "currentColor",
          "--ag-quote-aspect": `${CARD_W} / ${CARD_H}`,
          "--ag-quote-margin": pct(unit * MARGIN),
          "--ag-quote-indent": pct(unit * (MARGIN + INDENT)),
          "--ag-quote-edge": pct(unit * EDGE * aspect),
          "--ag-quote-column": pct(column),
          "--ag-quote-measure": `${quoteMeasure(words.length)}ch`,
          "--ag-quote-size": `${(size / width) * 100}cqw`,
          "--ag-quote-name": pct(NAME_EM),
          "--ag-quote-date": pct(DATE_EM),
          "--ag-quote-mark": pct(MARK_EM / aspect),
          "--ag-quote-mark-fill": String(MARK_OPACITY),
          "--ag-quote-slot": pct(slotX),
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
      <svg
        className="ag-quote-mark"
        viewBox={`0 0 ${MARK_BOX.w} ${MARK_BOX.h}`}
        aria-hidden="true"
      >
        <title>opening quotation mark</title>
        <path d={MARK_PATH} />
      </svg>
      <blockquote className="ag-quote-body">
        {children ?? <p>{words}</p>}
      </blockquote>
      {(author || date) && (
        <figcaption className="ag-quote-by">
          {author &&
            (author.href ? (
              <cite>
                <a href={author.href}>{author.name}</a>
              </cite>
            ) : (
              <cite>{author.name}</cite>
            ))}
          {date && <span className="ag-quote-date">{date}</span>}
        </figcaption>
      )}
    </figure>
  )
}

/** A quote INSIDE prose, which is a different object: no frame, no portrait, no ghost.
 *  It borrows the page's type and marks itself with a rule down the side, and it is what
 *  a `<blockquote>` in an article should look like. */
function Prose({
  words,
  author,
  source,
  date,
  tone,
  className,
  children,
}: {
  words: string
  tone?: QuoteTone
  className?: string
  children?: React.ReactNode
} & Pick<QuoteData, "author" | "source" | "date">) {
  return (
    <figure
      className={`ag-quote${className ? ` ${className}` : ""}`}
      style={
        tone
          ? ({ "--ag-quote-ink": tone.accent } as React.CSSProperties)
          : undefined
      }
    >
      <blockquote className="ag-quote-body">
        {children ?? <p>{words}</p>}
      </blockquote>
      {(author || date || source) && (
        <figcaption className="ag-quote-by">
          {author?.avatar && (
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
      )}
    </figure>
  )
}
