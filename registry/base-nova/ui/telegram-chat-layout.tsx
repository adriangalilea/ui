"use client"

import * as React from "react"
import { frameChat } from "@/registry/base-nova/lib/telegram-chat-framing"
import {
  awayFromLatest,
  CHAT_GLIDE_MS,
  createThreadScroll,
  createViewportScroll,
} from "@/registry/base-nova/ui/telegram-chat-scroll"

type ElementRef = React.RefObject<HTMLElement | null>
type MessagesRef = React.RefObject<(HTMLElement | null)[]>
interface Elements {
  root: ElementRef
  thread: ElementRef
  view: ElementRef
  device: ElementRef
  bubbles: MessagesRef
  ghosts: MessagesRef
  ghostRoot: ElementRef
}

/** Layout coordinates ignore decorative transforms, but account for nested scroll. */
function placeIn(el: HTMLElement, ancestor: HTMLElement) {
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== ancestor) {
    y += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null
    for (
      let s: HTMLElement | null = node.parentElement;
      s && s !== ancestor;
      s = s.parentElement
    ) {
      y -= s.scrollTop
      if (s === parent) break
    }
    node = parent
  }
  return { y, h: el.offsetHeight }
}

function focusBox(
  root: HTMLElement,
  held: MessagesRef,
  focused: readonly number[],
) {
  let top = Number.POSITIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const i of focused) {
    const el = held.current[i]
    if (!el) continue
    const p = placeIn(el, root)
    top = Math.min(top, p.y)
    bottom = Math.max(bottom, p.y + p.h)
  }
  return top === Number.POSITIVE_INFINITY ? null : { y: top, h: bottom - top }
}

function ratioOf(crop: string) {
  const m = /^\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*$/.exec(crop)
  const w = m ? Number(m[1]) : Number.NaN
  const h = m?.[2] ? Number(m[2]) : 1
  if (!(w > 0) || !(h > 0))
    throw new Error(`telegram-chat: crop "${crop}" is not an aspect ratio`)
  return w / h
}

/** Measure the live and completed exchange. Scroll controllers own movement;
 * this hook owns size, observers, and their lifetime. Playback supplies invalidations. */
