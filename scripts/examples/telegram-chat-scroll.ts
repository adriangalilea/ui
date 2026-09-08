import assert from "node:assert/strict"
import {
  createThreadScroll,
  createViewportScroll,
} from "../../registry/base-nova/ui/telegram-chat-scroll"

let range = 100
let position = 0
const element = {
  get scrollTop() {
    return position
  },
  set scrollTop(value: number) {
    position = Math.max(0, Math.min(range, value))
  },
  clientHeight: 100,
  get scrollHeight() {
    return range + this.clientHeight
  },
} as HTMLElement
const frames = new Map<number, FrameRequestCallback>()
let id = 0
const previousRequest = globalThis.requestAnimationFrame
const previousCancel = globalThis.cancelAnimationFrame
globalThis.requestAnimationFrame = (callback) => {
  frames.set(++id, callback)
  return id
}
globalThis.cancelAnimationFrame = (key) => {
  frames.delete(key)
}
try {
  const view = createViewportScroll()
  assert.equal(view.place(element, 300, range, false).pending, true)
  assert.equal(position, 100)
  range = 400
  assert.equal(view.place(element, 300, range, false).pending, false)
  assert.equal(
    position,
    300,
    "Closing viewport retries a previously clamped target",
  )
  element.scrollTop = 220
  view.place(element, 300, range, false)
  assert.equal(
    position,
    220,
    "An unchanged target must not take back reader scroll",
  )
  view.place(element, 100, range, false)
  assert.equal(frames.size, 1)
  view.cancel()
  assert.equal(
    frames.size,
    0,
    "Touch, wheel, and unmount can cancel the same owner",
  )
  view.place(element, 100, range, false)
  assert.equal(
    frames.size,
    0,
    "Measurement invalidation must not restart a cancelled target",
  )
  view.place(element, 80, range, true)
  assert.equal(position, 80)
  assert.equal(frames.size, 0, "Reduced motion places immediately")
  view.place(element, 50, range, false)
  const pending = [...frames.entries()]
  frames.clear()
  for (const [, callback] of pending) callback(performance.now() + 1000)
  assert.equal(position, 50, "A glide reaches the measured target")
  assert.equal(frames.size, 0)

  const thread = createThreadScroll()
  thread.place(element, null, true)
  assert.equal(position, range)
  element.scrollTop = 0
  thread.place(element, null, true)
  assert.equal(position, 0, "A completed transcript preserves reading position")
  thread.place(element, null, false)
  assert.equal(position, range, "Streaming follows the latest message")
  thread.place(element, 70, true)
  element.scrollTop = 30
  thread.place(element, 70, true)
  assert.equal(position, 30, "Afterlife updates do not steal focus scroll")
} finally {
  globalThis.requestAnimationFrame = previousRequest
  globalThis.cancelAnimationFrame = previousCancel
}
console.log(
  "✓ Chat scroll ownership: pending targets, reader control, cancellation, and reduced motion",
)
