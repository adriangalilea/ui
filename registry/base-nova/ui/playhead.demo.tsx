"use client"

import * as React from "react"
import { Sample } from "@/app/samples"
import { Playhead, usePlayhead } from "@/registry/base-nova/ui/playhead"

// #region reader
/** Any component on the contract: its own progress when given, else the driver's. */
function Reader({ progress }: { progress?: number }) {
  const p = usePlayhead(progress)
  return (
    <div className="h-2 w-64 overflow-hidden rounded-full bg-foreground/10">
      <div
        className="h-full bg-foreground/60"
        style={{ width: `${p * 100}%` }}
      />
    </div>
  )
}
// #endregion

/** A hand-made driver: a range input moves the playhead, the reader draws it. */
export default function PlayheadDemo() {
  const [at, setAt] = React.useState(0.4)
  return (
    <Sample
      name="driven"
      label="a driver provides the moment · a component reads it"
      with="reader"
    >
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          aria-label="playhead"
        />
        <Playhead at={at}>
          <Reader />
        </Playhead>
      </div>
    </Sample>
  )
}
