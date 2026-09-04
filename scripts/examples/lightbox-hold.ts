// Runnable example: `bun scripts/examples/lightbox-hold.ts` holds keys against a
// zoomed image and asserts the glide. The lib stays free of any runtime.
import {
  applyHold,
  holdDelta,
} from "../../registry/base-nova/lib/lightbox-hold"
import {
  assert,
  KEY_PAN_SPEED,
  KEY_ZOOM_MS,
  MAX_DT,
  panBounds,
} from "../../registry/base-nova/lib/lightbox-motion"

const fitted = { w: 800, h: 600 }
const band = { top: 0, left: 0, w: 1000, h: 700 }
const zoomMax = 4

// Nothing held: a frame changes nothing.
{
  const d = holdDelta([], 16)
  assert(d.dx === 0 && d.dy === 0 && d.k === 1, "idle frame")
  const v = applyHold({ x: 10, y: -20, s: 2 }, d, fitted, band, zoomMax)
  assert(v.x === 10 && v.y === -20 && v.s === 2, "idle frame keeps the view")
}

// Arrows add: up + left is a diagonal at KEY_PAN_SPEED per axis; opposite arrows
// cancel. A left arrow moves the IMAGE right (the eye pans left).
{
  const d = holdDelta(["pan.up", "pan.left"], 16)
  assert(d.dx === KEY_PAN_SPEED * 16 && d.dy === KEY_PAN_SPEED * 16, "diagonal")
  const c = holdDelta(["pan.left", "pan.right"], 16)
  assert(c.dx === 0 && c.dy === 0, "opposites cancel")
}

// A held + doubles the zoom in KEY_ZOOM_MS whatever the frame period; a held -
// undoes it exactly.
{
  let k = 1
  for (let t = 0; t < KEY_ZOOM_MS; t += 10) k *= holdDelta(["zoom.in"], 10).k
  assert(Math.abs(k - 2) < 1e-9, `doubles in KEY_ZOOM_MS: ${k}`)
  const both = holdDelta(["zoom.in", "zoom.out"], 16)
  assert(Math.abs(both.k - 1) < 1e-12, "in and out cancel")
}

// A frame lost to a tab switch is capped at MAX_DT: the image never slingshots.
{
  const d = holdDelta(["pan.right"], 5000)
  assert(d.dx === -KEY_PAN_SPEED * MAX_DT, "dt capped")
}
console.log("axes add, zoom doubles, dt capped")

// The glide clamps at the edge instead of rubbering: holding right from the corner
// of a 2x image stays on the bound.
{
  const view = { x: 0, y: 0, s: 2 }
  const b = panBounds(view, fitted, band)
  let v = view
  for (let i = 0; i < 400; i++)
    v = applyHold(v, holdDelta(["pan.right"], 16), fitted, band, zoomMax)
  assert(v.x === -b.x && v.y === 0 && v.s === 2, `held at the bound ${v.x}`)
}

// Zoom holds between 1 and zoomMax, about the center: a centred image stays centred,
// and once at the ceiling a held + is a no-op.
{
  let v = { x: 0, y: 0, s: 1 }
  for (let i = 0; i < 200; i++)
    v = applyHold(v, holdDelta(["zoom.in"], 16), fitted, band, zoomMax)
  assert(v.s === zoomMax && v.x === 0 && v.y === 0, `ceiling ${v.s}`)
  for (let i = 0; i < 200; i++)
    v = applyHold(v, holdDelta(["zoom.out"], 16), fitted, band, zoomMax)
  assert(v.s === 1 && v.x === 0 && v.y === 0, `floor ${v.s}`)
}

// Zooming out from a panned view pulls the pan back inside the shrinking bounds.
{
  let v = { x: -300, y: -100, s: 3 }
  for (let i = 0; i < 100; i++)
    v = applyHold(v, holdDelta(["zoom.out"], 16), fitted, band, zoomMax)
  const b = panBounds(v, fitted, band)
  assert(Math.abs(v.x) <= b.x && Math.abs(v.y) <= b.y, "pan inside bounds")
}
console.log("clamped at the edge, zoom between 1 and the ceiling")
