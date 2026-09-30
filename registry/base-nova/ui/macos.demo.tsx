"use client"

import * as React from "react"
import { Sample } from "@/app/samples"
import artJson from "@/public/macos/awake/art.json"
import heroJson from "@/public/macos/awake/hero.json"
import lidYoursJson from "@/public/macos/awake/lid-yours.json"
import menuBarJson from "@/public/macos/awake/menu-bar.json"
import safetyNetsJson from "@/public/macos/awake/safety-nets.json"
import {
  type Art,
  frameAt,
  sceneClock,
  type Timeline,
} from "@/registry/base-nova/lib/macos-session"
import { ClaudeCode } from "@/registry/base-nova/ui/claude-code"
import { Codex } from "@/registry/base-nova/ui/codex"
import { Macos, type MacosDevice } from "@/registry/base-nova/ui/macos"
import { Player } from "@/registry/base-nova/ui/player"

// #region scenes
// Real timelines, not hand-written ones: awake compiles them from its scene scripts
// through its own engine (`mise scene` in the awake repo writes public/macos/awake/),
// and art.json is its glyphs and icon drawn by its own code. `mise scene:watch` there
// recompiles on every save, and this page picks the file up.
const SCENES = {
  hero: heroJson,
  "menu-bar": menuBarJson,
  "lid-yours": lidYoursJson,
  "safety-nets": safetyNetsJson,
} as Record<string, Timeline>
const ART = artJson as Art
// The agents a story may open in its terminal: the page picks the skins.
const AGENTS = { claude: ClaudeCode, codex: Codex }
// #endregion

export default function MacosDemo() {
  return (
    <div className="space-y-16">
      <Sample
        name="played"
        label="in a player · plays once, in view"
        with="scenes"
      >
        <Played
          timeline={SCENES["lid-yours"] as Timeline}
          alt="awake: a coding agent asks to survive lid close, you allow it from the menu, close the lid, and the Mac sleeps when the agent exits"
        />
      </Sample>
      <Sample
        name="macbook"
        label="on a macbook · the lid folds when the scene closes it"
        with="scenes"
      >
        <Played
          timeline={SCENES["safety-nets"] as Timeline}
          device="macbook"
          alt="awake: held awake with the lid shut in a bag, it sleeps when it gets too hot, and again when the battery runs low"
        />
      </Sample>
      <Sample
        name="display"
        label="on a display · the panel sleeps instead"
        with="scenes"
      >
        <Played
          timeline={SCENES["menu-bar"] as Timeline}
          device="display"
          alt="awake: right-click the cup, ⌃⌥⌘A or the awake command flip the same switch, and the menu shows what holds the Mac awake"
        />
      </Sample>
      <Sample name="studio" label="studio · pick, scrub, step" with="scenes">
        <Studio scenes={SCENES} art={ART} />
      </Sample>
    </div>
  )
}

/** A scene in the player: the stage draws, the player moves time through its clip. */
function Played({
  timeline,
  device,
  alt,
}: {
  timeline: Timeline
  device?: MacosDevice
  alt: string
}) {
  const clock = React.useMemo(() => sceneClock(timeline), [timeline])
  return (
    <Player clip={clock.clip} label={alt}>
      <Macos
        timeline={timeline}
        art={ART}
        agents={AGENTS}
        accent="#e7a13c"
        device={device}
        alt={alt}
      />
    </Player>
  )
}

/** The iteration surface: a scene at a chosen instant, its timeline as a list of steps
 *  to jump between, and play from wherever the cursor is. */
function Studio({
  scenes,
  art,
}: {
  scenes: Record<string, Timeline>
  art: Art
}) {
  const [name, setName] = React.useState(Object.keys(scenes)[0] as string)
  const [device, setDevice] = React.useState<MacosDevice | "screen">("macbook")
  const timeline = scenes[name] as Timeline
  const clock = React.useMemo(() => sceneClock(timeline), [timeline])
  const [ms, setMs] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)

  React.useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      setMs((v) => {
        const next = v + (now - last)
        if (next >= clock.total) setPlaying(false)
        return Math.min(clock.total, next)
      })
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, clock.total])

  const current = frameAt(timeline, clock, ms).step
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <Macos
          timeline={timeline}
          art={art}
          agents={AGENTS}
          progress={ms / clock.total}
          accent="#e7a13c"
          device={device === "screen" ? undefined : device}
          alt={`awake, scene ${name}`}
        />
        <div className="flex items-center gap-3 font-mono text-xs lowercase">
          <select
            className="rounded-md border border-border bg-transparent px-2 py-1"
            value={name}
            onChange={(e) => {
              setPlaying(false)
              setMs(0)
              setName(e.target.value)
            }}
            aria-label="scene"
          >
            {Object.keys(scenes).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <select
            className="rounded-md border border-border bg-transparent px-2 py-1"
            value={device}
            onChange={(e) =>
              setDevice(e.target.value as MacosDevice | "screen")
            }
            aria-label="device"
          >
            <option>macbook</option>
            <option>display</option>
            <option>screen</option>
          </select>
          <button
            type="button"
            className="w-14 rounded-md border border-border px-2 py-1"
            onClick={() => {
              if (ms >= clock.total) setMs(0)
              setPlaying((p) => !p)
            }}
          >
            {playing ? "pause" : "play"}
          </button>
          <input
            type="range"
            className="flex-1"
            min={0}
            max={clock.total}
            value={ms}
            onChange={(e) => {
              setPlaying(false)
              setMs(Number(e.target.value))
            }}
            aria-label="scene position"
          />
          <span className="w-24 text-right text-muted-foreground tabular-nums">
            {(ms / 1000).toFixed(1)}s / {(clock.total / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
      <ol className="max-h-[520px] space-y-px overflow-y-auto font-mono text-xs">
        {timeline.steps.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are positional
          <li key={i}>
            <button
              type="button"
              className={
                i === current
                  ? "w-full rounded bg-foreground/8 px-2 py-1 text-left"
                  : "w-full rounded px-2 py-1 text-left text-muted-foreground hover:bg-foreground/4"
              }
              onClick={() => {
                setPlaying(false)
                setMs(clock.ends[i] as number)
              }}
            >
              <span className="text-foreground/40 tabular-nums">
                {((clock.starts[i] as number) / 1000).toFixed(1)}
              </span>{" "}
              {s.kind}{" "}
              <span className="text-foreground/60">
                {s.text ?? s.glyph ?? s.keys ?? s.world?.clock ?? ""}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
