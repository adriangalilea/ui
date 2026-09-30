"use client"

// The playhead: where a clip is (`at`) and where it is going (`target`), both in ms.
// Every driver is a way of setting the target: the player's play aims at the end,
// pause aims where it is, a seek moves both, a scroll stage's act cues a span to be
// in. One clock walks `at` to `target` at the clip's own pace, only while the content
// is on screen and the tab is visible, so a scroll stage and a player's bar move the
// SAME playhead and whichever moved last wins. `Playhead` hands the moment to the
// content inside; a component on the clip contract (terminal, macos, telegram-chat)
// reads it with `usePlayhead`. So a page composes plain elements, `<Playback
// clip={clip}><Terminal session={s} /></Playback>`, and a server page can too.

import * as React from "react"
import { type Clip, progressAt, type Span } from "@/registry/base-nova/lib/clip"

const Context = React.createContext<number | null>(null)

/** Provides the moment (0..1 of the clip) to the content inside. */
export function Playhead({
  at,
  children,
}: {
  at: number
  children: React.ReactNode
}) {
  return <Context.Provider value={at}>{children}</Context.Provider>
}

/** The moment a component draws: its own `progress` when given (a still), else the
 *  driver's around it. Neither is a component placed where nothing moves it, and
 *  that screams. */
export function usePlayhead(progress: number | undefined): number {
  const driven = React.useContext(Context)
  const p = progress ?? driven
  if (p === null)
    throw new Error(
      "no playhead: pass `progress`, or place the component inside a driver (Playback, Player)",
    )
  return Math.min(1, Math.max(0, p))
}

export interface PlaybackOptions {
  /** Where it stands before it plays (ms): a story that opens mid-conversation. */
  start?: number
  /** Time on screen before it starts to play (ms): lets a neighbour go first. */
  delay?: number
  /** A span to be in, heading to its end: what a scroll stage's act asks for
   *  (`chapterSpan`). Behind it, the playhead jumps to `from` (the act's story, not a
   *  replay of everything before it); inside, it plays on to `to` and waits; past it,
   *  it comes back to `to`. `from === to` is a seek, which is how a scrub drives it.
   *  A new cue wins over the bar, and the bar over the last cue. */
  cue?: Span
}

export interface PlaybackState {
  at: number
  target: number
}

/** The clock. Plays once, the first time the content is on screen (after `delay`);
 *  holds off screen and in a hidden tab; under reduced motion every aim lands at
 *  once. Rewinds are immediate: going back is a seek, never a replay backwards. */
export function usePlayback(
  clip: Clip,
  { start = 0, delay = 0, cue }: PlaybackOptions = {},
) {
  const duration = clip.duration
  if (!(duration > 0)) throw new Error("playback: duration must be positive")
  const clamp = React.useCallback(
    (ms: number) => Math.min(duration, Math.max(0, ms)),
    [duration],
  )
  const root = React.useRef<HTMLDivElement>(null)
  const [state, setState] = React.useState<PlaybackState>(() => {
    const at = clamp(Math.max(start, cue?.from ?? start))
    return { at, target: at }
  })
  const reduced = React.useRef(false)
  const armed = React.useRef(false)
  const inView = React.useRef(false)
  const cueRef = React.useRef(cue)
  cueRef.current = cue

  /** Every transition goes through here: an aim behind the playhead is a seek, and
   *  reduced motion lands every aim at once. */
  const go = React.useCallback(
    (next: (s: PlaybackState) => PlaybackState) =>
      setState((s) => {
        const n = next(s)
        const target = clamp(n.target)
        const at = reduced.current ? target : Math.min(clamp(n.at), target)
        return at === s.at && target === s.target ? s : { at, target }
      }),
    [clamp],
  )
  const seek = React.useCallback(
    (ms: number) => go(() => ({ at: ms, target: ms })),
    [go],
  )
  const aim = React.useCallback(
    (ms: number) => go((s) => ({ at: s.at, target: ms })),
    [go],
  )
  const pause = React.useCallback(
    () => go((s) => ({ at: s.at, target: s.at })),
    [go],
  )
  const enter = React.useCallback(
    (c: Span) => go((s) => ({ at: Math.max(s.at, c.from), target: c.to })),
    [go],
  )

  // First time on screen (and `delay` later) it plays: to the cue's end, else the end.
  React.useEffect(() => {
    const el = root.current
    if (!el) return
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let timer = 0
    const settle = () => {
      reduced.current = motion.matches
      if (reduced.current) go((s) => s)
    }
    const arm = () => {
      armed.current = true
      const c = cueRef.current
      if (c) enter(c)
      else aim(duration)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current =
          !!entry?.isIntersecting && el.getBoundingClientRect().height > 0
        if (inView.current && !armed.current && !timer)
          timer = window.setTimeout(arm, delay)
      },
      { threshold: 0.35 },
    )
    settle()
    io.observe(el)
    motion.addEventListener("change", settle)
    return () => {
      io.disconnect()
      motion.removeEventListener("change", settle)
      window.clearTimeout(timer)
    }
  }, [go, aim, enter, duration, delay])

  // A new cue moves the playhead into its span; before the first view it only
  // decides where the story stands.
  const cueKey = cue ? `${cue.from}:${cue.to}` : ""
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cue's value is its key
  React.useEffect(() => {
    const c = cueRef.current
    if (!c) return
    if (armed.current) enter(c)
    else
      go((s) => ({
        at: Math.max(s.at, c.from),
        target: Math.max(s.at, c.from),
      }))
  }, [cueKey, enter, go])

  const moving = state.at !== state.target
  React.useEffect(() => {
    if (!moving) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (inView.current && !document.hidden)
        go((s) => ({ at: s.at + dt, target: s.target }))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [moving, go])

  return {
    root,
    at: state.at,
    target: state.target,
    moving,
    progress: progressAt(clip, state.at),
    seek,
    aim,
    pause,
  }
}

export interface PlaybackProps extends PlaybackOptions {
  clip: Clip
  children: React.ReactNode
  className?: string
}

/** A clip that plays once on screen, with no controls: a film in a card. The same
 *  clock as the player, so a still, a playback and a player are one component apart. */
export function Playback({
  clip,
  children,
  className,
  ...options
}: PlaybackProps) {
  const playback = usePlayback(clip, options)
  return (
    <div ref={playback.root} data-slot="playback" className={className}>
      <Playhead at={playback.progress}>{children}</Playhead>
    </div>
  )
}
