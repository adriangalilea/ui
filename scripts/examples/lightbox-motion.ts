// Runnable example: `bun scripts/examples/lightbox-motion.ts` asserts the motion
// lib's invariants against real numbers. The lib stays free of any runtime.
import {
  assert,
  COAST,
  clampPan,
  FLIGHT_DT,
  frameAt,
  glide,
  HAND,
  MACHINE,
  neighbours,
  OVERSHOOT,
  OVERSHOOT_MAX,
  overshoot,
  project,
  rubber,
  Spring,
  STILL,
  SWIPE_COMMIT,
  sampleFlight,
  slideCommit,
  sourceView,
  stageBand,
  unovershoot,
  velocity,
  WHEEL_TICK_MAX,
  WHEEL_ZOOM,
  wheelIsHand,
  wheelPx,
  wheelTick,
  zoomAt,
} from "../../registry/base-nova/lib/lightbox-motion"

// Every tuning settles under 2 s from a 100 px step and from a flick, at 60 fps and
// at the 30 fps a mid-range phone holds. Critical damping never reverses: |d| is
// monotone at every frame period.
for (const [name, tuning] of Object.entries({ MACHINE, HAND, STILL })) {
  for (const dt of [16, 32, 33]) {
    for (const vel of [0, 3]) {
      const s = new Spring<"v">({ v: 0 }, { v: 0.5 })
      s.aim({ v: 100 }, tuning, { v: vel })
      let t = 0
      let d = 100
      while (!s.step(dt)) {
        t += dt
        const next = Math.abs(s.value.v - 100)
        if (tuning.zeta === 1)
          assert(
            next <= d + 1e-9,
            `${name} reversed at dt ${dt}: ${d} -> ${next}`,
          )
        d = next
      }
      assert(t < 2000, `${name} took ${t} ms at dt ${dt}`)
      if (dt === 16)
        console.log(`${name.padEnd(8)} v0 ${vel}  settles in ${t} ms`)
    }
  }
}

// A flick released under COAST toward its projected rest never exceeds the hand's
// speed, never reverses, and settles under the limit; MACHINE aimed at the same
// target kicks. COAST is only ever aimed at a projected rest: that pairing is the
// contract, not an arbitrary step.
for (const v of [1, 3, 6, 12]) {
  const peak = (tuning: typeof COAST) => {
    const target = project(0, v)
    const s = new Spring<"v">({ v: 0 }, { v: 0.5 })
    s.aim({ v: target }, tuning, { v })
    let max = 0
    let t = 0
    let d = target
    while (!s.step(16)) {
      t += 16
      max = Math.max(max, Math.abs(s.vel.v))
      const next = Math.abs(s.value.v - target)
      if (tuning === COAST) assert(next <= d + 1e-9, `COAST reversed at v ${v}`)
      d = next
    }
    return { max, t }
  }
  const coast = peak(COAST)
  const machine = peak(MACHINE)
  assert(coast.max <= v, `COAST kicks at v ${v}: peak ${coast.max}`)
  assert(coast.t < 2000, `COAST took ${coast.t} ms at v ${v}`)
  assert(machine.max > 1.5 * v, `MACHINE stopped kicking at v ${v}`)
  console.log(
    `COAST    v ${String(v).padStart(2)} px/ms  peak ${coast.max.toFixed(2)}  settles in ${coast.t} ms  (MACHINE would peak ${machine.max.toFixed(2)})`,
  )
}

// A 30 fps step from 500 px away lands short of the target, never past it.
{
  const s = new Spring<"v">({ v: -500 }, { v: 0.5 })
  s.aim({ v: 0 }, MACHINE)
  s.step(32)
  assert(s.value.v < 0 && s.value.v > -500, `first 32 ms step: ${s.value.v}`)
  console.log(`MACHINE  32 ms first step lands at ${s.value.v.toFixed(1)} px`)
}

// zoomAt is a fixed point at the anchor: the point under the finger stays put.
{
  const view = { x: 30, y: -20, s: 1.4 }
  const at = { x: 120, y: 80 }
  const next = zoomAt(view, 2.2, at)
  const before = { x: (at.x - view.x) / view.s, y: (at.y - view.y) / view.s }
  const after = { x: (at.x - next.x) / next.s, y: (at.y - next.y) / next.s }
  assert(
    Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9,
    "zoomAt drifts",
  )
  console.log("zoomAt   fixed point holds")
}

