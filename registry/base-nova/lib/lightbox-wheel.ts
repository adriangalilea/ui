// The wheel session, framework-free. Two kinds of axis, because a wheel stream never
// says when the hand left the trackpad:
//   zoom, pan, y  DRAG. The content follows the accumulated delta from the pose the
//     hand found (`grab`), and silence decides where it lands. Safe: each one springs
//     back to a resting place, so a mistimed release costs nothing.
//   x             STEPS (WHEEL_STEP). Nothing follows the fingers; travel accumulates
//     invisibly and fires one step. A track dragged 1:1 would have to guess when the
//     hand left, and a wrong guess strands the image between two slides.
// `last` is the accepted tick the velocity span is measured against; `at` the last
// cursor; `live` whether a vertical session ever passed the inertia guard. Ticks in,
// a new session and effects out; the binder owns the silence timers and applies the
// effects. `bun scripts/examples/lightbox-wheel.ts`.

import {
  type Band,
  wheelTick as boundTick,
  clampPan,
  dismissCommit,
  dragProgress,
  dragScale,
  overshoot,
  type Point,
  type Pose,
  panBounds,
  rawPan,
  rubber,
  type Sample,
  type Size,
  type View,
  velocity,
  WHEEL_STEP,
  WHEEL_ZOOM,
  wheelIsHand,
  wheelPx,
  zoomAt,
} from "@/registry/base-nova/lib/lightbox-motion"

/** `pass`: the step committed and the device's tail is being swallowed, but a new
 *  hand can still take the session over. `dead`: the lightbox is leaving, nothing
 *  that follows can mean anything. */
export type WheelAxis = "zoom" | "pan" | "x" | "y" | "pass" | "dead"

export type WheelSession = {
  axis: WheelAxis
  live: boolean
  /** The first raw vertical ticks, for the inertia guard. */
  ticks: readonly number[]
  x: number
  y: number
  grab: Pose
  /** The grab read back through the pan rubber. */
  raw0: Point
  /** The raw scale the ticks accumulated; the pose wears it rubbered. */
  zoom: number
  samples: readonly Sample[]
  last: number
  at: Point
}

/** One wheel event, in the band's frame. */
export type WheelInput = {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrl: boolean
  /** The cursor relative to the band center. */
  at: Point
  now: number
}

/** What the engine knows at this tick. */
export type WheelCtx = {
  pose: Pose
  fitted: Size
  band: Band
  zoomMax: number
  can: { prev: boolean; next: boolean }
  /** The visual viewport's height: the dismiss drag's scale. */
  vh: number
  /** The media is a frame: nothing to zoom. */
  frame: boolean
}

export type WheelEffect =
  /** The hand took the image: the engine pauses flights and marks the gesture. */
  | { kind: "grab" }
  /** The hand is done and what follows is only decay: the chrome comes back NOW,
   *  not when the tail finally dies. */
  | { kind: "release" }
  /** A committing slide is dropped (zoom, pan and dismiss leave the x axis). */
  | { kind: "drop" }
  | { kind: "pose"; pose: Pose }
  | { kind: "step"; d: -1 | 1 }
  | { kind: "exit"; vy: number }

const begin = (input: WheelInput, ctx: WheelCtx, dx: number, dy: number) => {
  const axis: WheelAxis = input.ctrl
    ? "zoom"
    : ctx.pose.s > 1.01
      ? "pan"
      : Math.abs(dx) > Math.abs(dy)
        ? "x"
        : "y"
  if (axis === "zoom" && ctx.frame) return null
  const session: WheelSession = {
    axis,
    live: axis !== "y",
    ticks: [],
    x: 0,
    y: 0,
    grab: ctx.pose,
    raw0: rawPan(ctx.pose, ctx.fitted, ctx.band),
    zoom: ctx.pose.s,
    samples: [],
    last: 0,
    at: input.at,
  }
  // Only a DRAG takes the image: the stepper moves nothing, so it must not pause
  // flights, flag a gesture, or drop a slide that is still landing.
  const effects: WheelEffect[] =
    axis === "zoom" || axis === "pan"
      ? [{ kind: "grab" }, { kind: "drop" }]
      : []
  return { session, effects }
}

/** A tick: a null session starts one (or refuses: a zoom on a frame), a passing one
 *  is untouched and its silence timer re-armed by the binder, a live one moves the
 *  content. Lines and pages become px here; the guard reads the tick the device
 *  sent, motion reads it bounded. */
