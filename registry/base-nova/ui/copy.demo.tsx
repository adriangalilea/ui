"use client"

import * as React from "react"
import { Copy, useCopy } from "@/registry/base-nova/ui/copy"

export default function Demo() {
  const [note, setNote] = React.useState("edit me, then copy")
  // The hook, for a control that is not the button: any element can be the affordance.
  const live = useCopy(() => note)
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="font-mono text-xs text-muted-foreground">
          beside a value
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-sidebar px-3 py-2">
          <code className="font-mono text-xs">npx shadcn add @ag/copy</code>
          <Copy value="npx shadcn add @ag/copy" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="font-mono text-xs text-muted-foreground">
          with the word, for a place with room
        </div>
        <Copy value="the quick brown fox" label />
      </div>

      <div className="space-y-3">
        <div className="font-mono text-xs text-muted-foreground">
          a LIVE value, read at press time
        </div>
        <div className="flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-72 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={live.copy}
            className="rounded-lg border border-border px-3 py-2 font-mono text-xs transition-colors hover:bg-sidebar"
          >
            {live.copied ? "copied" : "copy the field"}
          </button>
        </div>
        <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/70">
          Passing a function instead of a string reads the value when it is
          pressed, so a control never copies what the field said a render ago.
          An empty value is not copied at all: writing one would wipe whatever
          the reader already had.
        </p>
      </div>
    </div>
  )
}