// sourceView is identity when aspects match: no clip, radius scales with cover.
{
  const band = { top: 0, left: 0, w: 1000, h: 800 }
  const fitted = { w: 600, h: 400 }
  const sv = sourceView(
    { x: 350, y: 300, w: 300, h: 200, radius: 8 },
    fitted,
    band,
  )
  assert(
    Math.abs(sv.clip.w) < 1e-9 && Math.abs(sv.clip.h) < 1e-9,
    "clip on matching aspects",
  )
  assert(Math.abs(sv.view.s - 0.5) < 1e-9, "cover scale")
  assert(sv.view.x === 0 && sv.view.y === 0, "centered trigger has no offset")
  assert(sv.radius === 16, "radius in local px")
  const square = sourceView(
    { x: 0, y: 0, w: 200, h: 200, radius: 0 },
    fitted,
    band,
  )
  assert(
    square.clip.h === 0 && Math.abs(square.clip.w - 100) < 1e-9,
    "square over 3:2 clips the sides by 100 local px",
  )
  console.log("sourceView identity and cover clip hold")
}

// A zero rect throws.
{
  let threw = false
  try {
    sourceView(
      { x: 0, y: 0, w: 0, h: 0, radius: 0 },
      { w: 1, h: 1 },
      { top: 0, left: 0, w: 1, h: 1 },
    )
  } catch {
    threw = true
  }
  assert(threw, "zero rect must throw")
}

