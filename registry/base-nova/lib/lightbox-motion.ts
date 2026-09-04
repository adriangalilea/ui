// The lightbox's math, framework-free: geometry (fit, source view, stage band), the
// gesture rules (zoom at a point, rubber, pan bounds, momentum, commit tests) and one
// interruptible spring. Numbers in, numbers out; the component owns the DOM and the
// clock. `bun scripts/examples/lightbox-motion.ts` exercises every invariant.

export type View = { x: number; y: number; s: number }
export type Size = { w: number; h: number }
export type Rect = {
  x: number
  y: number
  w: number
  h: number
  radius: number
}
export type Band = { top: number; left: number; w: number; h: number }
export type Point = { x: number; y: number }
export type Tuning = { zeta: number; f: number }
/** One tuning for every axis, or one per axis: a flick that coasts on x while y
 *  bounces off a wall runs COAST and MACHINE side by side. */
export type Tunings<K extends string> = Tuning | Readonly<Record<K, Tuning>>

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`lightbox: ${msg}`)
}

/** Machine moves: enter, exit, zoom, pan recovery, step. */
export const MACHINE: Tuning = { zeta: 1, f: 4.5 }
/** Hand releases: dismiss cancel, slide commit. A little weight. */
export const HAND: Tuning = { zeta: 0.82, f: 4.5 }
/** A key step: brisk, the reader already knows where they are going. */
export const QUICK: Tuning = { zeta: 1, f: 7 }
/** Reduced motion: the target is assumed at once. */
export const STILL: Tuning = { zeta: 1, f: Infinity }

export const FIT: View = { x: 0, y: 0, s: 1 }
/** Exit target when the trigger left the page: a cut, never an abort. */
export const GONE: View = { x: 0, y: 0, s: 0.92 }

export const SLIDE_GAP = 32
export const MOMENTUM = 199
/** A free coast after a flick: the projected rest is `v · MOMENTUM` away, and a
 *  critically damped spring whose ω = 1/MOMENTUM is the exact exponential decay that
 *  projection assumes, so the hand's velocity is never exceeded. A stiffer spring
 *  aimed that far away accelerates first (2.1x the release speed with MACHINE). */
export const COAST: Tuning = { zeta: 1, f: 1000 / (2 * Math.PI * MOMENTUM) }
export const INTENT = 6
export const RELOCK = 12
export const OVERSHOOT = 0.35
export const TAP_TRAVEL = 4
export const DISMISS_COMMIT = 0.4
export const PINCH_CLOSE = 0.75
export const PINCH_PASSED = 1.067
export const SLIDE_VELOCITY = 0.5
/** A held arrow pans at this speed (px per ms); two arrows add up to a diagonal. */
export const KEY_PAN_SPEED = 0.9
export const WHEEL_SILENCE = 150
export const WHEEL_GUARD = 400
export const WHEEL_ZOOM = 0.01
/** One wheel event moves at most this many px: a mouse notch (100 px in Chrome) is a
 *  nudge, a trackpad tick (1-30 px) is untouched. Bounds ctrl+wheel zoom to 1.35x. */
export const WHEEL_TICK_MAX = 30
/** A finger still for this long before lifting has no momentum. */
export const STOP_GAP = 50
/** Release velocity is the mean over this span; a gesture keeps SAMPLES points,
 *  enough to cover it at 120 Hz. */
export const VELOCITY_WINDOW = 100
export const SAMPLES = 12
/** Flights are sampled ahead at this period; a compositor plays the table. */
export const FLIGHT_DT = 1000 / 60
export const DOUBLE_TOUCH = 300
export const DOUBLE_MOUSE = 500
export const DOUBLE_TRAVEL = 24
export const SETTLE_LIMIT = 2000
export const MAX_DT = 32

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

/** A media box is finite and positive on both axes; anything else is a lie. */
export function assertSize(size: Size): void {
  assert(
    Number.isFinite(size.w) && size.w > 0,
    `width must be finite > 0, got ${size.w}`,
  )
  assert(
    Number.isFinite(size.h) && size.h > 0,
    `height must be finite > 0, got ${size.h}`,
  )
}

/** Contain `natural` inside `band` less `inset` on every side, never upscaled. */
export function fit(natural: Size, band: Band, inset = 0): Size {
  assertSize(natural)
  const k = Math.min(
    1,
    (band.w - 2 * inset) / natural.w,
    (band.h - 2 * inset) / natural.h,
  )
  return { w: natural.w * k, h: natural.h * k }
}

export type SourceView = {
  view: View
  /** Local-px inset that turns the fit box into the trigger's cover crop. */
  clip: Size
  /** Local-px corner radius matching the trigger's. */
  radius: number
}

