// Claude Code's terminal UI, drawn from an agent-session: the welcome box, the
// transcript (prompts, ⏺ replies, ⏺ tool calls with their ⎿ results), the orange
// working line, and the prompt box. Presentational: it fills its box with the
// terminal's own monospace and text size, and reads like a terminal: from the top
// while it fits, the oldest lines scrolled away once it does not (a column-reverse
// box anchors its one child at the bottom, and the child's auto bottom margin takes
// any free space: at the top while it fits, anchored at the bottom with its top cut
// once it overflows). A page or a story supplies the entries.

import { cn } from "@/lib/utils"
import {
  type AgentEntry,
  type AgentViewProps,
  type AgentWork,
  formatElapsed,
  formatTokens,
  THINK_SECONDS,
} from "@/registry/base-nova/lib/agent-session"

/** Claude's own orange. */
const CLAUDE = "#d97757"

export function ClaudeCode({
  entries,
  work,
  finished,
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
          // biome-ignore lint/suspicious/noArrayIndexKey: a transcript is positional
          <Entry key={i} entry={e} />
        ))}
        {work && <Working work={work} request={entries.length} />}
        {finished && (
          <div className="text-[#8a8a8a]">
            ✻ {pick(PAST, entries.length)} for {formatElapsed(finished.seconds)}
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

/** The spinner's glyphs, played forth and back. */
const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽"]
const SPIN_MS = 120
/** The highlight's speed across the verb, and the dark stretch between passes. */
const SWEEP_MS_PER_CHAR = 70
const SWEEP_GAP = 8

/** One of `list` for the `n`th request: a hash, not a random call, so the server, the
 *  browser and a film draw the same word. */
function pick(list: string[], n: number): string {
  return list[(Math.imul(n + 1, 2654435761) >>> 0) % list.length] as string
}

/** What a finished turn says it did, grey: "✻ Sautéed for 8m 37s". */
const PAST = [
  "Baked",
  "Brewed",
  "Churned",
  "Cogitated",
  "Cooked",
  "Crunched",
  "Sautéed",
  "Worked",
]

/** The words Claude Code says it is working with, one drawn at random per request. */
const VERBS = [
  "Accomplishing",
  "Actioning",
  "Actualizing",
  "Baking",
  "Blanching",
  "Booping",
  "Brewing",
  "Calculating",
  "Cerebrating",
  "Channelling",
  "Churning",
  "Clauding",
  "Coalescing",
  "Cogitating",
  "Combobulating",
  "Computing",
  "Concocting",
  "Conjuring",
  "Considering",
  "Contemplating",
  "Cooking",
  "Crafting",
  "Creating",
  "Crunching",
  "Deciphering",
  "Deliberating",
  "Determining",
  "Discombobulating",
  "Divining",
  "Doing",
  "Effecting",
  "Elucidating",
  "Enchanting",
  "Envisioning",
  "Finagling",
  "Flibbertigibbeting",
  "Forging",
  "Forming",
  "Frolicking",
  "Generating",
  "Germinating",
  "Hatching",
  "Herding",
  "Honking",
  "Hustling",
  "Ideating",
  "Imagining",
  "Incubating",
  "Inferring",
  "Ionizing",
  "Jiving",
  "Manifesting",
  "Marinating",
  "Meandering",
  "Moseying",
  "Mulling",
  "Mustering",
  "Musing",
  "Noodling",
  "Percolating",
  "Perusing",
  "Philosophising",
  "Pondering",
  "Pontificating",
  "Processing",
  "Puttering",
  "Puzzling",
  "Reticulating",
  "Ruminating",
  "Scheming",
  "Schlepping",
  "Shimmying",
  "Shucking",
  "Simmering",
  "Smooshing",
  "Spelunking",
  "Spinning",
  "Stewing",
  "Sussing",
  "Synthesizing",
  "Thinking",
  "Tinkering",
  "Transmuting",
  "Unfurling",
  "Unravelling",
  "Vibing",
  "Wandering",
  "Whirring",
  "Wibbling",
  "Wizarding",
  "Working",
  "Wrangling",
]

/** What a request is doing by its age, as the CLI says it: nothing for a beat, then
 *  it thinks, longer and longer, until its output streams. */
function stage(request: number): string | null {
  if (request < 3) return null
  if (request < 10) return "thinking"
  if (request < 20) return "still thinking"
  if (request < THINK_SECONDS) return "thinking more"
  return null
}

/** "✻ Shimmying… (14s · still thinking)", later "(35s · ↓ 2.9k tokens)": the
 *  spinner breathes, a lighter band sweeps across the verb, the stage wears the
 *  verb's colour, and the token count shows once the turn has output. The verb
 *  changes with each request (every entry the transcript gains is the model asked
 *  again). The animation runs on `work.ms`, so a frame drawn alone is the frame
 *  played to. */
function Working({ work, request }: { work: AgentWork; request: number }) {
  const cycle = SPINNER.length * 2 - 2
  const step = Math.floor(work.ms / SPIN_MS) % cycle
  const glyph = SPINNER[step < SPINNER.length ? step : cycle - step]
  const verb = `${pick(VERBS, request)}…`
  const at = (work.ms / SWEEP_MS_PER_CHAR) % (verb.length + SWEEP_GAP)
  const doing = stage(work.request)
  return (
    <div>
      <span style={{ color: CLAUDE }}>{glyph} </span>
      {[...verb].map((ch, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: letters are positional
          key={i}
          style={{ color: Math.abs(i - at) < 1.5 ? "#f5c4b0" : CLAUDE }}
        >
          {ch}
        </span>
      ))}{" "}
      <span className="text-[#8a8a8a]">
        ({formatElapsed(work.seconds)}
        {work.tokens > 0 && ` · ↓ ${formatTokens(work.tokens)} tokens`}
        {doing && (
          <>
            {" · "}
            <span style={{ color: CLAUDE }}>{doing}</span>
          </>
        )}
        )
      </span>
    </div>
  )
}

function Entry({ entry: e }: { entry: AgentEntry }) {
  // The one tinted thing in the transcript: what you asked, as a full-width bar.
  if (e.kind === "prompt")
    return <div className="-mx-[1ch] bg-white/[0.1] px-[1ch]">{e.text}</div>
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
        <div key={i} className="flex text-[#9a9a9a]">
          {/* A fixed gutter: ⎿ is narrower than a cell in most monospace faces,
              so spaces cannot line the rows up. */}
          <span className="w-[5ch] shrink-0 pl-[2ch]">{i === 0 && "⎿"}</span>
          <span>{line.trimStart()}</span>
        </div>
      ))}
    </div>
  )
}
