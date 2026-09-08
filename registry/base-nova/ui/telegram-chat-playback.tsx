"use client"

import { type RefObject, useEffect, useState } from "react"

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