/** The view that lays the fit box over the trigger's live rect, cover-fashion. `view`
 *  is relative to the band center; clip and radius are in the layer's own px (before
 *  scale). Identity when the aspects match: clip is zero. */
export function sourceView(rect: Rect, fitted: Size, band: Band): SourceView {
  assert(rect.w > 0 && rect.h > 0, "trigger has a zero rect")
  const cover = Math.max(rect.w / fitted.w, rect.h / fitted.h)
  return {
    view: {
      x: rect.x + rect.w / 2 - (band.left + band.w / 2),
      y: rect.y + rect.h / 2 - (band.top + band.h / 2),
      s: cover,
    },
    clip: {
      w: (fitted.w * cover - rect.w) / 2 / cover,
      h: (fitted.h * cover - rect.h) / 2 / cover,
    },
    radius: rect.radius / cover,
  }
}

/** Rescale so the point `at` (relative to the band center) stays under the finger. */
export function zoomAt(view: View, s: number, at: Point): View {
  const k = s / view.s
  return { x: at.x - (at.x - view.x) * k, y: at.y - (at.y - view.y) * k, s }
}

/** Zoom rubber: soft under `min`, stiff over `max`. */
export function rubber(raw: number, min: number, max: number): number {
  if (raw < min) return min - 0.15 * (min - raw)
  if (raw > max) return max + 0.05 * (raw - max)
  return raw
}

/** Pan bound per axis: half the overflow of the scaled fit past the band. */
export function panBounds(view: View, fitted: Size, band: Band): Point {
  return {
    x: Math.max(0, (fitted.w * view.s - band.w) / 2),
    y: Math.max(0, (fitted.h * view.s - band.h) / 2),
  }
}

/** Pan overshoot while the finger is down: the excess past the bound × 0.35. */
export function overshoot(value: number, bound: number): number {
  if (value > bound) return bound + (value - bound) * OVERSHOOT
  if (value < -bound) return -bound + (value + bound) * OVERSHOOT
  return value
}
/** The exact inverse: a grab taken past the bound (mid-bounce, or a rubbered wheel
 *  pan) is read back to the raw offset it rubbered from, so a drag that offsets the
 *  raw grab and rubbers the sum is continuous at dx = 0. */
export function unovershoot(value: number, bound: number): number {
  if (value > bound) return bound + (value - bound) / OVERSHOOT
  if (value < -bound) return -bound + (value + bound) / OVERSHOOT
  return value
}

export function clampPan(view: View, fitted: Size, band: Band): View {
  const b = panBounds(view, fitted, band)
  return { x: clamp(view.x, -b.x, b.x), y: clamp(view.y, -b.y, b.y), s: view.s }
}

/** Where a flick comes to rest on its own. */
export function project(position: number, velocity: number): number {
  return position + velocity * MOMENTUM
}

/** A wheel event's delta in px: lines and pages become px. Unbounded, so the inertia
 *  guard sees the tick the device sent. */
export function wheelPx(
  delta: number,
  deltaMode: number,
  pageH: number,
): number {
  const k = deltaMode === 1 ? 16 : deltaMode === 2 ? pageH : 1
  return delta * k
}
/** One tick's motion: bounded, so a mouse notch is a nudge. */
export function wheelTick(px: number): number {
  return clamp(px, -WHEEL_TICK_MAX, WHEEL_TICK_MAX)
}

/** Vertical dismiss drag at fit: the room re-lights over a third of the viewport. */
export function dragScale(y: number, vh: number): number {
  return 1 - 0.2 * Math.min(1, Math.abs(y) / (vh / 3))
}
export function dragProgress(y: number, vh: number): number {
  return 1 - Math.min(1, Math.abs(y) / (vh / 3))
}
/** Pinch under fit: the room is fully out at s = 1/1.2. */
export function pinchProgress(s: number): number {
  return clamp(1 - (1 - s) * 1.2, 0, 1)
}

export function dismissCommit(y: number, vy: number, vh: number): boolean {
  return Math.abs(project(y, vy)) / (vh / 3) > DISMISS_COMMIT
}

/** Which neighbours exist around `index`: every wrap rule in one place. */
export function neighbours(
  index: number,
  count: number,
  loop: boolean,
): { prev: boolean; next: boolean } {
  assert(index >= 0 && index < count, `index ${index} of ${count}`)
  return { prev: loop || index > 0, next: loop || index < count - 1 }
}

/** −1 (previous), 1 (next) or 0 (spring home). A fast release decides by velocity:
 *  toward the offset it commits, against it the hand is going home, whatever the
 *  distance. A slow release decides by distance alone. `can` says which
 *  neighbours exist. */
