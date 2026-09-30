"use client"

import { useSearchParams } from "next/navigation"
import * as React from "react"
import {
  type Art,
  sceneClock,
  type Timeline,
} from "@/registry/base-nova/lib/macos-session"
import { Macos, type MacosDevice } from "@/registry/base-nova/ui/macos"

declare global {
  interface Window {
    /** The capture handle: the scene's length, and a seek that resolves once the
     *  frame at `ms` is painted. scripts/macos-capture.ts drives it. */
    macosCapture?: { total: number; seek: (ms: number) => Promise<void> }
  }
}

/** One stage on a plain ground at a fixed width, seekable from outside. Every motion
 *  on the stage is a function of scene time, so the frame at `ms` is the same frame
 *  however it was reached. */
export function Capture() {
  const q = useSearchParams()
  const src = q.get("src")
  const [data, setData] = React.useState<{ timeline: Timeline; art: Art }>()
  // A seek is an event, not just a value: seeking to where the stage already is must
  // still commit, or the painted promise never resolves.
  const [{ ms }, setSeek] = React.useState({ ms: 0, n: 0 })
  const painted = React.useRef<() => void>(undefined)

  React.useEffect(() => {
    if (!src) throw new Error("?src=/macos/<app>/<scene>.json is required")
    const art = src.replace(/[^/]+\.json$/, "art.json")
    Promise.all([fetch(src), fetch(art)])
      .then(([t, a]) => Promise.all([t.json(), a.json()]))
      .then(([timeline, art]) => setData({ timeline, art }))
  }, [src])

  React.useEffect(() => {
    if (!data) return
    const clock = sceneClock(data.timeline)
    window.macosCapture = {
      total: clock.total,
      seek: (next) =>
        new Promise((resolve) => {
          painted.current = resolve
          setSeek((s) => ({ ms: next, n: s.n + 1 }))
        }),
    }
  }, [data])

  // After React commits a frame, two animation frames: layout, then paint.
  React.useEffect(() => {
    const done = painted.current
    if (!done) return
    painted.current = undefined
    requestAnimationFrame(() => requestAnimationFrame(() => done()))
  })

  if (!data) return null
  const total = sceneClock(data.timeline).total
  return (
    <div
      id="capture"
      className="inline-block p-10"
      style={{
        width: Number(q.get("width") ?? 1200),
        background: q.get("ground") ?? "#0b0b0d",
      }}
    >
      <Macos
        timeline={data.timeline}
        art={data.art}
        progress={ms / total}
        accent={q.get("accent") ?? undefined}
        device={(q.get("device") as MacosDevice | null) ?? undefined}
        alt="capture"
      />
    </div>
  )
}
