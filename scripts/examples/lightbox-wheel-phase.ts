// Runnable example: `bun scripts/examples/lightbox-wheel-phase.ts` feeds the
// detector the streams a trackpad really produces and asserts it can tell the hand
// from the coast. The lib stays free of any runtime.
import { assert } from "../../registry/base-nova/lib/lightbox-motion"
import {
  ACC_MAX,
  ACC_MIN,
  ANALYZE,
  DELTA_MAX,
  type Phase,
  type PhaseRead,
  phaseFeed,
  phaseStart,
} from "../../registry/base-nova/lib/lightbox-wheel-phase"

const HZ = 16
/** Fingers pushing at a roughly even rate. */
const hand = (n: number, px: number, t0 = 0) =>
  Array.from({ length: n }, (_, i) => ({ dx: px, dy: 0, t: t0 + i * HZ }))
/** The OS coasting: a fixed decay per frame, which is the whole tell. */
const coast = (from: number, t0: number, decay = 0.9, floor = 0.4) => {
  const out = []
  for (let d = from * decay, t = t0; d > floor; d *= decay, t += HZ)
    out.push({ dx: d, dy: 0, t })
  return out
}
const feed = (
  events: { dx: number; dy: number; t: number }[],
  from: Phase = phaseStart(),
) => {
  let phase = from
  const reads: PhaseRead[] = []
  for (const e of events) {
    const out = phaseFeed(phase, e)
    phase = out.phase
    reads.push(out.read)
  }
  return { phase, reads }
}

// A hand alone is never mistaken for a coast, however long it pushes: an even rate
// gives an acceleration factor of 1, which is outside the decay band.
{
  const { phase, reads } = feed(hand(40, 30))
  assert(!phase.momentum, "an even hand never reads as momentum")
  assert(
    reads.every((r) => !r.released),
    "and nothing is ever released",
  )
  assert(reads[0]?.start === true, "the first event opens the stream")
  assert(
    phase.movement.x === 40 * 30,
    `travel is the sum of the hand: ${phase.movement.x}`,
  )
}
// A hand that lifts: the coast behind it is recognised, exactly once, and every
// event after it still reads as momentum.
{
  const swipe = hand(10, 30)
  const { phase, reads } = feed([...swipe, ...coast(30, 10 * HZ)])
  assert(phase.momentum, "the coast is recognised")
  const released = reads.filter((r) => r.released)
  assert(released.length === 1, `released fires once: ${released.length}`)
  const at = reads.indexOf(released[0] as PhaseRead)
  assert(at >= swipe.length, "and never before the fingers lifted")
  assert(
    reads.slice(at).every((r) => r.momentum),
    "everything after it is the device",
  )
  assert(
    (released[0] as PhaseRead).velocity.x > 0,
    "the release carries the direction it was thrown",
  )
}
console.log(
  `a hand is a hand, a coast is a coast (${ANALYZE} points inside [${ACC_MIN}, ${ACC_MAX}])`,
)

// The hand comes back mid-coast: the stream is cut and a new one opens on that
// event. This is what lets a second swipe land while the first is still gliding.
{
  const swipe = hand(10, 30)
  const tail = coast(30, 10 * HZ)
  const { phase } = feed([...swipe, ...tail])
  assert(phase.momentum, "coasting")
  const back = phaseFeed(phase, {
    dx: 30,
    dy: 0,
    t: 10 * HZ + tail.length * HZ,
  })
  assert(back.read.interrupted, "a push during the coast interrupts it")
  assert(back.read.start && !back.read.momentum, "and opens a fresh stream")
  assert(back.phase.movement.x === 30, "whose travel starts from zero")
  // The coast's own next event, small and decaying, does NOT interrupt it.
  const small = phaseFeed(phase, {
    dx: (tail[tail.length - 1] as { dx: number }).dx * 0.9,
    dy: 0,
    t: 10 * HZ + tail.length * HZ,
  })
  assert(!small.read.interrupted, "the coast does not interrupt itself")
}
// A device reporting an absurd delta is clamped, not trusted.
{
  const { phase } = feed([{ dx: 99999, dy: 0, t: 0 }])
  assert(phase.movement.x === DELTA_MAX, `clamped: ${phase.movement.x}`)
}
// The end window adapts to the device's rate: a fast trackpad is not held to the
// long window a slow mouse needs.
{
  const fast = feed(hand(10, 30)).phase
  assert(
    fast.endsIn < phaseStart().endsIn,
    `a 16 ms device tightens the window: ${fast.endsIn}`,
  )
  const slow = feed(
    Array.from({ length: 10 }, (_, i) => ({ dx: 30, dy: 0, t: i * 200 })),
  ).phase
  assert(slow.endsIn > fast.endsIn, `a slow one keeps it long: ${slow.endsIn}`)
}
console.log("a push interrupts a coast, deltas are clamped, the window adapts")
