import assert from "node:assert/strict"
import { frameChat } from "../../registry/base-nova/lib/telegram-chat-framing"

const bottom = frameChat({
  deviceHeight: 800,
  baseHeight: 320,
  focus: { y: 520, height: 230, finalHeight: 230 },
})
assert.equal(
  bottom.top,
  480,
  "keep the chin when the whole message fits above it",
)
assert.equal(bottom.clippedBottom, false)
const top = frameChat({
  deviceHeight: 800,
  baseHeight: 320,
  focus: { y: 45, height: 230, finalHeight: 230 },
})
assert.equal(top.top, 0, "keep the crown when the message fits below it")
const tall = frameChat({
  deviceHeight: 1000,
  baseHeight: 300,
  focus: { y: 300, height: 600, finalHeight: 600 },
})
assert.equal(tall.height, 450)
assert.equal(
  tall.top,
  282,
  "a tall focus starts below the fade, rather than centering its middle",
)
assert.ok(tall.clippedTop && tall.clippedBottom)
const fixed = frameChat({
  deviceHeight: 1000,
  baseHeight: 350,
  grow: false,
  focus: { y: 300, height: 600, finalHeight: 600 },
})
assert.equal(fixed.height, 350, "container constraints remain authoritative")
for (const deviceHeight of [200, 800, 1200])
  for (const baseHeight of [150, 400, 1000]) {
    const frame = frameChat({ deviceHeight, baseHeight })
    assert.ok(frame.height <= deviceHeight && frame.top >= 0)
    assert.equal(frame.top + frame.height, deviceHeight)
  }
console.log(
  "Chat framing: intact edges, necessary clipping, and fixed viewports passed",
)
