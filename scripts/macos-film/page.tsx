// The film bench's page, bundled by scripts/macos-film.ts (no Next, no dev server):
// one macos stage on a plain ground, driven from outside. `seek` renders the frame at
// `ms` synchronously (flushSync runs the layout effects too, the camera's included)
// and answers with a hash of the stage's markup, so the farm can tell a frame it has
// already drawn from a new one without taking a picture of it.
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import {
  type Art,
  focusSpans,
  pointerTargets,
  sceneClock,
  type Timeline,
} from "@/registry/base-nova/lib/macos-session"
import { Macos, type MacosDevice } from "@/registry/base-nova/ui/macos"

export interface FilmOptions {
  timeline: Timeline
  art: Art
  device?: MacosDevice
  accent?: string
  /** The stage's CSS width. */
  width: number
}

declare global {
  interface Window {
    film: {
      load(o: FilmOptions): Promise<{
        total: number
        box: { x: number; y: number; width: number; height: number }
      }>
      seek(ms: number): number
    }
  }
}

const root = createRoot(document.getElementById("film") as HTMLElement)
let options: FilmOptions
let total = 1

function draw(ms: number) {
  flushSync(() =>
    root.render(
      <div
        id="stage"
        className="inline-block bg-[#0b0b0d] p-10"
        style={{ width: options.width + 80 }}
      >
        <Macos
          timeline={options.timeline}
          art={options.art}
          progress={ms / total}
          device={options.device}
          accent={options.accent}
          alt="film"
        />
      </div>,
    ),
  )
}

/** FNV-1a over the stage's markup: text, inline styles, transforms, everything a
 *  frame's pixels depend on besides the static stylesheet. */
function hash(): number {
  const s = (document.getElementById("stage") as HTMLElement).outerHTML
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

window.film = {
  async load(o) {
    options = o
    const clock = sceneClock(o.timeline)
    total = clock.total
    draw(0)
    await document.fonts.ready
    // Draw each focus once, so the camera has measured every target before any
    // frame is taken: then a frame is the same whichever page draws it, in any order.
    for (const span of focusSpans(o.timeline, clock))
      if (span.kind) draw(span.start + 1)
    // Likewise every place the pointer goes: each is on screen when it arrives.
    for (const target of pointerTargets(o.timeline, clock))
      draw(target.arrive + 1)
    draw(0)
    const r = (
      document.getElementById("stage") as HTMLElement
    ).getBoundingClientRect()
    return {
      total,
      box: {
        x: r.x,
        y: r.y,
        width: Math.ceil(r.width),
        height: Math.ceil(r.height),
      },
    }
  },
  seek(ms) {
    draw(ms)
    return hash()
  },
}