export function slideCommit(
  slideX: number,
  vx: number,
  bandW: number,
  can: { prev: boolean; next: boolean },
): -1 | 0 | 1 {
  const fast = Math.abs(vx) > SLIDE_VELOCITY
  const far = Math.abs(slideX) > 0.5 * bandW
  if (fast) {
    if (slideX !== 0 && Math.sign(vx) !== Math.sign(slideX)) return 0
  } else if (!far) return 0
  const dir: -1 | 1 = (fast ? vx : slideX) < 0 ? 1 : -1
  return (dir === 1 ? can.next : can.prev) ? dir : 0
}

export type Sample = Point & { t: number }

/** Mean velocity (px/ms) over the samples inside VELOCITY_WINDOW, measured against
 *  the release instant `now`. The release is NOT a sample: a mouse button lifts tens
 *  of ms after the hand's last motion, and a release point duplicating the last
 *  move would halve the speed. A hand that rested longer than STOP_GAP before `now`,
 *  or before its own last sample, has stopped and carries nothing. */
export function velocity(samples: readonly Sample[], now: number): Point {
  const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW)
  if (recent.length < 2) return { x: 0, y: 0 }
  const a = recent[0] as Sample
  const b = recent[recent.length - 1] as Sample
  const before = recent[recent.length - 2] as Sample
  if (now - b.t > STOP_GAP || b.t - before.t > STOP_GAP) return { x: 0, y: 0 }
  const dt = Math.max(1, b.t - a.t)
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
}

/** The zoom ceiling: never under 2, otherwise the source's native pixels at this DPR. */
export function zoomMax(naturalW: number, fitW: number, dpr: number): number {
  return Math.max(2, naturalW / (fitW * dpr))
}

/** The scale at which the source runs out of pixels. Under 2 means source-limited. */
export function sharpScale(
  naturalW: number,
  fitW: number,
  dpr: number,
): number {
  return naturalW / (fitW * dpr)
}

/** A wheel session is a hand only if its first three ticks are not monotonically
 *  decaying in magnitude; inertia only ever decays. */
export function wheelIsHand(ticks: readonly number[]): boolean {
  assert(ticks.length >= 3, "wheel guard needs three ticks")
  const [a, b, c] = ticks as [number, number, number]
  return !(a > b && b > c)
}

export type Obstruction = { side: "top" | "bottom"; edge: number }

/** The stage: the visual viewport minus declared chrome. `edge` is the obstruction's
 *  inner edge in viewport coordinates (a top bar's bottom, a bottom bar's top). */
export function stageBand(vv: Band, blocks: readonly Obstruction[]): Band {
  let top = vv.top
  let bottom = vv.top + vv.h
  for (const b of blocks) {
    if (b.side === "top") top = Math.max(top, b.edge)
    else bottom = Math.min(bottom, b.edge)
  }
  assert(bottom > top, "obstructions cover the whole viewport")
  return { top, left: vv.left, w: vv.w, h: bottom - top }
}

export type Axes<K extends string> = Readonly<Record<K, number>>

const zero = <K extends string>(like: Axes<K>): Axes<K> =>
  Object.fromEntries(Object.keys(like).map((k) => [k, 0])) as Axes<K>

const isTuning = (t: Tunings<string>): t is Tuning => "zeta" in t
const tuningOf = <K extends string>(t: Tunings<K>, k: K): Tuning =>
  isTuning(t) ? t : t[k]

/** One step of a damped spring on every axis, in px and ms: the velocity unit is
 *  the one gestures measure and momentum projects. The closed-form solution of the
 *  oscillator, exact at any frame period, so a device holding 30 fps gets the same
 *  curve as one at 120. MAX_DT is a per-frame progress cap, not a stability limit.
 *  Pure. */
export function springStep<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  tuning: Tunings<K>,
  dtMs: number,
): { value: Axes<K>; vel: Axes<K> } {
  const dt = Math.min(dtMs, MAX_DT)
  const nv: Record<string, number> = {}
  const nx: Record<string, number> = {}
  for (const k of Object.keys(value) as K[]) {
    const tu = tuningOf(tuning, k)
    if (tu.f === Infinity) {
      nx[k] = target[k]
      nv[k] = 0
      continue
    }
    assert(tu.zeta >= 0 && tu.zeta <= 1, `zeta ${tu.zeta} out of [0, 1]`)
    const w = (2 * Math.PI * tu.f) / 1000
    const z = tu.zeta
    const e = Math.exp(-z * w * dt)
    const d0 = value[k] - target[k]
    const v0 = vel[k]
    let d: number
    let v: number
    if (z === 1) {
      const c = v0 + w * d0
      d = (d0 + c * dt) * e
      v = (v0 - c * w * dt) * e
    } else {
      const wd = w * Math.sqrt(1 - z * z)
      const b = (v0 + z * w * d0) / wd
      const cos = Math.cos(wd * dt)
      const sin = Math.sin(wd * dt)
      d = e * (d0 * cos + b * sin)
      v = e * ((wd * b - z * w * d0) * cos - (wd * d0 + z * w * b) * sin)
    }
    nx[k] = target[k] + d
    nv[k] = v
  }
  return { value: nx as Axes<K>, vel: nv as Axes<K> }
}

