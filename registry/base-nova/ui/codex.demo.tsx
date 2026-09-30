import { Sample } from "@/app/samples"
import type { AgentEntry } from "@/registry/base-nova/lib/agent-session"
import { Codex } from "@/registry/base-nova/ui/codex"

// #region session
const ENTRIES: AgentEntry[] = [
  {
    kind: "prompt",
    text: "Refactor the invoice pipeline to stream, then run the tests.",
  },
  { kind: "say", text: "Reading the pipeline first." },
  {
    kind: "tool",
    name: "Bash",
    arg: "rg -n 'buildInvoice' src",
    result: ["src/invoice/pipeline.ts:42: export function buildInvoice("],
  },
]
// #endregion

export default function CodexDemo() {
  return (
    <Sample
      name="working"
      label="at work · a transcript and the working line"
      with="session"
    >
      <div className="h-[420px] rounded-xl bg-[#161617] p-5 font-mono text-[13px] leading-[1.45]">
        <Codex
          entries={ENTRIES}
          work={{ seconds: 64, ms: 0 }}
          draft=""
          cwd="~/invoices"
        />
      </div>
    </Sample>
  )
}
