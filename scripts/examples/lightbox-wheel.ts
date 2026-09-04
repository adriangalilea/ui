// Runnable example: `bun scripts/examples/lightbox-wheel.ts` feeds wheel sessions to
// the reducer: a trackpad's inertia tail, a hand, a flick that steps, a ctrl zoom
// that rubbers under fit and never dismisses. The lib stays free of any runtime.
import {
  assert,
  FIT,
  MOMENTUM,
} from "../../registry/base-nova/lib/lightbox-motion"
import {
  type WheelCtx,
  type WheelEffect,
  type WheelInput,
  type WheelSession,
  wheelAxisOf,
  wheelIsTrackable,
  wheelRelease,
  wheelTick,
} from "../../registry/base-nova/lib/lightbox-wheel"

const band = { top: 0, left: 0, w: 1000, h: 700 }
const fitted = { w: 800, h: 600 }
const atFit = { ...FIT, p: 1 }
const ctx = (over: Partial<WheelCtx> = {}): WheelCtx => ({
  pose: atFit,
  fitted,
  band,
  zoomMax: 3,
  vh: 900,
  frame: false,
  ...over,
})
const tick = (
  dx: number,
  dy: number,
  now: number,
  ctrl = false,
): WheelInput => ({
  deltaX: dx,
  deltaY: dy,
  deltaMode: 0,
  ctrl,
  at: { x: 0, y: 0 },
  now,
})
const kinds = (effects: WheelEffect[]) => effects.map((e) => e.kind).join(",")
/** Runs a list of ticks through one session, applying pose effects to the ctx the
 *  way the binder does, and returns the session plus every effect. */
const run = (
  inputs: WheelInput[],
  c: WheelCtx,
): { session: WheelSession | null; effects: WheelEffect[]; ctx: WheelCtx } => {
  let session: WheelSession | null = null
  let cur = c
  const all: WheelEffect[] = []
  for (const input of inputs) {
    const next = wheelTick(session, input, cur)
    session = next.session
    all.push(...next.effects)
    for (const e of next.effects)
      if (e.kind === "pose") cur = { ...cur, pose: e.pose }
  }
  return { session, effects: all, ctx: cur }
}

// A coast still running when the lightbox opens sends decaying vertical ticks: three
// of them pass the session, nothing moves, and silence decides nothing.
{
  const r = run([tick(0, 120, 0), tick(0, 80, 16), tick(0, 50, 32)], ctx())
  assert(r.session?.axis === "pass" && r.effects.length === 0, "tail passed")
  assert(
    wheelRelease(r.session, ctx()).kind === "none",
    "a pass decides nothing",
  )
}
// A slow hand at fit: the first three ticks are not decaying, so the third applies
// and the fourth follows. The image follows the fingers (y offsets, s and p shrink)
// with the grab taken at the first applied tick; too slow to commit, silence
// springs it home with the hand's velocity.
{
  const r = run(
    [tick(0, -4, 0), tick(0, -5, 16), tick(0, -5, 32), tick(0, -5, 48)],
    ctx(),
  )
  assert(
    r.session?.axis === "y" && r.session.live,
    `hand accepted: ${r.session?.axis}`,
  )
  assert(kinds(r.effects) === "grab,pose,pose", kinds(r.effects))
  const p = r.ctx.pose
  assert(
    p.y === 10 && p.s < 1 && p.p < 1,
    `follows: y ${p.y} s ${p.s} p ${p.p}`,
  )
  const rel = wheelRelease(r.session, r.ctx)
  assert(rel.kind === "cancel" && rel.vel.y > 0, "cancel with velocity")
}
// A hard vertical flick commits the dismiss the moment the projection crosses the
// rule, the tail passes, and a tick in the tail moves nothing.
{
  const inputs = Array.from({ length: 12 }, (_, i) => tick(0, -60, i * 8))
  const r = run(inputs, ctx())
  assert(
    r.session?.axis === "dead",
    `the lightbox is leaving: ${r.session?.axis}`,
  )
  const exits = r.effects.filter((e) => e.kind === "exit")
  assert(exits.length === 1, `one exit, got ${exits.length}`)
  const lastPose = r.effects.filter((e) => e.kind === "pose").length
  assert(lastPose < inputs.length, "ticks after the commit move nothing")
}
console.log("inertia tail passed, hand accepted, dismiss commits once")

