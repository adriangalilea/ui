"use client"

// A player for any clip (lib/clip): a macos stage, a terminal, anything drawn from a
// progress. The content's lib gives the clip (its length and chapters); the player
// owns time and moves the playhead of the content inside (ui/playhead), so a
// page writes `<Player clip={clip}><Terminal session={s} /></Player>`, from a server
// component as well. It plays once when it comes
// into view, and its timeline bar sits under the content, never over it: thick,
// cut into the chapters, the played part in the accent. Hovering the bar shows that
// exact frame in the content, with the chapter and the time above the pointer, and
// leaving it returns to the playhead; a click seeks, a drag scrubs, a horizontal
// swipe scrubs. Keys: space plays and pauses, ← and → move between chapters, Home
// and End go to the ends. Reduced motion starts paused on the last frame.

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  type Clip,
  progressAt,
  spans as spansOf,
} from "@/registry/base-nova/lib/clip"
import { KeysText } from "@/registry/base-nova/ui/kbd"
import { Playhead } from "@/registry/base-nova/ui/playhead"

export interface PlayerProps {
  /** The content: components on the clip contract read the moment from the player. */
  children: React.ReactNode
  /** What it plays: its length and its chapters. */
  clip: Clip
  /** Accessible name of the player. */
  label: string
  /** The played part of the bar. By default a quiet foreground: the bar is a
   *  control, and a page's accent belongs to what it wants seen first. */
  accent?: string
  className?: string
}

/** The gap between two chapters on the bar, px. */
const GAP = 3
/** How close the pointer must come to a chapter's start to be pulled onto it, px. */
const SNAP_PX = 10

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

