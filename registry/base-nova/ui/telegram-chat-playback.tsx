"use client"

import { type RefObject, useEffect, useRef, useState } from "react"

/** One-shot playback owns its clock; page scroll only drives explicit progress. */
export function useChatPlayback(
  root: RefObject<HTMLElement | null>,
  controlled: boolean,
  duration: number,
  ceiling: number,
  lift: number,
) {
  const [position, setPosition] = useState(0)
  const played = useRef(0)
  const started = useRef(false)
  const lastCeiling = useRef<number | null>(null)
  useEffect(() => {
    if (controlled) return
    const el = root.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played.current = ceiling
      lastCeiling.current = ceiling
      setPosition(ceiling)
      return
    }
    // Unseen context lands whole, but a story already playing keeps its position.
    // Strict Mode or a duration change must not be mistaken for a new act.
    if (lastCeiling.current === null) {
      if (played.current < lift) played.current = lift
    } else if (
      lastCeiling.current !== ceiling &&
      !started.current &&
      played.current < lastCeiling.current
    ) {
      played.current = lastCeiling.current
    }
    lastCeiling.current = ceiling
    setPosition(played.current)
    let frame = 0
    let last = 0
    let visible = false
    const tick = (now: number) => {
      frame = 0
      const dt = (now - last) / duration
      last = now
      played.current =
        played.current > ceiling
          ? Math.max(ceiling, played.current - dt * 3)
          : Math.min(ceiling, played.current + dt)
      started.current = true
      setPosition(played.current)
      if (played.current !== ceiling) frame = requestAnimationFrame(tick)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (visible && !document.hidden && played.current !== ceiling) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        update()
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
      cancelAnimationFrame(frame)
    }
  }, [root, controlled, duration, ceiling, lift])
  return position
}

/** A finite visible-time clock. Hidden presentations keep their SSR content but
 * own no timer. Frozen captures resolve the schedule without starting playback. */
export function useChatAfterlife(
  root: RefObject<HTMLElement | null>,
  enabled: boolean,
  end: number,
  frozen: boolean,
) {
  const [seconds, setSeconds] = useState(0)
  const finished = seconds >= end
  useEffect(() => {
    const element = root.current
    if (!element || !enabled || frozen || finished) return
    let visible = false
    let timer = 0
    const update = () => {
      window.clearInterval(timer)
      if (visible && !document.hidden)
        timer = window.setInterval(() => {
          setSeconds((value) => Math.min(end, value + 1))
        }, 1000)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible =
        !!entry?.isIntersecting && element.getBoundingClientRect().height > 0
      update()
    })
    observer.observe(element)
    document.addEventListener("visibilitychange", update)
    return () => {
      window.clearInterval(timer)
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [root, enabled, end, frozen, finished])
  return frozen ? end : seconds
}