export function wheelTick(
  session: WheelSession | null,
  input: WheelInput,
  ctx: WheelCtx,
): { session: WheelSession | null; effects: WheelEffect[] } {
  const rawX = wheelPx(input.deltaX, input.deltaMode, ctx.band.h)
  const rawY = wheelPx(input.deltaY, input.deltaMode, ctx.band.h)
  const dx = boundTick(rawX)
  const dy = boundTick(rawY)
  const opened = session ? { session, effects: [] } : begin(input, ctx, dx, dy)
  if (!opened) return { session: null, effects: [] }
  const effects: WheelEffect[] = opened.effects
  let w = opened.session
  const axis = w.axis
  if (axis === "dead") return { session: w, effects }
  if (axis === "pass") {
    // The step already landed; what follows is the device's inertia and is ignored
    // whole. The binder drops the session a breath after the stream pauses
    // (WHEEL_PASS_SILENCE), which is the only honest signal that the tail is over.
    return { session: w, effects }
  }
  w = { ...w, last: input.now, at: input.at }
  switch (axis) {
    case "zoom": {
      // The raw accumulator rubbers (soft floor under fit, stiff over the ceiling),
      // the way a drag offsets from its grab.
      w = { ...w, zoom: w.zoom * Math.exp(-dy * WHEEL_ZOOM) }
      const v = zoomAt(ctx.pose, rubber(w.zoom, 1, ctx.zoomMax), w.at)
      effects.push({ kind: "pose", pose: { ...v, p: ctx.pose.p } })
      return { session: w, effects }
    }
    case "pan": {
      const b = panBounds(ctx.pose, ctx.fitted, ctx.band)
      w = { ...w, x: w.x - dx, y: w.y - dy }
      effects.push({
        kind: "pose",
        pose: {
          ...ctx.pose,
          x: overshoot(w.raw0.x + w.x, b.x),
          y: overshoot(w.raw0.y + w.y, b.y),
        },
      })
      return { session: w, effects }
    }
    case "x": {
      // Raw travel, not the bounded tick: 80 px of fingers is 80 px however fast it
      // arrives. Nothing moves until it fires, so there is no in-between to be
      // stranded in, and one swipe is one step until the stream pauses.
      w = { ...w, x: w.x + rawX }
      if (Math.abs(w.x) < WHEEL_STEP) return { session: w, effects }
      const d: -1 | 1 = w.x > 0 ? 1 : -1
      if (!(d === 1 ? ctx.can.next : ctx.can.prev))
        return { session: { ...w, x: 0 }, effects }
      effects.push({ kind: "step", d })
      return { session: { ...w, axis: "pass", x: 0 }, effects }
    }
    case "y": {
      // Nothing accumulates before the guard decides: a session it rejects is passed
      // through whole, one it accepts starts from its first applied tick, offsetting
      // the pose it finds there.
      if (!w.live) {
        const ticks = [...w.ticks, Math.abs(rawY)]
        w = { ...w, ticks }
        if (ticks.length < 3) return { session: w, effects }
        if (!wheelIsHand(ticks))
          return { session: { ...w, axis: "pass" }, effects }
        effects.push({ kind: "grab" }, { kind: "drop" })
        w = { ...w, live: true, grab: ctx.pose }
      }
      w = { ...w, y: w.y - dy }
      const g = w.grab
      effects.push({
        kind: "pose",
        pose: {
          x: g.x,
          y: g.y + w.y,
          s: g.s * dragScale(w.y, ctx.vh),
          p: g.p * dragProgress(w.y, ctx.vh),
        },
      })
      w = { ...w, samples: [...w.samples, { x: 0, y: w.y, t: input.now }] }
      const v = velocity(w.samples, input.now)
      if (dismissCommit(w.y, v.y, ctx.vh)) {
        w = { ...w, axis: "dead" }
        effects.push({ kind: "release" }, { kind: "exit", vy: v.y })
      }
      return { session: w, effects }
    }
    default: {
      const never: never = axis
      throw new Error(`lightbox: wheel axis ${String(never)}`)
    }
  }
}

export type WheelRelease =
  | { kind: "none" }
  /** Zoom let go under fit: spring back to fit. A wheel never dismisses. */
  | { kind: "fit" }
  /** Zoom let go: undo the rubber at the cursor, then momentum and clamp. */
  | { kind: "zoom"; at: Point }
  /** Pan let go: back inside the bounds. */
  | { kind: "pan"; target: View }
  /** A dismiss drag that did not commit: home under the hand's spring, with its speed. */
  | { kind: "cancel"; vel: Point }

/** Silence: the session ends and decides. */
export function wheelRelease(
  w: WheelSession,
  ctx: Pick<WheelCtx, "pose" | "fitted" | "band">,
): WheelRelease {
  const v = velocity(w.samples, w.last)
  switch (w.axis) {
    case "pass":
    case "dead":
      return { kind: "none" }
    case "zoom":
      return ctx.pose.s < 1 ? { kind: "fit" } : { kind: "zoom", at: w.at }
    case "pan":
      return { kind: "pan", target: clampPan(ctx.pose, ctx.fitted, ctx.band) }
    case "y":
      return w.live ? { kind: "cancel", vel: v } : { kind: "none" }
    case "x":
      // The stepper never left the track off a lock.
      return { kind: "none" }
    default: {
      const never: never = w.axis
      throw new Error(`lightbox: wheel axis ${String(never)}`)
    }
  }
}
