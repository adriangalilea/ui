// Runnable example: `bun scripts/examples/lightbox-gesture.ts` drives the pointer
// state machine: a tap, a drag that dismisses, one that springs home, an axis lock
// and its relock, a pan flick, a pinch to close and a pinch to zoom, and the tap
// ladder for a mouse and for a finger. The lib stays free of any runtime.
import {
  type Gesture,
  type GestureCtx,
  type GestureEffect,
  gestureDown,
  gestureMove,
  gestureUp,
  type PointerInput,
  tapIntent,
} from "../../registry/base-nova/lib/lightbox-gesture"
import {
  assert,
  DOUBLE_TOUCH,
  FIT,
  INTENT,
  OVERSHOOT_MAX,
  PAN_INSET,
  panBounds,
  RELOCK,
  TAP_TRAVEL,
} from "../../registry/base-nova/lib/lightbox-motion"

const band = { top: 0, left: 0, w: 1000, h: 700 }
const fitted = { w: 800, h: 600 }
const atFit = { ...FIT, p: 1 }
const ctx = (over: Partial<GestureCtx> = {}): GestureCtx => ({
  pose: atFit,
  fitted,
  band,
  zoomMax: 3,
  vh: 900,
  frame: false,
  ...over,
})
const at = (x: number, y: number) => ({ x: x - 500, y: y - 350 })
const pt = (
  x: number,
  y: number,
  t: number,
  over: Partial<PointerInput> = {},
): PointerInput => ({
  id: 1,
  x,
  y,
  at: at(x, y),
  t,
  type: "touch",
  onMedia: true,
  ...over,
})
const last = (effects: GestureEffect[], kind: GestureEffect["kind"]) =>
  [...effects].reverse().find((e) => e.kind === kind)
const kinds = (effects: GestureEffect[]) => effects.map((e) => e.kind).join(",")

/** A whole one-finger gesture: down, moves along a path, up. The ctx follows the
 *  pose effects, the way the binder writes them. */
const swipe = (
  path: readonly [number, number][],
  c: GestureCtx,
  over: Partial<PointerInput> = {},
  dt = 16,
) => {
  const [x0, y0] = path[0] as [number, number]
  const down = gestureDown(null, pt(x0, y0, 0, over), c)
  let g: Gesture = down.gesture
  let cur = c
  const effects: GestureEffect[] = [...down.effects]
  path.slice(1).forEach(([x, y], i) => {
    const moved = gestureMove(g, pt(x, y, (i + 1) * dt, over), cur)
    g = moved.gesture
    effects.push(...moved.effects)
    for (const e of moved.effects)
      if (e.kind === "pose") cur = { ...cur, pose: e.pose }
  })
  const [lx, ly] = path[path.length - 1] as [number, number]
  const release = gestureUp(g, pt(lx, ly, path.length * dt, over), cur)
  return { gesture: g, effects, ctx: cur, release }
}

// A finger that lands and lifts without travelling is a tap: no effect moved
// anything, and the release carries the point.
{
  const r = swipe(
    [
      [500, 350],
      [501, 351],
    ],
    ctx(),
  )
  assert(r.release.kind === "tap", `tap, got ${r.release.kind}`)
  assert(
    !r.effects.some((e) => e.kind === "pose" || e.kind === "scroll"),
    "a tap moves nothing",
  )
  const far = swipe(
    [
      [500, 350],
      [500 + TAP_TRAVEL + 30, 350],
    ],
    ctx(),
  )
  assert(far.release.kind !== "tap", "travel past TAP_TRAVEL is a drag")
}

// A slow vertical drag at fit: nothing until INTENT, then the y axis locks, the
// image follows the finger and dims, and a release too slow to commit (the finger
// rests before lifting, so it carries no momentum) cancels home.
{
  const r = swipe(
    [
      [500, 350],
      [502, 353],
      [500, 380],
      [500, 420],
      [500, 420],
    ],
    ctx(),
    {},
    120,
  )
  assert(r.gesture.axis === "y", `y locked, got ${r.gesture.axis}`)
  const p = r.ctx.pose
  assert(
    p.y === 70 && p.s < 1 && p.p < 1,
    `follows: y ${p.y} s ${p.s} p ${p.p}`,
  )
  assert(r.release.kind === "cancel", `cancel, got ${r.release.kind}`)
}
// A hard flick down commits the dismiss.
{
  const path: [number, number][] = [
    [500, 300],
    [500, 340],
    [500, 420],
    [500, 520],
    [500, 640],
  ]
  const r = swipe(path, ctx())
  assert(r.release.kind === "exit", `exit, got ${r.release.kind}`)
  assert(r.release.kind === "exit" && r.release.vel.y > 0, "downward velocity")
}
// Under INTENT nothing locks and the release resumes whatever was flying.
{
  const r = swipe(
    [
      [500, 350],
      [500 + INTENT - 2, 351],
      [500 + INTENT + 4, 351],
    ],
    ctx(),
  )
  assert(r.gesture.axis === "x", "past INTENT the x axis locks")
}
console.log("tap, vertical drag, dismiss commit, intent")

