// A coding agent's session as data: what the person asked, what the agent said, the
// tools it ran and what came back, and whether it is still working. The claude-code
// and codex skins draw the same entries in their own terminal UIs; a story (a macos
// timeline) or a page supplies them. Framework-free by contract.

export type AgentEntry =
  | { kind: "prompt"; text: string }
  | { kind: "say"; text: string }
  /** A tool call and its result, one line each. `result` empty while it runs. */
  | { kind: "tool"; name: string; arg: string; result: string[] }

/** The agent at work: what it is doing, and for how long (already formatted). */
export interface AgentWork {
  label: string
  elapsed: string
}

/** What a skin draws: the transcript so far, the working line if any, and what is
 *  being typed into the prompt box. */
export interface AgentViewProps {
  entries: AgentEntry[]
  work: AgentWork | null
  draft: string
  /** The working directory the session was started in, shown in the header. */
  cwd?: string
  className?: string
}

/** "2h 14m", "3m 07s", "12s": how both CLIs say elapsed time, near enough. */
export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, "0")}s`
  return `${s}s`
}

// Runnable example: the claude-code and codex demos (the lib carries no runtime).
