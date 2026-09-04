// Runnable example: `bun scripts/examples/lightbox-motion.ts` asserts the motion
// lib's invariants against real numbers. The lib stays free of any runtime.
import {
  assert,
  COAST,
  clampPan,
  HAND,
  MACHINE,
  neighbours,
  project,
  rubber,
  Spring,
  STILL,
  slideCommit,
  sourceView,
  stageBand,
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
console.log("rubber, pan, commit, guard, band hold")

// A finger that moves, rests, then lifts carries no momentum; one lifting mid-move
// does. A wheel tick is bounded: one mouse notch zooms under 1.5x and nudges 30 px.
{
  const rest = velocity(
    [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 0, t: 16 },
      { x: 20, y: 0, t: 96 },
    ],
    96,
  )
  assert(rest.x === 0 && rest.y === 0, `a rested finger flicked: ${rest.x}`)
  const stale = velocity(
    [
      { x: 0, y: 0, t: 0 },
      { x: 20, y: 0, t: 16 },
    ],
    96,
  )
  assert(stale.x === 0, `a stale window flicked: ${stale.x}`)
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