export function settled<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  eps: Axes<K>,
): boolean {
  for (const k of Object.keys(value) as K[]) {
    if (Math.abs(value[k] - target[k]) >= eps[k]) return false
    if (Math.abs(vel[k]) >= eps[k] * 0.02) return false
  }
  return true
}

/** The one clock. Holds the live value, a target and a tuning; `step` advances by a
 *  frame and answers whether it settled. A spring that has not settled within
 *  SETTLE_LIMIT ms screams: a stuck phase is a bug, never a wait. */
export class Spring<K extends string> {
  value: Axes<K>
  vel: Axes<K>
  target: Axes<K>
  tuning: Tunings<K> = MACHINE
  /** Integrated time since the last aim, capped per frame the way the step is. */
  elapsed = 0
  readonly eps: Axes<K>

  constructor(value: Axes<K>, eps: Axes<K>) {
    this.value = value
    this.vel = zero(value)
    this.target = value
    this.eps = eps
  }

  /** Retarget mid-flight; velocity carries over unless handed a new one. */
  aim(target: Axes<K>, tuning: Tunings<K>, vel?: Axes<K>): void {
    this.target = target
    this.tuning = tuning
    if (vel) this.vel = vel
    this.elapsed = 0
  }

  /** Drop the clock at the current value (a hand took over). */
  hold(): void {
    this.target = this.value
    this.vel = zero(this.value)
  }

  step(dtMs: number): boolean {
    const next = springStep(
      this.value,
      this.vel,
      this.target,
      this.tuning,
      dtMs,
    )
    this.value = next.value
    this.vel = next.vel
    this.elapsed += Math.min(dtMs, MAX_DT)

    const done = settled(this.value, this.vel, this.target, this.eps)
    if (done) {
      this.value = this.target
      this.vel = zero(this.value)
    }
    assert(
      done || this.elapsed <= SETTLE_LIMIT,
      `spring stuck: ${this.elapsed.toFixed(0)} ms without settling`,
    )
    return done
  }
}

export type Frame<K extends string> = {
  t: number
  value: Axes<K>
  vel: Axes<K>
}

/** The whole flight ahead of time: the spring is deterministic, so it is sampled at
 *  FLIGHT_DT until it settles and the table is handed to the compositor. Frame 0 is
 *  the start; the last frame is the target exactly. A stuck spring screams here. */
export function sampleFlight<K extends string>(
  value: Axes<K>,
  vel: Axes<K>,
  target: Axes<K>,
  tuning: Tunings<K>,
  eps: Axes<K>,
): Frame<K>[] {
  const s = new Spring<K>(value, eps)
  s.aim(target, tuning, vel)
  const frames: Frame<K>[] = [{ t: 0, value, vel }]
  let t = 0
  for (;;) {
    const done = s.step(FLIGHT_DT)
    t += FLIGHT_DT
    frames.push({ t, value: s.value, vel: s.vel })
    if (done) break
  }
  return frames
}

/** The pose and velocity at `t` ms into a sampled flight, interpolated between
 *  frames; clamped to the table's ends. */
export function frameAt<K extends string>(
  frames: readonly Frame<K>[],
  t: number,
): Frame<K> {
  assert(frames.length >= 2, "a flight has at least two frames")
  const last = frames[frames.length - 1] as Frame<K>
  if (t >= last.t) return last
  if (t <= 0) return frames[0] as Frame<K>
  const i = Math.floor(t / FLIGHT_DT)
  const a = frames[i] as Frame<K>
  const b = frames[i + 1] as Frame<K>
  const k = (t - a.t) / (b.t - a.t)
  const lerp = (p: Axes<K>, q: Axes<K>): Axes<K> =>
    Object.fromEntries(
      Object.keys(p).map((key) => [
        key,
        p[key as K] + (q[key as K] - p[key as K]) * k,
      ]),
    ) as Axes<K>
  return { t, value: lerp(a.value, b.value), vel: lerp(a.vel, b.vel) }
}
