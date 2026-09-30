// OpenAI Codex CLI's terminal UI, drawn from an agent-session: the header box, the
// transcript (› prompts, • replies, • Ran commands with their └ output), the working
// line, and the composer. Presentational: it fills its box with the terminal's own
// monospace and text size, and reads like a terminal: from the top while it fits,
// the oldest lines scrolled away once it does not (a column-reverse box anchors its
// one child at the bottom, and the child's auto bottom margin takes any free space:
// at the top while it fits, anchored at the bottom with its top cut once it
// overflows). A page or a story supplies the entries.

import { cn } from "@/lib/utils"
import {
  type AgentEntry,
  type AgentViewProps,
  formatElapsed,
} from "@/registry/base-nova/lib/agent-session"

export function Codex({
  entries,
  work,
  draft,
  cwd = "~",
  className,
}: AgentViewProps) {
  return (
    <div
      data-slot="codex"
      className={cn(
        "flex h-full min-h-0 flex-col-reverse overflow-hidden whitespace-pre-wrap text-[#e6e6e6]",
        className,
      )}
    >
      <div className="mb-auto flex flex-col gap-[0.9em]">
        <div className="self-start rounded-[6px] border border-[#4a4a4a] px-[1.2ch] py-[0.5em]">
          <div>
            <span className="text-[#8a8a8a]">{">_ "}</span>
            <span className="font-semibold">OpenAI Codex</span>
          </div>
          <div className="text-[#8a8a8a]">
            {"\nmodel:     gpt-5-codex\ndirectory: "}
            {cwd}
          </div>
        </div>
        {entries.map((e, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a transcript is positional
          <Entry key={i} entry={e} />
        ))}
        {work && (
          <div>
            <span className="text-[#8a8a8a]">◦ </span>
            <span className="font-semibold">Working</span>{" "}
            <span className="text-[#8a8a8a]">
              ({formatElapsed(work.seconds)} • esc to interrupt)
            </span>
          </div>
        )}
        <div>
          <div className="bg-white/[0.06] px-[1ch] py-[0.3em]">
            <span className="text-[#8a8a8a]">{"› "}</span>
            {draft || (
              <span className="text-[#6f6f6f]">Ask Codex to do anything</span>
            )}
          </div>
          <div className="px-[1ch] pt-[0.2em] text-[#6f6f6f]">
            {"⏎ send   ⌃J newline   ⌃T transcript   ⌃C quit"}
          </div>
        </div>
      </div>
    </div>
  )
}

function Entry({ entry: e }: { entry: AgentEntry }) {
  if (e.kind === "prompt")
    return (
      <div className="-mx-[1ch] bg-white/[0.06] px-[1ch] py-[0.2em]">
        <span className="text-[#8a8a8a]">{"› "}</span>
        {e.text}
      </div>
    )
  if (e.kind === "say")
    return (
      <div className="flex gap-[1ch]">
        <span className="text-[#8a8a8a]">•</span>
        <span>{e.text}</span>
      </div>
    )
  return (
    <div>
      <div className="flex gap-[1ch]">
        <span className="text-[#8a8a8a]">•</span>
        <span>
          <span className="font-semibold">
            {e.result.length ? "Ran" : "Running"}
          </span>{" "}
          {e.arg}
        </span>
      </div>
      {e.result.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: output lines are positional
        <div key={i} className="text-[#9a9a9a]">
          {i === 0 ? "  └ " : "    "}
          {line.trimStart()}
        </div>
      ))}
    </div>
  )
}