// Rubber, pan bounds, commit rules, the inertia guard, the band.
assert(
  rubber(0.5, 1, 2) === 0.925 &&
    rubber(3, 1, 2) === 2.05 &&
    rubber(1.5, 1, 2) === 1.5,
  "rubber",
)
assert(
  clampPan(
    { x: 999, y: -999, s: 2 },
    { w: 600, h: 400 },
    { top: 0, left: 0, w: 1000, h: 800 },
  ).x === 100,
  "pan bound",
)
// A grab mid-bounce (79 px past a 50 px bound) reads back to the raw offset it
// rubbered from, and the first 1 px of drag moves the image under 1 px, not 19.
for (const v of [-79, -50, 0, 37, 50, 120]) {
  assert(
    Math.abs(overshoot(unovershoot(v, 50), 50) - v) < 1e-9,
    `unovershoot is not the inverse at ${v}`,
  )
}
{
  const raw0 = unovershoot(-79, 50)
  const moved = overshoot(raw0 + 1, 50)
  assert(
    moved > -79 && moved - -79 < 1,
    `a grab past the bound jumped on its first move: ${moved}`,
  )
}
// The band asymptotes: pull for a mile and the image still cannot leave its edge by
// more than OVERSHOOT_MAX, and the harder it is pulled the less it gives. At the
// bound itself the give is still OVERSHOOT, so the edge feels the same as it did.
{
  const far = overshoot(50 + 100000, 50) - 50
  assert(far < OVERSHOOT_MAX && far > OVERSHOOT_MAX * 0.99, `capped: ${far}`)
  const first = overshoot(50 + 1, 50) - 50
  assert(
    Math.abs(first - OVERSHOOT) < 0.01,
    `the first px past the bound still gives ${OVERSHOOT}: ${first}`,
  )
  let prev = Number.POSITIVE_INFINITY
  for (let e = 1; e < 400; e += 20) {
    const give = overshoot(50 + e + 1, 50) - overshoot(50 + e, 50)
    assert(give < prev && give > 0, `the give must keep shrinking at ${e}`)
    prev = give
  }
}
// A move is a magnet, not a spring. Handed nothing (a key) it accelerates into place,
// fastest halfway, which is the shape a snap point should have; handed the speed a
// swipe committed at, it continues at that speed and eases out. Both arrive exactly.
{
  const at = (m0: number, s: number) => glide(1000, m0, s)
  const speed = (m0: number, s: number) => at(m0, s + 0.01) - at(m0, s)
  assert(
    at(0, 0) === 0 && Math.abs(at(0, 1) - 1000) < 1e-9,
    "leaves and arrives",
  )
  assert(
    speed(0, 0.5) > speed(0, 0.05) && speed(0, 0.5) > speed(0, 0.95),
    "from rest it is fastest in the middle: it is pulled in, not eased down",
  )
  assert(speed(0, 0.05) > 0, "and it never stalls on the way")
  // Handed a fast throw it does not shove: it leaves at exactly that speed. This is
  // what makes a commit invisible, since it happens with the fingers still moving.
  const thrown = 2500
  const entry = glide(1000, thrown, 1e-6) / 1e-6
  assert(
    Math.abs(entry - thrown) / thrown < 0.01,
    `the entry speed IS the speed it was handed: ${entry.toFixed(0)}`,
  )
  assert(speed(thrown, 0.9) < speed(thrown, 0.1), "and it eases out from there")
  for (const m0 of [0, 500, 2500, -800])
    assert(Math.abs(glide(1000, m0, 1) - 1000) < 1e-9, `arrives whatever ${m0}`)
}
// One gesture is one slide, chosen on TRAVEL with the hand still down. Nothing here
// asks when the fingers left, which is the question the web cannot answer.
{
  const w = 1472
  const decide = (travel: number, from: number, n: number) =>
    Math.abs(travel) < SWIPE_COMMIT * w
      ? from
      : Math.min(n - 1, Math.max(0, from + Math.sign(travel)))
  assert(decide(0.2 * w, 3, 14) === 3, "a nudge under the line goes back")
  assert(decide(0.3 * w, 3, 14) === 4, "past it, the neighbour, and only it")
  assert(decide(9 * w, 3, 14) === 4, "a throw of nine slides still moves one")
  assert(decide(-9 * w, 3, 14) === 2, "the same backwards")
  assert(decide(-2 * w, 0, 14) === 0, "and it never walks off either end")
  assert(decide(2 * w, 13, 14) === 13, "at the far end too")
  assert(
    SWIPE_COMMIT > 0.15 && SWIPE_COMMIT < 0.5,
    "above Embla's ~0.15 so a nudge returns, below Swiper's 0.5 which it applies at release",
  )
}
assert(
  slideCommit(-10, -0.8, 800, { prev: true, next: true }) === 1,
  "fast flick commits",
)
assert(
  slideCommit(-500, 0, 800, { prev: true, next: true }) === 1 &&
    slideCommit(-500, -0.3, 800, { prev: true, next: true }) === 1,
  "half width commits at any slow speed",
)
assert(
  slideCommit(-560, 0.6, 800, { prev: true, next: true }) === 0,
  "a flick back past half width goes home",
)
assert(
  slideCommit(-100, 0.6, 800, { prev: true, next: true }) === 0,
  "a flick back short of half width goes home too",
)
assert(
  slideCommit(0, 0.6, 800, { prev: true, next: true }) === -1,
  "a flick from rest commits by direction",
)
assert(
  slideCommit(-500, 0, 800, { prev: true, next: false }) === 0,
  "no neighbour, no commit",
)
{
  const a = neighbours(0, 3, false)
  const b = neighbours(2, 3, false)
  const c = neighbours(2, 3, true)
  assert(
    !a.prev && a.next && b.prev && !b.next && c.prev && c.next,
    "neighbours",
  )
}
assert(
  !wheelIsHand([30, 20, 10]) &&
    wheelIsHand([10, 20, 30]) &&
    wheelIsHand([20, 20, 5]),
  "inertia guard",
)
// A coast still running when the lightbox opens sends 60-150 px ticks, decaying:
// the guard reads them raw; bounded they would read 30, 30, 30 and pass as a hand.
assert(
  !wheelIsHand([120, 90, 60].map((t) => Math.abs(wheelPx(t, 0, 800)))) &&
    wheelIsHand([120, 90, 60].map(wheelTick)),
  "inertia guard must see unbounded ticks",
)
const band = stageBand({ top: 0, left: 0, w: 1000, h: 800 }, [
  { side: "top", edge: 44 },
  { side: "bottom", edge: 700 },
])
assert(band.top === 44 && band.h === 656, "band minus obstructions")
console.log("rubber, pan, grab past the bound, commit, guard, band hold")