// Horizontal is the SCROLL CONTAINER's. A finger never reaches this branch at all
// (touch-action hands horizontal panning to the browser); a mouse does, and it drags
// the scroller by exactly what it moved, so the platform's own snap decides where it
// lands. The release hands it straight back.
{
  const r = swipe(
    [
      [500, 350],
      [460, 350],
      [380, 350],
      [260, 350],
    ],
    ctx(),
  )
  assert(r.gesture.axis === "x", "x locked")
  const dragged = r.effects
    .filter((e) => e.kind === "scroll")
    .reduce((sum, e) => sum + (e as { dx: number }).dx, 0)
  assert(dragged === -240, `the scroller is dragged 1:1: ${dragged}`)
  assert(
    r.effects.every((e) => e.kind !== "pose"),
    "and the image itself never moves",
  )
  assert(r.release.kind === "snap", `snap, got ${r.release.kind}`)
}
// An x drag that turns sharply vertical relocks to y and unposes the image back to
// the grab; the reverse relock syncs the flight first.
{
  const r = swipe(
    [
      [500, 350],
      [440, 350],
      [430, 350 + RELOCK + 20],
    ],
    ctx(),
  )
  assert(r.gesture.axis === "y", `relocked to y, got ${r.gesture.axis}`)
  assert(
    kinds(r.effects).includes("sync"),
    "the flight is read before the y drag",
  )
}
console.log("slide follows, steps, relocks")

// Zoomed, one finger pans: the grab is the rubbered pose, the drag offsets it, and a
// flick coasts with a target clamped inside the bounds.
{
  const zoomed = { x: 0, y: 0, s: 2, p: 1 }
  const r = swipe(
    [
      [500, 350],
      [480, 340],
      [420, 300],
      [300, 220],
    ],
    ctx({ pose: zoomed }),
  )
  assert(
    r.gesture.mode === "pan" && r.gesture.axis === null,
    "a pan has no axis",
  )
  assert(r.ctx.pose.x === -200 && r.ctx.pose.y === -130, "moves on both axes")
  assert(r.release.kind === "coast", `coast, got ${r.release.kind}`)
  if (r.release.kind === "coast") {
    const b = (fitted.w * 2 - band.w) / 2 + PAN_INSET
    assert(Math.abs(r.release.target.x) <= b + 1e-9, "clamped inside the bound")
    assert(
      r.release.coast.x < r.release.target.x,
      "the wall cut the coast short",
    )
  }
}
console.log("pan follows both axes, flick coasts to a clamped target")

