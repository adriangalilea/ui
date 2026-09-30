// Claude Code's terminal UI, drawn from an agent-session: the welcome box, the
// transcript (prompts, ⏺ replies, ⏺ tool calls with their ⎿ results), the orange
// working line, and the prompt box. Presentational: it fills its box with the
// terminal's own monospace and text size, and reads like a terminal: from the top
// while it fits, the oldest lines scrolled away once it does not (a column-reverse
// box anchors its one child at the bottom, and the child's auto bottom margin takes
// any free space: at the top while it fits, anchored at the bottom with its top cut
// once it overflows). A page or a story supplies the entries.

import { cn } from "@/lib/utils"
import type {
  AgentEntry,
  AgentViewProps,
} from "@/registry/base-nova/lib/agent-session"

/** Claude's own orange. */
const CLAUDE = "#d97757"

export function ClaudeCode({
  entries,
  work,
  draft,
  cwd = "~",
  className,
}: AgentViewProps) {
  return (
    <div
      data-slot="claude-code"
      className={cn(
        "flex h-full min-h-0 flex-col-reverse overflow-hidden whitespace-pre-wrap text-[#e6e6e6]",
        className,
      )}
    >
      <div className="mb-auto flex flex-col gap-[0.9em]">
        <div
          className="rounded-[6px] border px-[1.2ch] py-[0.5em]"
          style={{ borderColor: CLAUDE }}
        >
          <div>
            <span style={{ color: CLAUDE }}>✻</span>{" "}
            <span className="font-semibold">Welcome to Claude Code!</span>
          </div>
          <div className="text-[#8a8a8a]">
            {"\n  /help for help, /status for your current setup\n\n  cwd: "}
            {cwd}
          </div>
        </div>
        {entries.map((e, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a transcript is positional
            key={i}
            className={cn(
              "-mx-[1ch] rounded-[4px] px-[1ch]",
              e.fresh && "bg-[#d97757]/15",
            )}
          >
            <Entry entry={e} />
          </div>
        ))}
        {work && (
          <div style={{ color: CLAUDE }}>
            ✻ {work.label}…{" "}
            <span className="text-[#8a8a8a]">
              ({work.elapsed} · esc to interrupt)
            </span>
          </div>
        )}
        <div>
          <div className="rounded-[6px] border border-[#5a5a5a] px-[1ch] py-[0.2em]">
            <span className="text-[#8a8a8a]">{"> "}</span>
            {draft}
            <span className="text-[#8a8a8a]">▌</span>
          </div>
          <div className="px-[1ch] text-[#6f6f6f]">? for shortcuts</div>
        </div>
      </div>
    </div>
  )
}

function Entry({ entry: e }: { entry: AgentEntry }) {
  if (e.kind === "prompt")
    return <div className="text-[#a0a0a0]">{`> ${e.text}`}</div>
  if (e.kind === "say")
    return (
      <div className="flex gap-[1ch]">
        <span>⏺</span>
        <span>{e.text}</span>
      </div>
    )
  const done = e.result.length > 0
  return (
    <div>
      <div className="flex gap-[1ch]">
        <span style={{ color: done ? "#4eba65" : "#8a8a8a" }}>⏺</span>
        <span>
          <span className="font-semibold">{e.name}</span>({e.arg})
        </span>
      </div>
      {e.result.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: output lines are positional
        <div key={i} className="text-[#9a9a9a]">
          {i === 0 ? "  ⎿  " : "     "}
          {line.trimStart()}
        </div>
      ))}
    </div>
  )
}
