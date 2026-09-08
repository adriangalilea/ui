"use client"

import { useState } from "react"
import { Copy } from "@/registry/base-nova/ui/copy"

export function CopyLiveExample() {
  const [note, setNote] = useState("a little context goes a long way")
  return (
    <div className="max-w-xl space-y-3">
      <label htmlFor="copy-note" className="block text-sm text-foreground/80">
        Try changing the note
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-2 pl-4 focus-within:border-foreground/25">
        <input
          id="copy-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none"
        />
        <Copy value={() => note} label disabled={!note} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Reads the current value when pressed. An empty field leaves your
        clipboard intact.
      </p>
    </div>
  )
}
