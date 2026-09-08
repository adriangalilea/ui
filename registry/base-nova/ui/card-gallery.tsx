"use client"

import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { PreviewPicker } from "@/registry/base-nova/ui/preview-picker"

export interface CardGalleryProps {
  children: ReactNode[]
  marks: { label: string; mark: ReactNode }[]
  label?: string
  at?: number
  /** Fractional card position from a scroll timeline; omitting it enables gliding. */
  offset?: number
  onSeek?: (index: number) => void
  /** Let neighboring cards reach the window edges, keeping the active card centered in its column. */
  bleed?: boolean
  /** Space outside the presentation for a fixed sidebar or table of contents. */
  insetInlineEnd?: string
  className?: string
}

/** Card presentation only. A scroll-stage timeline can own at/offset/onSeek;
 * otherwise the same gallery is a keyboard and touch driven carousel. */
export function CardGallery({
  children,
  marks,
  label = "Gallery",
  at,
  offset,
  onSeek,
  bleed = false,
  insetInlineEnd = "0px",
  className,
}: CardGalleryProps) {
  if (!children.length || children.length !== marks.length)
    throw new Error("CardGallery needs one mark for each card")
  const [local, setLocal] = useState(0)
  const index = Math.max(0, Math.min(children.length - 1, at ?? local))
  const seek = (value: number) =>
    (onSeek ?? setLocal)(Math.max(0, Math.min(children.length - 1, value)))
  const wheelAt = useRef(0)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const element = root.current
    if (!element || !bleed) return
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      element.style.setProperty("--gallery-left", `${bounds.left}px`)
      element.style.setProperty(
        "--gallery-window",
        `${document.documentElement.clientWidth}px`,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [bleed])
  return (
    <section
      ref={root}
      data-slot="card-gallery"
      aria-label={label}
      aria-roledescription="carousel"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: carousel keyboard navigation needs a focus target
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "input,textarea,select,[contenteditable=true]",
          )
        )
          return
        const next =
          event.key === "ArrowRight"
            ? index + 1
            : event.key === "ArrowLeft"
              ? index - 1
              : event.key === "Home"
                ? 0
                : event.key === "End"
                  ? children.length - 1
                  : null
        if (next === null) return
        event.preventDefault()
        seek(next)
      }}
      className={cn(
        "group/gallery w-full min-w-0 @container/gallery [--card:min(88cqw,72rem)] [--card-bg:color-mix(in_oklab,var(--foreground)_8%,var(--background))] [--gap:2rem] outline-none",
        className,
      )}
    >
      <div className="space-y-8">
        <div
          data-slot="card-gallery-viewport"
          className="relative overflow-x-clip py-8 touch-pan-y touch-pinch-zoom"
          style={
            bleed
              ? {
                  marginLeft: "calc(-1 * var(--gallery-left, 0px))",
                  width: `calc(var(--gallery-window, 100%) - ${insetInlineEnd})`,
                  maskImage:
                    insetInlineEnd !== "0px"
                      ? "linear-gradient(to right, black calc(100% - 2rem), transparent)"
                      : undefined,
                }
              : undefined
          }
          onWheel={(event) => {
            if (
              Math.abs(event.deltaX) < 24 ||
              Math.abs(event.deltaX) < Math.abs(event.deltaY)
            )
              return
            const now = performance.now()
            if (now - wheelAt.current < 700) return
            wheelAt.current = now
            seek(index + (event.deltaX > 0 ? 1 : -1))
          }}
          onTouchStart={(event) => {
            const point = event.touches[0]
            touch.current =
              event.touches.length === 1 && point
                ? { x: point.clientX, y: point.clientY }
                : null
          }}
          onTouchEnd={(event) => {
            const start = touch.current
            touch.current = null
            const end = event.changedTouches[0]
            if (!start || !end) return
            const dx = start.x - end.clientX,
              dy = start.y - end.clientY
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
              seek(index + (dx > 0 ? 1 : -1))
          }}
          onTouchCancel={() => {
            touch.current = null
          }}
        >
          <div
            data-slot="card-gallery-track"
            className={cn(
              "flex gap-(--gap) pl-[calc((100cqw-var(--card))/2)]",
              offset === undefined &&
                "transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
            )}
            style={{
              paddingLeft: bleed
                ? "calc(var(--gallery-left, 0px) + (100cqw - var(--card)) / 2)"
                : undefined,
              transform: `translateX(calc(-${offset ?? index} * (var(--card) + var(--gap))))`,
            }}
          >
            {children.map((card, i) => (
              <div
                data-slot="card-gallery-card"
                key={marks[i]?.label}
                aria-hidden={i !== index || undefined}
                inert={i !== index}
                className={cn(
                  "w-(--card) shrink-0 rounded-[2rem] bg-(--card-bg)",
                  i === index &&
                    "group-focus-visible/gallery:outline-2 group-focus-visible/gallery:outline-offset-4 group-focus-visible/gallery:outline-ring",
                )}
              >
                {card}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <PreviewPicker
            label={label}
            value={index}
            onChange={seek}
            iconsOnly
            options={marks.map((mark, value) => ({
              value,
              label: mark.label,
              icon: mark.mark,
            }))}
          />
        </div>
      </div>
    </section>
  )
}
