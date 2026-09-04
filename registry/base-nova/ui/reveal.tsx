"use client"

// Progressive arrival for sections, headings, media, lists. Wrap a region and it
// fades up as it enters the viewport; `stagger` lets its direct children take turns.
// The default mode is one-shot (data-in via IntersectionObserver, then the observer
// is gone); mode="scroll" is pure CSS and reversible. Reduced motion: inert.

import * as React from "react"
import "./reveal.css"

type Tag =
  | "div"
  | "section"
  | "article"
  | "header"
  | "ul"
  | "ol"
  | "figure"
  | "li"

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag
  /** "once": arrive and stay (default). "scroll": tied to the scroll position. */
  mode?: "once" | "scroll"
  /** "up": fade + 16px rise (default). "fade": opacity only. */
  from?: "up" | "fade"
  /** Direct children arrive one after another, this many ms apart. Once mode only. */
  stagger?: number
  /** Fraction of the element that must be visible before it arrives. Default 0.2. */
  threshold?: number
}

export function Reveal({
  as = "div",
  mode = "once",
  from = "up",
  stagger,
  threshold = 0.2,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLElement>(null)
  React.useEffect(() => {
    if (mode !== "once") return
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.in = ""
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        el.dataset.in = ""
        io.disconnect()
      },
      // Tall elements may never reach a 20% ratio on a short viewport; a top-edge
      // root margin lets them arrive once their head is well inside.
      { threshold, rootMargin: "0px 0px -10% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [mode, threshold])
  return React.createElement(
    as,
    {
      ref,
      className: `ag-reveal${className ? ` ${className}` : ""}`,
      "data-mode": mode,
      "data-from": from,
      "data-stagger": stagger !== undefined ? "" : undefined,
      style:
        stagger !== undefined
          ? ({ "--stagger": `${stagger}ms`, ...style } as React.CSSProperties)
          : style,
      ...rest,
    },
    children,
  )
}