export function Player({
  children,
  clip,
  label,
  accent,
  className,
}: PlayerProps) {
  const duration = clip.duration
  const [playhead, setPlayhead] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const [hover, setHover] = React.useState<{
    ms: number
    snapped: boolean
  } | null>(null)
  // Whether it was playing when a drag began: it plays on from where it is let go.
  const resume = React.useRef(false)
  const spans = spansOf(clip)
  const root = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const inView = React.useRef(false)
  const started = React.useRef(false)
  const playheadRef = React.useRef(0)
  playheadRef.current = playhead

  // Once in view it plays; out of view it holds, and comes back where it was.
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlayhead(duration)
      started.current = true
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = !!entry?.isIntersecting
        if (inView.current && !started.current) {
          started.current = true
          setPlaying(true)
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [duration])

  React.useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (inView.current) {
        const next = Math.min(duration, playheadRef.current + (now - last))
        setPlayhead(next)
        if (next >= duration) {
          setPlaying(false)
          return
        }
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration])

  // Where a pointer points on the bar, pulled to a chapter's start when it is close
  // enough that the hand meant it (measured on the bar, in px).
  const at = (clientX: number): { ms: number; snapped: boolean } => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return { ms: 0, snapped: false }
    const ms = Math.min(
      duration,
      Math.max(0, ((clientX - r.left) / r.width) * duration),
    )
    const reach = (SNAP_PX / r.width) * duration
    const near = spans
      .map((c) => c.start)
      .filter((s) => s > 0 && Math.abs(s - ms) <= reach)
      .sort((a, b) => Math.abs(a - ms) - Math.abs(b - ms))[0]
    return near === undefined
      ? { ms, snapped: false }
      : { ms: near, snapped: true }
  }
  const seek = (ms: number) => setPlayhead(Math.min(duration, Math.max(0, ms)))
  const toggle = () => {
    if (playhead >= duration) {
      setPlayhead(0)
      setPlaying(true)
    } else setPlaying((p) => !p)
  }

  // A horizontal swipe scrubs; a vertical one stays the page's.
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const width = track.current?.getBoundingClientRect().width ?? 1
      setPlayhead((p) =>
        Math.min(duration, Math.max(0, p + (e.deltaX / width) * duration)),
      )
    }
    el.addEventListener("wheel", wheel, { passive: false })
    return () => el.removeEventListener("wheel", wheel)
  }, [duration])

  const chapterAt = (ms: number) =>
    spans.findLast((c) => ms >= c.start) ?? spans[0]
  const onKey = (e: React.KeyboardEvent) => {
    const here = spans.findLastIndex((c) => playhead >= c.start)
    const map: Record<string, () => void> = {
      " ": toggle,
      k: toggle,
      ArrowRight: () => seek(spans[here + 1]?.start ?? duration),
      // Back to this chapter's start, or the one before when already there.
      ArrowLeft: () =>
        seek(
          playhead - (spans[here]?.start ?? 0) > 1500
            ? (spans[here]?.start ?? 0)
            : (spans[here - 1]?.start ?? 0),
        ),
      Home: () => seek(0),
      End: () => seek(duration),
    }
    const act = map[e.key]
    if (!act) return
    e.preventDefault()
    act()
  }

  if (!(duration > 0)) throw new Error("Player: duration must be positive")
  const shown = hover?.ms ?? playhead
  const hovered = hover ? chapterAt(hover.ms) : null
  const ended = playhead >= duration

  return (
    <div
      ref={root}
      data-slot="player"
      className={className}
      style={
        {
          "--player-accent":
            accent ?? "color-mix(in oklab, var(--foreground) 55%, transparent)",
        } as React.CSSProperties
      }
    >
      <Playhead at={progressAt(clip, shown)}>{children}</Playhead>
      <div className="mt-4 flex select-none items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={ended ? "replay" : playing ? "pause" : "play"}
          className="grid size-8 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            {ended ? (
              <path
                d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.6h2.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : playing ? (
              <path d="M4 3h2.6v10H4zM9.4 3H12v10H9.4z" fill="currentColor" />
            ) : (
              <path d="M4.5 2.8 13 8l-8.5 5.2z" fill="currentColor" />
            )}
          </svg>
        </button>
        <div
          ref={track}
          data-slot="player-track"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(playhead)}
          aria-valuetext={`${clock(playhead)} of ${clock(duration)}${
            chapterAt(playhead)?.title ? `, ${chapterAt(playhead)?.title}` : ""
          }`}
          onKeyDown={onKey}
          className="group relative h-7 flex-1 cursor-pointer touch-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={(e) => {
            const p = at(e.clientX)
            setHover(p)
            if (e.buttons === 1) seek(p.ms)
          }}
          onPointerLeave={() => setHover(null)}
          // A seek keeps the play state: playing, it holds only while the pointer
          // is down, and plays on from where it is let go.
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            resume.current = playing
            setPlaying(false)
            seek(at(e.clientX).ms)
          }}
          onPointerUp={() => {
            if (resume.current && playheadRef.current < duration)
              setPlaying(true)
            resume.current = false
          }}
        >
          {spans.map((c) => {
            const from = c.start / duration
            const width = (c.end - c.start) / duration
            const fill = (to: number) =>
              Math.min(1, Math.max(0, (to - c.start) / (c.end - c.start)))
            const lit = hovered === c
            return (
              <div
                key={c.start}
                className={cn(
                  "absolute top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full transition-[height,background-color] duration-150 group-hover:h-2.5",
                  lit ? "bg-foreground/25" : "bg-foreground/12",
                )}
                style={{
                  left: `${from * 100}%`,
                  width: `calc(${width * 100}% - ${GAP}px)`,
                }}
              >
                {hover && (
                  <div
                    className="absolute inset-y-0 left-0 bg-foreground/15"
                    style={{ width: `${fill(hover.ms) * 100}%` }}
                  />
                )}
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--player-accent)]"
                  style={{ width: `${fill(playhead) * 100}%` }}
                />
              </div>
            )
          })}
          {/* Pulled onto a chapter's start: a marker stands at the boundary. */}
          {hover?.snapped && (
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
              style={{ left: `${(hover.ms / duration) * 100}%` }}
            />
          )}
          {hover && (
            <div
              className="pointer-events-none absolute bottom-full mb-1.5 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-popover-foreground text-xs shadow-md"
              style={{
                left: `clamp(4rem, ${(hover.ms / duration) * 100}%, calc(100% - 4rem))`,
              }}
            >
              {hovered?.title && (
                <span
                  className={
                    hover.snapped ? "font-medium" : "text-popover-foreground/70"
                  }
                >
                  <KeysText>{hovered.title}</KeysText>
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {hover.snapped
                  ? `chapter start · ${clock(hover.ms)}`
                  : clock(hover.ms)}
              </span>
            </div>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          {clock(shown)} / {clock(duration)}
        </span>
      </div>
    </div>
  )
}