// A sideways wheel at fit is the TRACK's, and the track is a real scroll container.
// No session opens, nothing is reported, and the binder leaves the event alone so
// the browser scrolls, snaps and carries the momentum itself.
{
  const sideways = tick(30, 0, 0)
  assert(wheelIsTrackable(sideways, ctx()), "at fit, the track may have it")
  // Zoomed, the same event pans the image: the track must not steal it.
  const zoomed = ctx({ pose: { ...atFit, s: 2 } })
  assert(!wheelIsTrackable(sideways, zoomed), "zoomed, sideways pans the image")
  assert(
    wheelTick(null, sideways, zoomed).session?.axis === "pan",
    "which is the pan axis",
  )
  // ctrl is always a zoom, whichever way it points.
  assert(
    !wheelIsTrackable(tick(30, 0, 0, true), ctx()),
    "ctrl is a zoom, never the track",
  )
}
// The axis comes from the TRAVEL and is undecided until there is enough of it. One
// event of a two-finger swipe says almost nothing, which is how horizontal swipes
// were being handed to the dismiss and back at random.
{
  assert(wheelAxisOf({ x: 3, y: 2 }) === null, "too small to have a direction")
  assert(wheelAxisOf({ x: 40, y: 6 }) === "x", "sideways is the track's")
  assert(wheelAxisOf({ x: 2, y: 40 }) === "y", "clearly down is the dismiss")
  // A swipe that drifts is still a swipe: sideways is the common verb, so vertical
  // has to win outright, not by a nose.
  assert(
    wheelAxisOf({ x: 20, y: 24 }) === "x",
    "a drifting swipe stays a swipe",
  )
  assert(
    wheelAxisOf({ x: 20, y: 40 }) === "y",
    "a real drag down is a drag down",
  )
}
console.log("the track's when trackable, and only once the travel has said so")
// ctrl + wheel is zoom: up zooms in at the cursor, the accumulator rubbers past the
// ceiling and under fit, and the release under fit springs to fit (a wheel never
// dismisses); over fit it hands off to the zoom release at the cursor.
{
  const inn = run(
    Array.from({ length: 20 }, (_, i) => tick(0, -5, i * 8, true)),
    ctx(),
  )
  assert(kinds(inn.effects).startsWith("grab,pose"), kinds(inn.effects))
  assert(
    Math.abs(inn.ctx.pose.s - Math.E) < 1e-9,
    `100 px of ctrl wheel is e×: ${inn.ctx.pose.s}`,
  )
  assert(
    wheelRelease(inn.session as WheelSession, inn.ctx).kind === "zoom",
    "over fit: zoom release",
  )
  const over = run(
    Array.from({ length: 20 }, (_, i) => tick(0, -10, i * 8, true)),
    ctx(),
  )
  assert(
    over.ctx.pose.s > 3 && over.ctx.pose.s < 3.5,
    `stiff past the ceiling: ${over.ctx.pose.s}`,
  )
  const out = run(
    Array.from({ length: 30 }, (_, i) => tick(0, 5, i * 8, true)),
    ctx(),
  )
  assert(
    out.ctx.pose.s < 1 && out.ctx.pose.s > 0.8,
    `rubbered ${out.ctx.pose.s}`,
  )
  assert(out.ctx.pose.p === 1, "zoom never dims the room")
  assert(
    wheelRelease(out.session as WheelSession, out.ctx).kind === "fit",
    "under fit: back to fit, never a dismiss",
  )
  const frame = wheelTick(null, tick(0, -30, 0, true), ctx({ frame: true }))
  assert(
    frame.session === null && frame.effects.length === 0,
    "a frame refuses zoom",
  )
}
// Zoomed: a plain wheel pans from the grab, rubbering past the bounds, and silence
// clamps back inside.
{
  const zoomed = { x: 0, y: 0, s: 2, p: 1 }
  const inputs = Array.from({ length: 60 }, (_, i) => tick(30, 0, i * 8))
  const r = run(inputs, ctx({ pose: zoomed }))
  assert(
    r.session?.axis === "pan" && kinds(r.effects).startsWith("grab,pose"),
    `pan session: ${kinds(r.effects).slice(0, 40)}`,
  )
  const bound = (fitted.w * 2 - band.w) / 2
  assert(
    r.ctx.pose.x < -bound && r.ctx.pose.x > -bound - 0.35 * 60 * 30,
    "rubbered",
  )
  const rel = wheelRelease(r.session, r.ctx)
  assert(rel.kind === "pan" && rel.target.x === -bound, "clamped at silence")
}
console.log(
  `zoom rubbers and never dismisses, pan clamps · MOMENTUM ${MOMENTUM}`,
)
