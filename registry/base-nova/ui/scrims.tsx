"use client"

// Top and bottom viewport scrims, scroll-linked (see scrims.css for why they are never
// transitioned). Pure CSS where animation-timeline: scroll() exists; a passive scroll
// listener toggles data-on elsewhere. Place it inside the element that scrolls
// (the document, or a scrolling inset): the timeline is scroll(nearest).

import * as React from "react"
import "./scrims.css"

export interface ScrimsProps {
  /** A sticky blurred header IS a top scrim; such a page opts out of this one. */
  top?: boolean
  bottom?: boolean
  className?: string
}

export function Scrims({ top = true, bottom = true, className }: ScrimsProps) {
  const topRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()")) return
    const scroller = (topRef.current ?? bottomRef.current)?.parentElement
    if (!scroller) return
    const target =
      scroller.scrollHeight > scroller.clientHeight
        ? scroller
        : (document.scrollingElement as HTMLElement)
    const measure = () => {
      const y = target.scrollTop
      const end = y + target.clientHeight >= target.scrollHeight - 140
      topRef.current?.toggleAttribute("data-on", y > 160)
      bottomRef.current?.toggleAttribute("data-on", !end)
    }
    const source = target === document.scrollingElement ? window : target
    source.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    measure()
    return () => {
      source.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [])

  return (
    <>
      {bottom && (
        <div
          ref={bottomRef}
          aria-hidden
          className={`ag-scrim${className ? ` ${className}` : ""}`}
          data-edge="bottom"
        />
      )}
      {top && (
        <div
          ref={topRef}
          aria-hidden
          className={`ag-scrim${className ? ` ${className}` : ""}`}
          data-edge="top"
        />
      )}
    </>
  )
}
