// Somebody else's words, on the page. The SAME quote drawn by `renderQuoteSvg` for a
// social preview: the accent and the size ladder both come out of `quote-card`, so the
// card and the link preview cannot drift apart. Two emitters, one set of rules — the
// terminal and its still are the same arrangement.
//
// It renders a real `<blockquote>` with a real `<cite>`, because that is what this is,
// and a screen reader announcing "blockquote" is information the styling cannot carry.

import {
  type Quote as QuoteData,
  quoteAccent,
  quoteClean,
  quoteSet,
} from "@/registry/base-nova/lib/quote-card"
import "./quote.css"

export interface QuoteProps extends QuoteData {
  /** Display sets the words at the size the preview would, which is the point of the
   *  ladder: a short quote is a poster and a long one is a paragraph. Inline keeps the
   *  page's own type, for a quote inside prose that must not shout over it. */
  display?: boolean
  /** The measured width the ladder steps against. Only for `display`, and only worth
   *  passing when the card is not the usual reading column. */
  width?: number
  className?: string
  children?: React.ReactNode
}

/** The reading column a display quote is set for, matching the site's `max-w-3xl`. */
export const QUOTE_WIDTH = 768

export function Quote({
  text,
  author,
  source,
  date,
  seed,
  display = false,
  width = QUOTE_WIDTH,
  className,
  children,
}: QuoteProps) {
  const words = quoteClean(text)
  const accent = quoteAccent(seed ?? author?.name ?? text)
  // The one place the still's arithmetic reaches the DOM: the size a preview would set
  // these words at, in the units CSS wants. It is a MEASURE, so the number is right for
  // this column rather than for the one it was tuned against.
  const size = display ? `${quoteSet(words, width).size}px` : undefined
  return (
    <figure
      className={`ag-quote${className ? ` ${className}` : ""}`}
      data-display={display ? "" : undefined}
      style={{ "--ag-quote-accent": accent } as React.CSSProperties}
    >
      <blockquote className="ag-quote-body" style={{ fontSize: size }}>
        {children ?? <p>{words}</p>}
      </blockquote>
      {(author || date || source) && (
        <figcaption className="ag-quote-by">
          {author?.avatar && (
            // Decorative: the name beside it is the accessible attribution, and a
            // screen reader reading the name twice is noise.
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
