// A coding agent's session as data: what the person asked, what the agent said, the
// tools it ran and what came back, and whether it is still working. The claude-code
// and codex skins draw the same entries in their own terminal UIs; a story (a macos
// timeline) or a page supplies them. Framework-free by contract.

export type AgentEntry =
  | { kind: "prompt"; text: string }
  | { kind: "say"; text: string }
  /** A tool call and its result, one line each. `result` empty while it runs. */
  | { kind: "tool"; name: string; arg: string; result: string[] }

/** The agent at work. Facts only; each skin words and draws its own working line. */
export interface AgentWork {
  /** How long it has worked, in the world's seconds (a shut lid's hours count). */
  seconds: number
  /** Time on screen since it started, in ms: the spinner and the shimmer run on it,
   *  so a frame drawn alone animates exactly like one played to. */
  ms: number
}

/** The turn over: how long it took, in the world's seconds. Each skin draws its own
 *  closing line ("✻ Sautéed for 8m 37s"). */
export interface AgentFinished {
  seconds: number
}

/** Output tokens an agent streams per second of work, near enough to what both
 *  CLIs count up while thinking and writing. */
const TOKENS_PER_SECOND = 60

/** "↓ 1.5k tokens": the running count Claude Code shows beside the elapsed time. */
export function formatTokens(seconds: number): string {
  const n = Math.round(Math.max(0, seconds) * TOKENS_PER_SECOND)
  return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`
}

/** What a skin draws: the transcript so far, the working line if any, and what is
 *  being typed into the prompt box. */
export interface AgentViewProps {
  entries: AgentEntry[]
  work: AgentWork | null
  /** The last turn's closing line, once it is done; null while working or idle. */
  finished?: AgentFinished | null
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
