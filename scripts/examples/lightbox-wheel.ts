// Runnable example: `bun scripts/examples/lightbox-wheel.ts` feeds wheel sessions to
// the reducer: a trackpad's inertia tail, a hand, a flick that steps, a ctrl zoom
// that rubbers under fit and never dismisses. The lib stays free of any runtime.
import {
  assert,
  FIT,
  MOMENTUM,
  SLIDE_GAP,
  WHEEL_TICK_MAX,
} from "../../registry/base-nova/lib/lightbox-motion"
import {
  type WheelCtx,
  type WheelEffect,
  type WheelInput,
  type WheelSession,
  wheelRelease,
  wheelTick,
} from "../../registry/base-nova/lib/lightbox-wheel"

const band = { top: 0, left: 0, w: 1000, h: 700 }
const fitted = { w: 800, h: 600 }
const atFit = { ...FIT, p: 1 }
const ctx = (over: Partial<WheelCtx> = {}): WheelCtx => ({
  pose: atFit,
  slideX: 0,
  fitted,
  band,
  zoomMax: 3,
  can: { prev: true, next: true },
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
    for (const e of next.effects) {
      if (e.kind === "pose") cur = { ...cur, pose: e.pose }
      if (e.kind === "slide") cur = { ...cur, slideX: e.x }
    }
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
  assert(kinds(r.effects) === "grab,drop,pose,pose", kinds(r.effects))
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

// Horizontal: the track follows, bounded per tick (a mouse notch of 100 px nudges
// WHEEL_TICK_MAX), rubbers past the neighbour's slot, and a fast release steps once
// then passes.
{
  const one = run([tick(100, 0, 0)], ctx())
  assert(kinds(one.effects) === "grab,slide", kinds(one.effects))
  assert(
    one.ctx.slideX === -WHEEL_TICK_MAX,
    `a notch is a nudge ${one.ctx.slideX}`,
  )
  const inputs = Array.from({ length: 40 }, (_, i) => tick(30, 0, i * 8))
  const r = run(inputs, ctx())
  const steps = r.effects.filter((e) => e.kind === "step")
  assert(
    steps.length === 1 && r.session?.axis === "pass",
    "one step, then pass",
  )
  const step = steps[0] as Extract<WheelEffect, { kind: "step" }>
  assert(step.d === 1 && step.vx < 0, "a leftward drag steps next")
  const slides = r.effects.filter((e) => e.kind === "slide") as Extract<
    WheelEffect,
    { kind: "slide" }
  >[]
  for (const s of slides)
    assert(Math.abs(s.x) <= band.w + SLIDE_GAP + 1, `inside the slot ${s.x}`)
}
// No neighbour that way: the track gives a third of the motion and never commits.
{
  const inputs = Array.from({ length: 40 }, (_, i) => tick(-30, 0, i * 8))
  const r = run(inputs, ctx({ can: { prev: false, next: true } }))
  assert(
    r.effects.every((e) => e.kind !== "step"),
    "no step without a neighbour",
  )
  assert(r.ctx.slideX > 0 && r.ctx.slideX < 0.35 * 40 * 30 + 1, "a third")
  const rel = wheelRelease(r.session as WheelSession, r.ctx)
  assert(rel.kind === "home", "slide home at silence")
}
// A committed flick is followed by the device's inertia tail, which must be
// swallowed (it would step again), while a SECOND deliberate swipe inside that tail
// must be heard. The tail only decays; a hand pushes.
{
  const flick = Array.from({ length: 40 }, (_, i) => tick(30, 0, i * 8))
  const r = run(flick, ctx())
  assert(r.session?.axis === "pass", "committed, now passing")
  // 600 ms of decaying tail: swallowed whole, no second step.
  let s: WheelSession | null = r.session
  let steps = 0
  let t = 400
  for (let d = 28; d > 1; d = d * 0.9, t += 8) {
    const out = wheelTick(s, tick(d, 0, t), ctx())
    s = out.session
    steps += out.effects.filter((e) => e.kind === "step").length
  }
  assert(
    steps === 0 && s?.axis === "pass",
    `the tail is swallowed: ${steps} steps`,
  )
  // A real swipe arrives inside that tail: it leaps back over the dregs, so the
  // very first tick of it opens a fresh session on the settled track.
  const woke = wheelTick(s, tick(6, 0, t), ctx())
  assert(
    woke.session?.axis === "x",
    `a new hand reawakens: ${woke.session?.axis}`,
  )
  assert(
    woke.session?.slide0 === 0,
    "the fresh session grabs the settled track",
  )
  assert(kinds(woke.effects) === "grab,slide", kinds(woke.effects))
  // And it goes on to step, as a swipe should: the tail never cost the user a slide.
  let again: WheelSession | null = woke.session
  let stepped = 0
  for (const [i, d] of [18, 30, 30, 30].entries()) {
    const out = wheelTick(again, tick(d, 0, t + 8 + i * 8), ctx())
    again = out.session
    stepped += out.effects.filter((e) => e.kind === "step").length
  }
  assert(stepped === 1, `the second swipe steps once: ${stepped}`)
}
// The tail's last dregs never reawaken a session, however ragged they read.
{
  const passing: WheelSession = {
    axis: "pass",
    live: true,
    ticks: [],
    x: 0,
    y: 0,
    grab: atFit,
    raw0: { x: 0, y: 0 },
    slide0: 0,
    zoom: 1,
    samples: [],
    last: 0,
    at: { x: 0, y: 0 },
  }
  let s: WheelSession | null = passing
  for (const [i, d] of [3, 1, 2, 1, 3, 2].entries())
    s = wheelTick(s, tick(d, 0, i * 8), ctx()).session
  assert(s?.axis === "pass", "dregs under the hand floor stay swallowed")
}
console.log(
  "slide follows, steps once, refuses without a neighbour, tail swallowed",
)

// ctrl + wheel is zoom: up zooms in at the cursor, the accumulator rubbers past the
// ceiling and under fit, and the release under fit springs to fit (a wheel never
// dismisses); over fit it hands off to the zoom release at the cursor.
{
  const inn = run(
    Array.from({ length: 20 }, (_, i) => tick(0, -5, i * 8, true)),
    ctx(),
  )
  assert(kinds(inn.effects).startsWith("grab,drop,pose"), kinds(inn.effects))
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
    r.session?.axis === "pan" && kinds(r.effects).startsWith("grab,drop,pose"),
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