// Two fingers: the pinch is opened by the second down (after a sync), follows the
// spread, and closes when it is let go small enough.
{
  const two = (a: [number, number], b: [number, number], t: number) => {
    const mid = { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }
    return { mid: at(mid.x, mid.y), t }
  }
  const c = ctx()
  const one = gestureDown(null, pt(400, 350, 0), c)
  const both = gestureDown(
    one.gesture,
    { ...pt(600, 350, 1, { id: 2 }), ...two([400, 350], [600, 350], 1) },
    c,
  )
  assert(both.gesture.pinched && both.gesture.pinch?.d0 === 200, "pinch opened")
  assert(kinds(both.effects).includes("sync"), "the flight is read first")
  // One finger walks out to 200: the fingers are 400 px apart, twice the distance
  // they opened at, so the scale is twice the one they opened at.
  let g = both.gesture
  let cur = c
  const spread = gestureMove(
    g,
    { ...pt(200, 350, 20, { id: 1 }), ...two([200, 350], [600, 350], 20) },
    cur,
  )
  g = spread.gesture
  const posed = last(spread.effects, "pose")
  assert(
    posed?.kind === "pose" && Math.abs(posed.pose.s - 2) < 1e-9,
    `2x spread: ${posed?.kind === "pose" ? posed.pose.s : "no pose"}`,
  )
  cur = { ...cur, pose: (posed as { pose: typeof atFit }).pose }
  const up = gestureUp(g, pt(200, 350, 40, { id: 1 }), cur)
  assert(up.kind === "hold", "one finger left: the gesture regrabs")
  const upTwo = gestureUp(
    (up as { gesture: Gesture }).gesture,
    pt(600, 350, 41, { id: 2 }),
    cur,
  )
  assert(upTwo.kind === "zoom", `pinch out releases into a zoom: ${upTwo.kind}`)
}
// A pinch in from fit follows the fingers, dims the room, and closes on release.
{
  const c = ctx()
  const mid = { mid: at(500, 350) }
  const one = gestureDown(null, pt(400, 350, 0), c)
  const both = gestureDown(
    one.gesture,
    { ...pt(600, 350, 1, { id: 2 }), ...mid },
    c,
  )
  const pinched = gestureMove(
    both.gesture,
    { ...pt(470, 350, 20, { id: 1 }), ...mid },
    c,
  )
  const posed = last(pinched.effects, "pose")
  assert(posed?.kind === "pose", "the pinch poses")
  const pose = (posed as { pose: typeof atFit }).pose
  // 130 px apart where they opened at 200: the scale follows the fingers exactly,
  // and the room dims with it (pinchProgress).
  assert(
    Math.abs(pose.s - 0.65) < 1e-9 && Math.abs(pose.p - 0.58) < 1e-9,
    `follows in: s ${pose.s} p ${pose.p}`,
  )
  const cur = { ...c, pose }
  const g = gestureUp(pinched.gesture, pt(470, 350, 40, { id: 1 }), cur)
  const done = gestureUp(
    (g as { gesture: Gesture }).gesture,
    pt(530, 350, 41, { id: 2 }),
    cur,
  )
  assert(done.kind === "exit", `a small pinch closes: ${done.kind}`)
}
// A pinch that zooms OUT shrinks the bounds under the pan it is carrying. The pose it
// leaves has to stay inside what the band can express, or the next finger down asks
// `rawPan` to undo a rubbering that never happened. That threw out of `gestureDown`,
// and a thrown `gestureDown` wedges every touch after it: iOS Safari, dead lightbox.
{
  const c = ctx({ pose: { x: -255, y: -180, s: 2.4, p: 1 } })
  const mid = { mid: at(300, 200) }
  const one = gestureDown(null, pt(200, 200, 0), c)
  const both = gestureDown(
    one.gesture,
    { ...pt(400, 200, 1, { id: 2 }), ...mid },
    c,
  )
  // Fingers close right in, and the midpoint walks a long way off centre with them:
  // 2.4 down to 1.20, where the x bound has collapsed to nothing. Unbounded this
  // leaves the pose 373 px past a bound of 0, against a band that can express 96.
  const out = gestureMove(
    both.gesture,
    { ...pt(300, 200, 20, { id: 1 }), mid: at(900, 690) },
    c,
  )
  const posed = last(out.effects, "pose")
  assert(posed?.kind === "pose", "the pinch poses")
  const pose = (posed as { pose: typeof atFit }).pose
  const b = panBounds(pose, c.fitted, c.band)
  assert(
    Math.abs(pose.x) - b.x < OVERSHOOT_MAX &&
      Math.abs(pose.y) - b.y < OVERSHOOT_MAX,
    `a zoom-out pinch left the pose past what the band can express: ${pose.x},${pose.y} against ${b.x},${b.y}`,
  )
  // The proof that matters: a third finger on that pose does not throw.
  const third = gestureDown(out.gesture, pt(500, 500, 30, { id: 3 }), {
    ...c,
    pose,
  })
  assert(
    third.gesture !== null,
    "a finger down after a zoom-out pinch survives",
  )
}
console.log("pinch opens, follows, zooms out under its own bounds, closes")

// The tap ladder. A mouse: one click zooms, the second click of a double click is
// the same intent already served. A finger: one tap waits for the chrome, two zoom.
{
  const media = { onMedia: true }
  const image = { pose: atFit, kind: "image" }
  const mouse = { at: at(500, 350), x: 500, y: 350, t: 0, type: "mouse" }
  const one = tapIntent(null, mouse, media, image)
  assert(one.intents[0]?.kind === "zoom" && one.last !== null, "a click zooms")
  const two = tapIntent(one.last, { ...mouse, t: 200 }, media, image)
  assert(
    two.intents[0]?.kind === "settle" && two.last === null,
    "the second click settles",
  )
  const finger = { at: at(500, 350), x: 500, y: 350, t: 0, type: "touch" }
  const tap1 = tapIntent(null, finger, media, image)
  assert(
    tap1.intents[0]?.kind === "wait" && tap1.intents[1]?.kind === "settle",
    `one tap waits: ${tap1.intents.map((i) => i.kind).join(",")}`,
  )
  const tap2 = tapIntent(
    tap1.last,
    { ...finger, t: DOUBLE_TOUCH - 50 },
    media,
    image,
  )
  assert(tap2.intents[0]?.kind === "zoom", "two taps zoom")
  const late = tapIntent(
    tap1.last,
    { ...finger, t: DOUBLE_TOUCH + 50 },
    media,
    image,
  )
  assert(late.intents[0]?.kind === "wait", "a late second tap is a first tap")
  // Zoomed, a finger's tap only settles: the chrome stays where it is.
  const zoomed = tapIntent(null, finger, media, {
    pose: { ...atFit, s: 2 },
    kind: "image",
  })
  assert(
    zoomed.intents.length === 1 && zoomed.intents[0]?.kind === "settle",
    "zoomed, a tap settles",
  )
  // The backdrop at fit escapes; a video or a frame keeps its own tap.
  const back = tapIntent(null, finger, { onMedia: false }, image)
  assert(back.intents[0]?.kind === "escape", "the backdrop escapes")
  const video = tapIntent(null, finger, media, { pose: atFit, kind: "video" })
  assert(video.intents[0]?.kind === "settle", "a video keeps its tap")
}
console.log(
  "tap ladder: click zooms, one tap waits, two zoom, backdrop escapes",
)
