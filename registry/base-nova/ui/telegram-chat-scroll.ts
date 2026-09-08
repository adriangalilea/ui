/** Scroll ownership is independent of message rendering and DOM measurement. */
export const CHAT_GLIDE_MS = 800
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

function glide(element: HTMLElement, to: number) {
  const from = element.scrollTop
  if (Math.abs(to - from) < 1) {
    element.scrollTop = to
    return () => {}
  }
  const start = performance.now()
  let frame = 0
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / CHAT_GLIDE_MS)
    element.scrollTop = from + (to - from) * ease(t)
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}

export const awayFromLatest = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight > 40

export function createThreadScroll() {
  let wanted: number | null = null
  let initialized = false
  return {
    place(el: HTMLElement, top: number | null, completed: boolean) {
      if (top !== null) {
        if (wanted !== null && Math.abs(top - wanted) < 1) return
        wanted = top
        el.scrollTop = top
        return
      }
      wanted = null
      if (!initialized || !completed || !awayFromLatest(el))
        el.scrollTop = el.scrollHeight
      initialized = true
    },
  }
}

export function createViewportScroll() {
  let wanted: number | null = null
  let pending = false
  let stop = () => {}
  const cancel = () => {
    stop()
    stop = () => {}
  }
  return {
    cancel,
    open(el: HTMLElement, reduced: boolean) {
      wanted = null
      pending = false
      cancel()
      if (el.scrollTop > 0) {
        if (reduced) el.scrollTop = 0
        else stop = glide(el, 0)
      }
    },
    place(el: HTMLElement, top: number, reach: number, reduced: boolean) {
      const same = wanted !== null && Math.abs(top - wanted) < 1
      if (same && !pending) return { changed: false, pending }
      const smooth = !same && wanted !== null && !reduced
      wanted = top
      // A closing viewport cannot reach its target yet. Retry on resize rather
      // than remembering the browser's clamped position as a completed move.
      pending = top > reach + 1
      cancel()
      if (smooth && !pending) stop = glide(el, top)
      else el.scrollTop = top
      return { changed: true, pending }
    },
  }
}
