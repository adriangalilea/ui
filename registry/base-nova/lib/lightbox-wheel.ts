// The wheel session, framework-free. The slide axis follows the fingers 1:1 and snaps
// the instant the hand lets go; lightbox-wheel-phase is what makes that knowable,
// telling the hand apart from the device's coast. Momentum moves nothing, so one
// swipe is one slide however hard it is thrown, and the track is never left between
// locks with nobody deciding.
//
// The drag axes (zoom, pan, dismiss) offset the pose the hand found (`grab`) and let
// silence decide, which is safe for them: each springs back to a resting place, so a
// mistimed release costs nothing. `last` is the accepted tick the velocity span is
// measured against; `at` the last cursor; `live` whether a vertical session ever
// passed the inertia guard. Ticks in, a new session and effects out; the binder owns
// the timers and applies the effects. `bun scripts/examples/lightbox-wheel.ts`.

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
  SLIDE_GAP,
  slideCommit,
  type View,
  velocity,
  WHEEL_ZOOM,
  wheelIsHand,
  wheelPx,
  zoomAt,
} from "@/registry/base-nova/lib/lightbox-motion"
import {
  type Phase,
  phaseFeed,
  phaseStart,
} from "@/registry/base-nova/lib/lightbox-wheel-phase"

/** `pass`: the axis decided and the rest of the stream is the device coasting.
 *  `dead`: the lightbox is leaving, nothing that follows can mean anything. */
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
  /** Where the track was when this session opened. */
  slide0: number
  /** The raw scale the ticks accumulated; the pose wears it rubbered. */
  zoom: number
  samples: readonly Sample[]
  last: number
  at: Point
  /** Hand or coast, for the axes that need to know. */
  phase: Phase
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
  /** Where the track sits right now, in px. */
  slideX: number
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
  /** The track under the fingers, in px. */
  | { kind: "slide"; x: number }
  | { kind: "step"; d: -1 | 1; vx: number }
  /** The hand let go without asking for a neighbour: the track goes home. */
  | { kind: "home"; vx: number }
  | { kind: "exit"; vy: number }

const begin = (
  input: WheelInput,
  ctx: WheelCtx,
  dx: number,
  dy: number,
  phase: Phase,
) => {
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
    slide0: ctx.slideX,
    zoom: ctx.pose.s,
    samples: [],
    last: 0,
    at: input.at,
    phase,
  }
  const effects: WheelEffect[] =
    axis === "y" ? [] : [{ kind: "grab" }, { kind: "drop" }]
  return { session, effects }
}

/** Where the track sits under the fingers: the grab plus the hand's travel, given a
 *  third of the way past an end that has no neighbour, and never past the slot the
 *  neighbour occupies (nothing is mounted beyond it). */
function trackAt(slide0: number, travel: number, ctx: WheelCtx): number {
  let x = slide0 + travel
  if ((x > 0 && !ctx.can.prev) || (x < 0 && !ctx.can.next)) x *= 0.35
  return overshoot(x, ctx.band.w + SLIDE_GAP)
}

/** A tick: a null session starts one (or refuses: a zoom on a frame), a decided one
 *  ignores the coast that follows, a live one moves the content. Lines and pages
 *  become px here; the guard reads the tick the device sent, motion reads it
 *  bounded. Every event is fed to the phase detector first, session or no session,
 *  because the hand returning mid-coast is what opens the next one. */
export function wheelTick(
  session: WheelSession | null,
  input: WheelInput,
  ctx: WheelCtx,
): { session: WheelSession | null; effects: WheelEffect[] } {
  const rawX = wheelPx(input.deltaX, input.deltaMode, ctx.band.h)
  const rawY = wheelPx(input.deltaY, input.deltaMode, ctx.band.h)
  const dx = boundTick(rawX)
  const dy = boundTick(rawY)
  const fed = phaseFeed(session ? session.phase : phaseStart(), {
    dx: rawX,
    dy: rawY,
    t: input.now,
  })
  // The hand came back while the device was still coasting: the old session is over
  // and this event opens a new one, from wherever the track and pose now are.
  const live = session && !fed.read.interrupted ? session : null
  const opened = live
    ? { session: { ...live, phase: fed.phase }, effects: [] }
    : begin(input, ctx, dx, dy, fed.phase)
  if (!opened) return { session: null, effects: [] }
  const effects: WheelEffect[] = opened.effects
  let w = { ...opened.session, phase: fed.phase }
  const axis = w.axis
  if (axis === "dead") return { session: w, effects }
  if (axis === "pass") {
    // This axis decided; the rest of the stream is the device coasting and moves
    // nothing. The binder drops the session once the stream pauses.
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
      // The coast was recognised ON this event: the ONE honest moment to decide, and
      // the whole reason the phase detector exists. This delta belongs to the device,
      // so it is not added; the decision is made from where the hand left the track.
      if (fed.read.released) {
        const x = trackAt(w.slide0, w.x, ctx)
        const vx = -fed.read.velocity.x
        const d = slideCommit(x, vx, ctx.band.w, ctx.can)
        effects.push(d === 0 ? { kind: "home", vx } : { kind: "step", d, vx })
        return { session: { ...w, axis: "pass" }, effects }
      }
      // Still coasting after that: nothing a person did, so nothing moves.
      if (fed.read.momentum) return { session: w, effects }
      // Under the fingers: raw px, no per-tick bound, the track goes where they go.
      w = { ...w, x: w.x - rawX }
      effects.push({ kind: "slide", x: trackAt(w.slide0, w.x, ctx) })
      return { session: w, effects }
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
  /** The slide axis ended without ever coasting: decide on where it was left. */
  | { kind: "slide"; d: -1 | 0 | 1; vx: number }

/** The stream stopped. Most axes wait for this; the slide axis normally decided long
 *  before, the instant the hand let go, and only lands here when the fingers were
 *  lifted so gently that the device never coasted at all. */
export function wheelRelease(
  w: WheelSession,
  ctx: Pick<WheelCtx, "pose" | "fitted" | "band"> & WheelCtx,
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
    case "x": {
      const x = trackAt(w.slide0, w.x, ctx)
      const vx = -w.phase.velocity.x
      return { kind: "slide", d: slideCommit(x, vx, ctx.band.w, ctx.can), vx }
    }
    default: {
      const never: never = w.axis
      throw new Error(`lightbox: wheel axis ${String(never)}`)
    }
  }
}
