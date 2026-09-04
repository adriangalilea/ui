// Runnable example: `bun scripts/examples/lightbox-flight.ts` plays a flight against
// fake clocks, including the one WebKit hands back. The lib stays free of any runtime.
import {
  type Flight,
  flightDone,
  flightTime,
  planFlight,
  readFlight,
} from "../../registry/base-nova/lib/lightbox-flight"
import {
  assert,
  FLIGHT_DT,
  frameAt,
  MACHINE,
  STILL,
} from "../../registry/base-nova/lib/lightbox-motion"

type K = "x" | "y" | "s" | "p"
const EPS = { x: 0.5, y: 0.5, s: 0.002, p: 0.002 }
const start = { x: -240, y: 80, s: 0.3, p: 0 }
const target = { x: 0, y: 0, s: 1, p: 1 }
const still = { x: 0, y: 0, s: 0, p: 0 }

// The plan is the sampled spring: frame 0 is the start, the duration is the last
// frame's time, a whole number of FLIGHT_DT periods.
const plan = planFlight<K>(start, still, target, MACHINE, EPS)
assert(plan.frames[0]?.value.x === start.x, "frame 0 is the start")
assert(
  plan.duration === (plan.frames[plan.frames.length - 1] as { t: number }).t,
  "duration is the last frame",
)
assert(
  Math.abs(plan.duration / FLIGHT_DT - Math.round(plan.duration / FLIGHT_DT)) <
    1e-9,
  "duration is whole periods",
)
console.log(
  `plan: ${plan.frames.length} frames, ${plan.duration.toFixed(1)} ms under MACHINE`,
)

function flight(t: unknown): Flight<K> {
  return {
    frames: plan.frames,
    target,
    settles: true,
    clock: { currentTime: t },
  }
}

// Mid-flight the read is the table's interpolation at the clock, velocity included,
// and the flight is not done.
{
  const t = plan.duration / 2 + 3
  const { frame, done } = readFlight(flight(t))
  const ref = frameAt(plan.frames, t)
  assert(!done, "half way is not done")
  assert(
    frame.value.s === ref.value.s && frame.vel.x === ref.vel.x,
    "the table",
  )
  assert(frame.value.s > start.s && frame.value.s < target.s, "between")
}

// The clock at the duration exactly, and a hair under it (WebKit keeps seconds and
// rounds back to ms: 583.33333333333314 for 583.33333333333337): both land, and
// the landed frame is the target exactly.
for (const t of [plan.duration, plan.duration - 2e-4]) {
  const f = flight(t)
  assert(flightDone(f, flightTime(f)), `landed at ${t}`)
  const { frame, done } = readFlight(f)
  assert(done && frame.value.p === 1 && frame.value.s === 1, "target exactly")
}
// A frame short of the duration is still flying.
assert(
  !flightDone(flight(0), plan.duration - FLIGHT_DT),
  "a period short is still flying",
)
console.log("mid-flight read, landing, WebKit's short clock")

// A clock that is not a finite number screams: null (never started, or cancelled),
// a CSSNumericValue-like object, NaN.
for (const bad of [null, { value: 12, unit: "ms" }, Number.NaN]) {
  let threw = false
  try {
    flightTime(flight(bad))
  } catch {
    threw = true
  }
  assert(threw, `a clock of ${String(bad)} screams`)
}
console.log("a flight without a clock screams")

// Reduced motion is a two-frame plan: one period long, and done at once.
const cut = planFlight<K>(start, still, target, STILL, EPS)
assert(cut.frames.length === 2 && cut.duration === FLIGHT_DT, "two frames")
console.log("STILL is one hop")
