"use client"

// The one pinned-stage primitive. A tall track, a sticky stage, and a number:
// --stage-p, 0..1 over the sticky dwell, driven by CSS (animation-timeline: view())
// so scrolling never touches React. `acts` divides the travel into checkpoints; the
// active act is the only React state, and it changes once per checkpoint, never per
// frame. <Act> exposes --act-p (0..1 within its own window) and --act-on (1 while on
// stage) as CSS, for opacity, transform, clip. State-shaped consumers (mount a phone
// when its act begins) read useAct().
//
// Below lg or under prefers-reduced-motion nothing pins: the track is its natural
// height, --stage-p is 1, and `stacked` (when given) renders instead of the stage.

import * as React from "react"
import "./scroll-stage.css"

const StageContext = React.createContext<{
  acts: number
  active: number
} | null>(null)

/** The act on stage (0-based). Only valid inside <ScrollStage>. */
export function useAct(): number {
  const ctx = React.useContext(StageContext)
  if (!ctx) throw new Error("useAct() outside <ScrollStage>")
  return ctx.active
}

export interface ScrollStageProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Checkpoints along the track. Act i is on stage past i/acts of the travel. */
  acts: number
  /** Scroll per act, a CSS length. Default 100svh. */
  pace?: string
  /** Extra travel after the last act, so it dwells. Default 40svh. */
  tail?: string
  /** Fires once per checkpoint change, never per frame. */
  onAct?: (act: number) => void
  /** The alternative layout below lg / under reduced motion (the acts stacked). */
  stacked?: React.ReactNode
  /** The stage: what stays pinned. */
  children: React.ReactNode
  as?: "section" | "article" | "div"
}

const PINNED = "(min-width: 64rem) and (prefers-reduced-motion: no-preference)"

export function ScrollStage({
  acts,
  pace,
  tail,
  onAct,
  stacked,
  children,
  as = "section",
  className,
  style,
  ...rest
}: ScrollStageProps) {
  if (!Number.isInteger(acts) || acts < 1)
    throw new Error(`ScrollStage: acts must be a positive integer, got ${acts}`)
  const track = React.useRef<HTMLElement>(null)
  const paceEl = React.useRef<HTMLDivElement>(null)
  const [active, setActive] = React.useState(0)
  const [engine, setEngine] = React.useState<"css" | "js">("css")
  const onActRef = React.useRef(onAct)
  onActRef.current = onAct

  React.useEffect(() => {
    const el = track.current
    const paceNode = paceEl.current
    if (!el || !paceNode) return
    const css = CSS.supports("animation-timeline: view()")
    setEngine(css ? "css" : "js")
    const pinned = window.matchMedia(PINNED)
    let frame = 0
    let current = -1

    const sample = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const pacePx = paceNode.offsetHeight
      let act: number
      if (!pinned.matches) {
        act = acts - 1
        if (!css) el.style.removeProperty("--stage-p")
      } else {
        act = Math.min(acts - 1, Math.max(0, Math.floor(-rect.top / pacePx)))
        if (!css) {
          const travel = rect.height - window.innerHeight
          const p = travel > 0 ? -rect.top / travel : rect.top < 0 ? 1 : 0
          el.style.setProperty("--stage-p", String(Math.min(1, Math.max(0, p))))
        }
      }
      if (act !== current) {
        current = act
        setActive(act)
        onActRef.current?.(act)
      }
    }
    const queue = () => {
      if (frame === 0) frame = requestAnimationFrame(sample)
    }
    let listening = false
    const listen = (on: boolean) => {
      if (on === listening) return
      listening = on
      if (on) {
        window.addEventListener("scroll", queue, { passive: true })
        window.addEventListener("resize", queue, { passive: true })
      } else {
        window.removeEventListener("scroll", queue)
        window.removeEventListener("resize", queue)
      }
    }
    // The listener exists only while the track is on screen.
    const io = new IntersectionObserver(([entry]) => {
      listen(entry?.isIntersecting ?? false)
      queue()
    })
    io.observe(el)
    pinned.addEventListener("change", queue)
    sample()
    return () => {
      io.disconnect()
      listen(false)
      pinned.removeEventListener("change", queue)
      cancelAnimationFrame(frame)
    }
  }, [acts])

  const ctx = React.useMemo(() => ({ acts, active }), [acts, active])
  return (
    <StageContext.Provider value={ctx}>
      {React.createElement(
        as,
        {
          ref: track,
          className: `ag-stage-track${className ? ` ${className}` : ""}`,
          "data-engine": engine,
          "data-stacked": stacked !== undefined ? "" : undefined,
          style: {
            "--acts": acts,
            ...(pace && { "--pace": pace }),
            ...(tail && { "--tail": tail }),
            ...style,
          } as React.CSSProperties,
          ...rest,
        },
        <div ref={paceEl} className="ag-stage-pace" aria-hidden />,
        <div className="ag-stage">{children}</div>,
        stacked !== undefined && (
          <div className="ag-stage-stacked">{stacked}</div>
        ),
      )}
    </StageContext.Provider>
  )
}

export interface ActProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-based checkpoint this element belongs to. */
  index: number
  as?: "div" | "section" | "article" | "figure"
}

/** A stage element bound to one act. Exposes two CSS numbers to its subtree:
 *  --act-p (0..1 across the act's own window of travel) and --act-on (1 while the act
 *  is on stage, 0 otherwise; the last act stays on through the tail). Drive opacity,
 *  transform, clip-path from them; do not read them in JS. */
export function Act({
  index,
  as = "div",
  className,
  style,
  ...rest
}: ActProps) {
  const ctx = React.useContext(StageContext)
  if (!ctx) throw new Error("<Act> outside <ScrollStage>")
  if (index < 0 || index >= ctx.acts)
    throw new Error(`<Act index={${index}}> outside 0..${ctx.acts - 1}`)
  const at = `(var(--stage-p) * var(--acts) - ${index})`
  const last = index === ctx.acts - 1
  const on = last
    ? `clamp(0, ${at} * 1000, 1)`
    : `min(clamp(0, ${at} * 1000, 1), clamp(0, (1 - ${at}) * 1000, 1))`
  return React.createElement(as, {
    className,
    "data-act": index,
    "data-on": ctx.active === index ? "" : undefined,
    style: {
      "--act-p": `clamp(0, ${at}, 1)`,
      "--act-on": on,
      ...style,
    } as React.CSSProperties,
    ...rest,
  })
}