// A finger that moves, then rests before lifting carries no momentum; one lifting
// mid-move does, at its true speed. A mouse drag at 16 ms and 12 px per move whose
// button lifts 8 ms after the last move keeps the whole 0.75 px/ms: the release is
// the clock, not a sample. A wheel tick is bounded: one mouse notch zooms under
// 1.5x and nudges 30 px.
{
  const rest = velocity(
    [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 0, t: 16 },
    ],
    96,
  )
  assert(rest.x === 0 && rest.y === 0, `a rested finger flicked: ${rest.x}`)
  const nudge = velocity(
    [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 0, t: 16 },
      { x: 21, y: 0, t: 90 },
    ],
    92,
  )
  assert(nudge.x === 0, `a nudge after a rest flicked: ${nudge.x}`)
  const live = velocity(
    [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 0, t: 16 },
      { x: 40, y: 0, t: 32 },
    ],
    32,
  )
  assert(
    Math.abs(live.x - 1.25) < 1e-9,
    `a moving finger lost its speed: ${live.x}`,
  )
  const mouse = velocity(
    [0, 16, 32, 48, 64].map((t) => ({ x: (t / 16) * 12, y: 0, t })),
    72,
  )
  assert(
    Math.abs(mouse.x - 0.75) < 1e-9,
    `a mouse flick lost its speed: ${mouse.x}`,
  )
  assert(
    Math.abs(project(0, mouse.x) - 149.25) < 1e-9,
    "a 0.75 px/ms flick coasts 149 px",
  )
  assert(
    wheelTick(wheelPx(100, 0, 800)) === WHEEL_TICK_MAX,
    "mouse notch bounded",
  )
  assert(
    wheelTick(wheelPx(3, 1, 800)) === WHEEL_TICK_MAX,
    "firefox lines bounded",
  )
  assert(wheelTick(wheelPx(-7, 0, 800)) === -7, "trackpad tick untouched")
  assert(
    Math.exp(WHEEL_TICK_MAX * WHEEL_ZOOM) < 1.5,
    "a notch zooms under 1.5x",
  )
  console.log("stopped finger, wheel tick bound hold")
}

// Per-axis tuning: x coasts under COAST while y bounces under MACHINE, and the
// coasting axis never exceeds the hand's speed even though its neighbour kicks.
{
  const v = 2
  const s = new Spring<"x" | "y">({ x: 0, y: 0 }, { x: 0.5, y: 0.5 })
  s.aim({ x: project(0, v), y: 8 }, { x: COAST, y: MACHINE }, { x: v, y: v })
  let peakX = 0
  let peakY = 0
  while (!s.step(16)) {
    peakX = Math.max(peakX, Math.abs(s.vel.x))
    peakY = Math.max(peakY, Math.abs(s.vel.y))
  }
  assert(peakX <= v, `the coasting axis kicked: ${peakX}`)
  assert(peakY <= v, `the wall axis kicked: ${peakY}`)
  console.log(
    `per-axis  x COAST peak ${peakX.toFixed(2)}  y MACHINE peak ${peakY.toFixed(2)}`,
  )
}

// A stuck spring screams.

{
  const s = new Spring<"v">({ v: 0 }, { v: 0.5 })
  s.aim({ v: 100 }, { zeta: 0, f: 4.5 })
  let threw = false
  try {
    for (let i = 0; i < 400; i++) s.step(16)
  } catch {
    threw = true
  }
  assert(threw, "an undamped spring must scream within 2 s")
  console.log("stuck spring screams")
}

// A flight sampled ahead is the spring itself: frame 0 is the start, the last frame
// is the target exactly, the table settles under the limit, and a frame read
// between two samples lies between them, velocity included. Reduced motion is a
// two-frame table: one hop to the target.
{
  const frames = sampleFlight(
    { x: -300, s: 0.3 },
    { x: 0, s: 0 },
    { x: 0, s: 1 },
    MACHINE,
    { x: 0.5, s: 0.001 },
  )
  const first = frames[0]
  const last = frames[frames.length - 1]
  assert(first && last, "empty flight")
  assert(first.t === 0 && first.value.x === -300, "frame 0 is the start")
  assert(
    last.value.x === 0 && last.value.s === 1,
    "the last frame is the target",
  )
  assert(last.t < 2000, `flight took ${last.t} ms`)
  const mid = frameAt(frames, FLIGHT_DT * 3.5)
  const a = frames[3]
  const b = frames[4]
  assert(a && b, "frames 3 and 4")
  assert(
    Math.abs(mid.value.x - (a.value.x + b.value.x) / 2) < 1e-9 &&
      Math.abs(mid.vel.x - (a.vel.x + b.vel.x) / 2) < 1e-9,
    "frameAt interpolates halfway",
  )
  assert(frameAt(frames, 1e6) === last, "past the end is the end")
  assert(frameAt(frames, -1) === first, "before the start is the start")
  // WebKit hands the duration back a hair short (seconds in, milliseconds out).
  const webkit = last.t / 1000 - 1e-16
  assert(
    frameAt(frames, webkit * 1000) === last,
    "a duration that lost a bit in seconds is still the last frame",
  )
  const still = sampleFlight({ x: 0 }, { x: 0 }, { x: 100 }, STILL, { x: 0.5 })
  assert(still.length === 2 && still[1]?.value.x === 100, "STILL is one hop")
  console.log(
    `flight   ${frames.length} frames, ${last.t.toFixed(0)} ms, frameAt interpolates`,
  )
}
