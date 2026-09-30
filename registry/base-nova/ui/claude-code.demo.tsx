"use client"

import * as React from "react"
import { Sample } from "@/app/samples"
import type { AgentEntry } from "@/registry/base-nova/lib/agent-session"
import { ClaudeCode } from "@/registry/base-nova/ui/claude-code"

// #region session
const ENTRIES: AgentEntry[] = [
  { kind: "prompt", text: "Migrate billing to the v2 API and run the tests." },
  { kind: "say", text: "I'll start with the client, then the call sites." },
  {
    kind: "tool",
    name: "Read",
    arg: "src/billing/client.ts",
    result: ["Read 214 lines"],
  },
  {
    kind: "tool",
    name: "Update",
    arg: "src/billing/client.ts",
    result: ["Updated src/billing/client.ts with 38 additions and 12 removals"],
  },
]
// #endregion

/** Time since the demo mounted: the working line is a function of it. */
function useMs() {
  const [ms, setMs] = React.useState(0)
  React.useEffect(() => {
    const t0 = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      setMs(now - t0)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  return ms
}

export default function ClaudeCodeDemo() {
  const ms = useMs()
  return (
    <Sample
      name="working"
      label="at work · a transcript and the working line"
      with="session"
    >
      <div className="h-[420px] rounded-xl bg-[#161617] p-5 font-mono text-[13px] leading-[1.45]">
        <ClaudeCode
          entries={ENTRIES}
          work={{ seconds: 192 + ms / 1000, ms }}
          draft=""
          cwd="~/billing"
        />
      </div>
    </Sample>
  )
}