export function useChatLayout({
  elements,
  focused,
  cut,
  frame,
  viewport,
  fit,
  completed,
  position,
  aliveSec,
  debug,
  at,
  ceiling,
  lift,
}: {
  elements: Elements
  focused: readonly number[]
  cut: string | undefined
  frame: "phone" | "none"
  viewport: "content" | "container"
  fit: "focus" | undefined
  completed: boolean
  position: number
  aliveSec: number
  debug: boolean | ((trace: Record<string, unknown>) => void)
  at: number
  ceiling: number
  lift: number
}) {
  const { root, thread, view, device, bubbles, ghosts, ghostRoot } = elements
  const focusKey = focused.join(",")
  const [threadScroll] = React.useState(createThreadScroll)
  const [viewScroll] = React.useState(createViewportScroll)
  const [viewH, setViewH] = React.useState<number | null>(null)
  const [showLatest, setShowLatest] = React.useState(false)
  const [opening, setOpening] = React.useState(false)
  const hadCut = React.useRef(cut)
  const trace = React.useRef<Record<string, unknown> | null>(null)
  const scroller = cut !== undefined || opening

  React.useEffect(() => {
    const was = hadCut.current
    hadCut.current = cut
    if (was && !cut) {
      setOpening(true)
      const id = window.setTimeout(() => setOpening(false), CHAT_GLIDE_MS)
      return () => window.clearTimeout(id)
    }
    setOpening(false)
  }, [cut])

  React.useEffect(() => {
    const el = thread.current
    const port = view.current
    if (!el || !port) return
    const update = () => setShowLatest(awayFromLatest(el))
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    el.addEventListener("scroll", update, { passive: true })
    port.addEventListener("wheel", viewScroll.cancel, { passive: true })
    port.addEventListener("touchstart", viewScroll.cancel, { passive: true })
    update()
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", update)
      port.removeEventListener("wheel", viewScroll.cancel)
      port.removeEventListener("touchstart", viewScroll.cancel)
      viewScroll.cancel()
    }
  }, [thread, view, viewScroll])

  React.useLayoutEffect(() => {
    const element = root.current
    if (!element || fit !== "focus" || viewport !== "container") return
    const previous = element.style.width
    return () => {
      element.style.width = previous
    }
  }, [root, fit, viewport])

  // biome-ignore lint/correctness/useExhaustiveDependencies: focusKey represents the indices; position/aliveSec invalidate message geometry.
  React.useLayoutEffect(() => {
    const port = view.current
    const dev = device.current
    const el = thread.current
    if (!port || !dev || !el) return
    const place = () => {
      const ghost = ghostRoot.current
      const grown = ghost ? focusBox(ghost, ghosts, focused) : null
      const box = focusBox(el, bubbles, focused)
      const pad = el.clientHeight * 0.06
      const top = box
        ? Math.max(
            0,
            (grown?.h ?? box.h) + 2 * pad <= el.clientHeight
              ? box.y + box.h / 2 - el.clientHeight / 2
              : box.y - pad,
          )
        : null
      threadScroll.place(el, top, completed)
      const dh = dev.offsetHeight
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      if (!cut) {
        setViewH(dh)
        port.style.removeProperty("--tg-fade")
        viewScroll.open(port, reduced)
        if (typeof debug === "function")
          debug({
            at: Math.round(at),
            cut: "none",
            dh: Math.round(dh),
            scrollTop: Math.round(port.scrollTop),
            opening: scroller,
          })
        return
      }
      const base =
        viewport === "container"
          ? port.clientHeight
          : port.clientWidth / ratioOf(cut)
      const hero = focusBox(dev, bubbles, focused)
      const liveThread = el.firstElementChild as HTMLElement | null
      const ghostThread = ghost?.firstElementChild as HTMLElement | null
      if (
        fit === "focus" &&
        viewport === "container" &&
        root.current &&
        grown &&
        ghostThread &&
        base > 0 &&
        dev.clientWidth > 0 &&
        grown.h > 0
      ) {
        const tail =
          Number.parseFloat(getComputedStyle(ghostThread).paddingBottom) +
          dev.clientWidth * 0.025
        const width = Math.floor(
          (base * 0.94 * dev.clientWidth) / (grown.h + tail),
        )
        const next = `min(100%, ${width}px)`
        // Ignore the final rounded pixel so cqw-based text cannot feed an endless resize cycle.
        if (
          root.current.style.width !== next &&
          Math.abs(root.current.clientWidth - width) > 1
        )
          root.current.style.width = next
      }
      const framing = frameChat({
        deviceHeight: dh,
        finalDeviceHeight:
          liveThread && ghostThread
            ? Math.max(
                dh,
                dh - liveThread.offsetHeight + ghostThread.offsetHeight,
              )
            : dh,
        baseHeight: base,
        focus: hero
          ? { y: hero.y, height: hero.h, finalHeight: grown?.h ?? hero.h }
          : null,
        grow: viewport !== "container",
        preserveFrame: frame === "phone",
      })
      if (hero)
        port.style.setProperty(
          "--tg-fade",
          `${Math.min(port.clientWidth * 0.09, framing.padding)}px`,
        )
      else port.style.removeProperty("--tg-fade")
      setViewH(framing.height)
      const reach = dh - port.clientHeight
      const result = viewScroll.place(port, framing.top, reach, reduced)
      if (!result.changed) return
      if (debug)
        trace.current = {
          at: Math.round(at),
          ceiling: Number(ceiling.toFixed(3)),
          lift: Number(lift.toFixed(3)),
          target: focused[0],
          landed: hero !== null,
          cut,
          vh: Math.round(framing.height),
          dh: Math.round(dh),
          top: Math.round(framing.top),
          reach: Math.round(reach),
          pending: result.pending,
          scrollTop: Math.round(port.scrollTop),
        }
      if (typeof debug === "function" && trace.current) debug(trace.current)
    }
    place()
    const ready = requestAnimationFrame(() => {
      if (root.current) root.current.dataset.ready = "true"
    })
    // Size writes inside ResizeObserver delivery can invalidate another observed
    // box in that same delivery (notably WebKit). Coalesce them into the next frame.
    let measurementFrame = 0
    const observer = new ResizeObserver(() => {
      if (measurementFrame) return
      measurementFrame = requestAnimationFrame(() => {
        measurementFrame = 0
        place()
      })
    })
    observer.observe(port)
    observer.observe(dev)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    if (ghostRoot.current?.firstElementChild)
      observer.observe(ghostRoot.current.firstElementChild)
    // A render invalidates measurements, not the motion already pursuing the target.
    return () => {
      cancelAnimationFrame(ready)
      cancelAnimationFrame(measurementFrame)
      observer.disconnect()
    }
  }, [cut, focusKey, position, aliveSec, frame, viewport, fit, completed])

  const scrollToLatest = () => {
    const el = thread.current
    if (el) el.scrollTop = el.scrollHeight
  }
  return { viewH, scroller, trace, showLatest, scrollToLatest }
}
