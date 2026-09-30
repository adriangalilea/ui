"use client"

// A menu bar app, performed: the menu bar with the app's own glyph, its real menu, the
// terminal driving it, its banners, the chord pressed, the lid closing and the Mac
// going to sleep. Every word and pixel comes from the app (a timeline its own engine
// compiled, lib/macos-session); this draws a frame of it. Same {progress} contract as
// terminal and telegram-chat: pass `progress` (0..1) to scrub, omit it for the
// one-shot in-view autoplay. Display-only: role="img", zero focusables, the final
// frame under prefers-reduced-motion.
//
// The screen is laid out once at the width of a small Mac screen (STAGE_WIDTH) and
// scaled to whatever box holds it, so a menu keeps its real proportions from a phone to
// a hero, and the same screen fits a MacBook's 16:10 panel or a display's 16:9. On a
// MacBook (`device="macbook"`) the scene drives device-frame's hinge, so closing the
// lid closes the laptop.

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AgentViewProps } from "@/registry/base-nova/lib/agent-session"
import {
  type Art,
  type FocusKind,
  type Frame,
  focusSpans,
  frameAt,
  KEY_MS,
  lidTravel,
  type MenuRow,
  PRESS_MS,
  pointerAt,
  pointerTargets,
  type SceneClock,
  sceneClock,
  type TerminalLine,
  type Timeline,
  zoomAt,
} from "@/registry/base-nova/lib/macos-session"
import {
  LINE_HEIGHT,
  terminalPalette,
} from "@/registry/base-nova/lib/terminal-session"
import {
  MacbookFrame,
  StudioDisplayFrame,
} from "@/registry/base-nova/ui/device-frame"

/** The hardware around the screen. Absent: the screen alone, rounded. */
export type MacosDevice = "macbook" | "display"

export interface MacosProps {
  timeline: Timeline
  art: Art
  /** 0..1 scrub position. Omit for the one-shot in-view autoplay. */
  progress?: number
  /** The app's accent: menu highlight, terminal phosphor. */
  accent?: string
  /** A MacBook (the lid folds when the scene closes it) or a display (it sleeps). */
  device?: MacosDevice
  /** The coding agents a story may open in its terminal, by the name its timeline
   *  uses (`{ claude: ClaudeCode, codex: Codex }`): the page chooses the skins, so
   *  this component depends on none of them. */
  agents?: Record<string, React.ComponentType<AgentViewProps>>
  /** Accessible description (the stage is one picture). */
  alt: string
  className?: string
}

/** The design width, in CSS px: a 13-inch Mac at half scale, where a 13px menu reads
 *  as a menu. The height follows the box the screen is given. */
const STAGE_WIDTH = 960

/** The OS being depicted speaks in its own face, not the page's. */
const SYSTEM = "-apple-system, BlinkMacSystemFont, system-ui, sans-serif"

const ROW = "flex h-[22px] items-center gap-1.5 rounded-[5px] px-2 text-[13px]"

export function Macos({
  timeline,
  art,
  progress,
  accent = "#0a84ff",
  device,
  agents,
  alt,
  className,
}: MacosProps) {
  const clock = React.useMemo(() => sceneClock(timeline), [timeline])
  const controlled = progress !== undefined
  const [auto, setAuto] = React.useState(0)
  const root = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (controlled) return
    const el = root.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAuto(1)
      return
    }
    let frame = 0
    let last = 0
    let value = 0
    const tick = (now: number) => {
      value = Math.min(1, value + (now - last) / clock.total)
      last = now
      setAuto(value)
      if (value < 1) frame = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(frame)
        if (entry?.isIntersecting && value < 1) {
          last = performance.now()
          frame = requestAnimationFrame(tick)
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [controlled, clock.total])

  const ms =
    Math.min(1, Math.max(0, controlled ? (progress as number) : auto)) *
    clock.total
  const f = frameAt(timeline, clock, ms)
  // 0 = open, 1 = shut, in between while it moves.
  const travel = lidTravel(f, ms)
  const shut = f.world.lid === "closed" ? travel : 1 - travel
  const screen = (
    <Screen
      timeline={timeline}
      clock={clock}
      frame={f}
      ms={ms}
      shut={shut}
      art={art}
      accent={accent}
      agents={agents}
    />
  )
  const viewport = React.useRef<HTMLDivElement>(null)
  const camera = useCamera(viewport, timeline, clock, ms)
  // Every caption the story will show, so the line is as tall as its tallest from
  // the first frame and the page never moves under the reader.
  const captions = React.useMemo(
    () => [
      ...new Set(
        timeline.steps.flatMap((s) =>
          s.kind === "caption" && s.text ? [s.text] : [],
        ),
      ),
    ],
    [timeline],
  )
  const captionIn = Math.min(1, Math.max(0, (ms - f.captionSince) / 360))

  return (
    <div
      ref={root}
      data-slot="macos"
      className={cn("w-full", className)}
      role="img"
      aria-label={alt}
    >
      <div
        ref={viewport}
        aria-hidden="true"
        className="relative overflow-hidden [container-type:inline-size]"
      >
        <div
          data-slot="macos-camera"
          style={{
            transform: `scale(${camera.scale})`,
            transformOrigin: `${camera.x}px ${camera.y}px`,
          }}
        >
          {device === "macbook" ? (
            <MacbookFrame lid={shut}>{screen}</MacbookFrame>
          ) : device === "display" ? (
            <StudioDisplayFrame>{screen}</StudioDisplayFrame>
          ) : (
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
              {screen}
            </div>
          )}
        </div>
        {/* The world keeps its clock while the lid is shut: over the dark panel, or
            in the space the shut lid leaves. Time passing IS the story there. It
            lives only in the shut half of the lid's travel, never over a lit screen. */}
        <div
          data-slot="macos-lid-status"
          className="pointer-events-none absolute inset-x-0 top-0 bottom-[12%] flex flex-col items-center justify-center gap-[0.8cqw] font-mono text-[1.7cqw] text-foreground/70 lowercase tabular-nums"
          style={{ opacity: Math.max(0, shut * 2 - 1) }}
        >
          <span>
            lid closed · {f.world.clock} · {f.world.battery}%
          </span>
          <span className="text-foreground/45">
            {f.world.asleep ? "asleep" : "still awake"}
          </span>
        </div>
        {/* The presenter's overlays (the chord as keycaps, the mouse with the pressed
            button lit) sit over the camera, not in it: they stay in view while the
            camera closes in on what the input did. */}
        {f.key && <Keycaps keys={f.key.keys} age={ms - f.key.since} />}
        {f.click && (
          <Mouse
            button={f.click.button}
            age={ms - f.click.since}
            accent={accent}
          />
        )}
      </div>
      <div
        data-slot="macos-caption"
        className="mt-5 grid text-balance text-center text-[15px] text-foreground/80 leading-relaxed"
      >
        {captions.map((c) => (
          <p key={c} className="invisible [grid-area:1/1]">
            {c}
          </p>
        ))}
        <p
          className="[grid-area:1/1]"
          style={{
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 4}px)`,
          }}
        >
          {f.caption}
        </p>
      </div>
    </div>
  )
}

/** One frame of the Mac's screen, filling its box: laid out at STAGE_WIDTH and as
 *  tall as the box's shape allows, then scaled to it. */
function Screen({
  timeline,
  clock,
  frame: f,
  ms,
  shut,
  art,
  accent,
  agents,
}: {
  timeline: Timeline
  clock: SceneClock
  frame: Frame
  ms: number
  shut: number
  art: Art
  accent: string
  agents: MacosProps["agents"]
}) {
  const app = timeline.app
  const box = React.useRef<HTMLDivElement>(null)
  const stage = React.useRef<HTMLDivElement>(null)
  const size = useBox(box)
  const scale = size.width / STAGE_WIDTH
  const pointer = usePointer(stage, timeline, clock, ms, f)
  // A right-click presses the status item for a beat, as the menu bar does.
  const pressed =
    f.menu !== null ||
    (f.click?.button === "right" && ms - f.click.since < PRESS_MS + 120)
  return (
    <div
      ref={box}
      data-slot="macos-screen"
      className="absolute inset-0 overflow-hidden"
    >
      {scale > 0 && (
        <div
          ref={stage}
          data-slot="macos-stage"
          className="absolute top-0 left-0 origin-top-left bg-[radial-gradient(120%_90%_at_20%_0%,color-mix(in_oklab,var(--ag-macos-accent)_22%,#1c1c22),#101014_70%)] text-white"
          style={
            {
              width: STAGE_WIDTH,
              height: size.height / scale,
              transform: `scale(${scale})`,
              fontFamily: SYSTEM,
              "--ag-macos-accent": accent,
            } as React.CSSProperties
          }
        >
          <MenuBar
            app={app}
            glyph={art.glyphs[f.glyph]}
            open={pressed}
            clock={f.world.clock}
            battery={f.world.battery}
            charging={f.world.charging}
          >
            {f.menu && (
              <Menu
                rows={f.menu.rows}
                hover={f.menu.hover}
                pressed={f.menu.pressed}
              />
            )}
          </MenuBar>
          <TerminalWindow
            lines={f.terminal}
            typing={f.typing}
            accent={accent}
            agent={f.agent}
            Agent={f.agent ? agents?.[f.agent.name] : undefined}
          />
          {pointer && <Cursor x={pointer.x} y={pointer.y} />}
          {/* The panel sleeps with the lid shut. */}
          <div
            data-slot="macos-panel-off"
            className="absolute inset-0 z-[35] bg-black"
            style={{ opacity: shut }}
          />
          {f.banner && (
            <Banner
              icon={art.icon}
              app={app}
              text={f.banner.text}
              age={ms - f.banner.since}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Where the pointer waits before its first trip, in stage px: over the desktop,
 *  clear of the terminal. */
const POINTER_REST = { x: 740, y: 420 }

/** Measured pointer targets per timeline: the centre of the glyph, or of a row's
 *  title, in stage px from layout offsets (transforms do not move them). */
const PLACES = new WeakMap<Timeline, Map<string, { x: number; y: number }>>()
function pointerPlaces(timeline: Timeline) {
  const known = PLACES.get(timeline)
  if (known) return known
  const fresh = new Map<string, { x: number; y: number }>()
  PLACES.set(timeline, fresh)
  return fresh
}

function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  for (
    let e: HTMLElement | null = el;
    e && e !== root;
    e = e.offsetParent as HTMLElement | null
  ) {
    x += e.offsetLeft
    y += e.offsetTop
  }
  return { x, y }
}

/** The pointer, a pure function of scene time (`pointerTargets` + `pointerAt`):
 *  every click in the story is made by a visible mouse that travels there first.
 *  Null for a story that never clicks. */
function usePointer(
  stage: React.RefObject<HTMLDivElement | null>,
  timeline: Timeline,
  clock: SceneClock,
  ms: number,
  f: Frame,
) {
  const targets = React.useMemo(
    () => pointerTargets(timeline, clock),
    [timeline, clock],
  )
  const places = pointerPlaces(timeline)
  const [, measured] = React.useReducer((n: number) => n + 1, 0)
  React.useLayoutEffect(() => {
    const root = stage.current
    if (!root) return
    let changed = false
    const place = (
      key: string,
      selector: string,
      dx: (el: HTMLElement) => number,
    ) => {
      if (places.has(key)) return
      const el = root.querySelector<HTMLElement>(selector)
      if (!el) return
      const o = offsetIn(el, root)
      places.set(key, { x: o.x + dx(el), y: o.y + el.offsetHeight / 2 })
      changed = true
    }
    place(
      "glyph",
      '[data-slot="macos-status-item"]',
      (el) => el.offsetWidth / 2,
    )
    if (f.menu)
      for (const t of targets)
        if (t.key.startsWith(`row:${f.menu.step}:`))
          place(
            t.key,
            `[data-row="${t.key.split(":")[2]}"]`,
            () => 56, // over the title, where a hand would aim
          )
    if (changed) measured()
  })
  if (targets.length === 0) return null
  return pointerAt(targets, ms, (key) => places.get(key), POINTER_REST)
}

/** The macOS arrow, its tip at (x, y). */
function Cursor({ x, y }: { x: number; y: number }) {
  return (
    <svg
      data-slot="macos-cursor"
      aria-hidden="true"
      viewBox="0 0 14 21"
      className="pointer-events-none absolute z-[26] h-[24px] w-auto drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
      style={{ left: x - 1, top: y - 1 }}
    >
      <path
        d="M1 1 L1 16.5 L4.8 12.9 L7.6 19.4 L10.2 18.3 L7.5 12 L12.6 12 Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The camera, a pure function of scene time (`focusSpans` + `zoomAt`): the view
 *  closes in on the screen's top-right corner while a menu, a banner or a freshly
 *  changed glyph is up, and the corner stays put while the rest grows away from it.
 *  How far is measured, not tuned: the thing in focus (the menu with its open
 *  submenu, the banner, the glyph) must fit the view, so a tall menu gets less zoom
 *  than a lone glyph. Each focus is measured once, from layout offsets (transforms,
 *  this camera's and the lid's, do not move them), so a frame gets the same zoom
 *  whether it was played to, scrubbed to, or rendered alone by a film farm. */
const ZOOM_MAX = 3.2
const FOCUS_MARGIN = 20
const FOCUS_SLOT: Record<FocusKind, string> = {
  menu: '[data-slot="macos-menu"]',
  banner: '[data-slot="macos-banner"]',
  glyph: '[data-slot="macos-status-item"]',
}

/** Measured zoom per focus key, one table per timeline. The zoom is a ratio of the
 *  focus to the screen, both of which scale with the stage, so it holds at any size. */
const TARGETS = new WeakMap<Timeline, Map<string, number>>()
function zoomTargets(timeline: Timeline) {
  const known = TARGETS.get(timeline)
  if (known) return known
  const fresh = new Map<string, number>()
  TARGETS.set(timeline, fresh)
  return fresh
}

function useCamera(
  viewport: React.RefObject<HTMLDivElement | null>,
  timeline: Timeline,
  clock: SceneClock,
  ms: number,
) {
  const spans = React.useMemo(
    () => focusSpans(timeline, clock),
    [timeline, clock],
  )
  const targets = zoomTargets(timeline)
  const [corner, setCorner] = React.useState({ x: 0, y: 0 })
  const [, measured] = React.useReducer((n: number) => n + 1, 0)
  const span = spans.find((s) => ms >= s.start && ms < s.end)
  React.useLayoutEffect(() => {
    const vp = viewport.current
    const box = vp?.querySelector<HTMLElement>('[data-slot="macos-screen"]')
    const stage = vp?.querySelector<HTMLElement>('[data-slot="macos-stage"]')
    if (!vp || !box || !stage) return
    const offset = (el: HTMLElement, root: HTMLElement) => {
      let x = 0
      let y = 0
      for (
        let e: HTMLElement | null = el;
        e && e !== root;
        e = e.offsetParent as HTMLElement | null
      ) {
        x += e.offsetLeft
        y += e.offsetTop
      }
      return { x, y }
    }
    const o = offset(box, vp)
    const x = o.x + box.offsetWidth
    if (x !== corner.x || o.y !== corner.y) setCorner({ x, y: o.y })
    if (!span?.kind || targets.has(span.key)) return
    let left = STAGE_WIDTH
    let bottom = 0
    for (const el of stage.querySelectorAll<HTMLElement>(
      FOCUS_SLOT[span.kind],
    )) {
      const p = offset(el, stage)
      left = Math.min(left, p.x - FOCUS_MARGIN)
      bottom = Math.max(bottom, p.y + el.offsetHeight + FOCUS_MARGIN)
    }
    if (bottom === 0) return
    const perDesign = box.offsetWidth / STAGE_WIDTH
    targets.set(
      span.key,
      Math.max(
        1,
        Math.min(
          ZOOM_MAX,
          x / ((STAGE_WIDTH - left) * perDesign),
          (vp.offsetHeight - o.y) / (bottom * perDesign),
        ),
      ),
    )
    measured()
  })
  return {
    scale: zoomAt(spans, ms, (key) => targets.get(key) ?? 1),
    x: corner.x,
    y: corner.y,
  }
}

/** A box's size, measured: the one fact CSS cannot divide by. */
function useBox(box: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  React.useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [box])
  return size
}

function MenuBar({
  app,
  glyph,
  open,
  clock,
  battery,
  charging,
  children,
}: {
  app: string
  glyph: { light: string; dark: string } | undefined
  open: boolean
  clock: string
  battery: number
  charging: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="macos-menubar"
      className="relative z-10 flex h-[26px] items-center justify-end gap-3.5 bg-black/25 px-3 text-[13px] backdrop-blur-xl"
    >
      <span className="mr-auto font-semibold">Terminal</span>
      <span
        data-slot="macos-status-item"
        className={cn(
          "relative flex h-[22px] items-center rounded-[5px] px-1.5",
          open && "bg-white/20",
        )}
      >
        {glyph && (
          // biome-ignore lint/performance/noImgElement: the app's own glyph as an inline data URL
          <img src={glyph.dark} alt={app} className="h-[16px] w-auto" />
        )}
        {children}
      </span>
      <BatteryGlyph percent={battery} charging={charging} />
      <span className="tabular-nums">{clock}</span>
    </div>
  )
}

function BatteryGlyph({
  percent,
  charging,
}: {
  percent: number
  charging: boolean
}) {
  return (
    <span className="flex items-center gap-1.5 tabular-nums">
      <span className="text-[12px] text-white/80">{percent}%</span>
      <span className="relative flex h-[11px] w-[23px] items-center rounded-[3px] border border-white/50 p-[1.5px]">
        <span
          className={cn(
            "h-full rounded-[1.5px]",
            percent <= 20 && !charging ? "bg-[#ff453a]" : "bg-white",
          )}
          style={{ width: `${Math.max(6, percent)}%` }}
        />
        <span className="-right-[3px] absolute h-[4px] w-[1.5px] rounded-r-sm bg-white/50" />
        {charging && (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-black">
            ⚡
          </span>
        )}
      </span>
    </span>
  )
}

/** NSMenu, drawn: a check column, key equivalents at the end, submenus opening to
 *  the side with room (a status menu sits near the screen's right edge). */
function Menu({
  rows,
  hover,
  pressed,
  parent,
}: {
  rows: MenuRow[]
  hover: number[] | null
  pressed: number[] | null
  /** The row of the menu this one opens from; absent for the menu itself. */
  parent?: number
}) {
  const sub = parent !== undefined
  const here = hover?.[0]
  return (
    <div
      data-slot="macos-menu"
      className={cn(
        "absolute z-20 min-w-[240px] whitespace-nowrap rounded-[11px] border border-white/10 bg-[#2a2a2e]/85 p-[5px] text-white shadow-[0_12px_40px_rgb(0_0_0/0.5)] backdrop-blur-2xl",
        sub ? "top-[-5px] right-full mr-[3px]" : "top-[25px] right-0",
      )}
    >
      {rows.map((row, i) => {
        if (row.separator)
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, as in NSMenu
          return <div key={i} className="mx-2 my-[5px] h-px bg-white/12" />
        const lit = here === i && !row.disabled
        const flash = pressed?.[0] === i && pressed.length === 1
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, as in NSMenu
            key={i}
            data-slot="macos-menu-row"
            data-row={sub ? `${parent}.${i}` : `${i}`}
            className={cn(
              ROW,
              "relative",
              row.disabled && "text-white/40",
              lit && "bg-(--ag-macos-accent) text-white",
              flash && "bg-(--ag-macos-accent)/60",
            )}
          >
            <span className="w-3 text-[11px]">{row.checked ? "✓" : ""}</span>
            <span className="mr-6 flex-1">{row.title}</span>
            {row.chord && (
              <span className={cn("text-white/45", lit && "text-white/80")}>
                {row.chord}
              </span>
            )}
            {row.submenu && (
              <span className={cn("text-white/45", lit && "text-white/80")}>
                ›
              </span>
            )}
            {row.submenu && here === i && (
              <Menu
                rows={row.submenu}
                hover={hover && hover.length > 1 ? [hover[1] as number] : null}
                pressed={
                  pressed && pressed.length > 1 ? [pressed[1] as number] : null
                }
                parent={i}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TerminalWindow({
  lines,
  typing,
  accent,
  agent,
  Agent,
}: {
  lines: TerminalLine[]
  typing: { text: string; chars: number } | null
  accent: string
  agent: Frame["agent"]
  Agent: React.ComponentType<AgentViewProps> | undefined
}) {
  // A coding agent owns the whole terminal while it runs, in its own colours: a
  // plain dark terminal, not the app's phosphor.
  if (agent && Agent)
    return (
      <div
        data-slot="macos-terminal"
        className="absolute top-[72px] left-[48px] flex h-[400px] w-[620px] flex-col overflow-hidden rounded-[12px] border border-white/10 bg-[#161617] shadow-[0_20px_60px_rgb(0_0_0/0.45)]"
        style={{
          fontFamily: "var(--font-mono, Menlo, Monaco, monospace)",
          fontSize: 12.5,
          lineHeight: 1.45,
        }}
      >
        <div className="flex shrink-0 items-center gap-2 bg-[#222224] px-4 py-2.5">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-2.5 rounded-full bg-white/15" />
          ))}
        </div>
        <div className="min-h-0 flex-1 px-4 pt-3 pb-3">
          <Agent
            entries={agent.entries}
            work={agent.work}
            draft={agent.draft}
            cwd={agent.cwd}
          />
        </div>
      </div>
    )
  const p = terminalPalette(accent)
  const line = (l: TerminalLine, key: React.Key) => (
    <div
      key={key}
      style={{
        color:
          l.kind === "muted"
            ? p.muted
            : l.kind === "command"
              ? p.command
              : p.accent,
      }}
    >
      {l.kind === "command" && <span style={{ color: p.prompt }}>$ </span>}
      {l.text}
    </div>
  )
  return (
    <div
      data-slot="macos-terminal"
      className="absolute top-[88px] left-[64px] flex h-[340px] w-[560px] flex-col overflow-hidden rounded-[12px] border border-white/10 shadow-[0_20px_60px_rgb(0_0_0/0.45)]"
      style={{
        background: p.bg,
        fontFamily: "var(--font-mono, Menlo, Monaco, monospace)",
        fontSize: 13,
        lineHeight: LINE_HEIGHT,
      }}
    >
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2.5"
        style={{ background: p.bar }}
      >
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="size-2.5 rounded-full"
            style={{ background: p.dot }}
          />
        ))}
      </div>
      {/* A terminal: from the top while it fits, the oldest lines scrolled away
          once it does not (column-reverse puts its one child at the top and clips
          overflow at the top). */}
      <div className="flex min-h-0 flex-1 flex-col-reverse justify-end overflow-hidden whitespace-pre-wrap px-5 pt-3 pb-4">
        <div>
          {lines.map(line)}
          <div>
            <span style={{ color: p.prompt }}>$ </span>
            {typing && (
              <span style={{ color: p.command }}>
                {typing.text.slice(0, typing.chars)}
              </span>
            )}
            <span style={{ color: p.dot }}>█</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A notification banner, sliding in from the right edge and out again. Its motion is
 *  a function of its age, so a scrubbed frame and a played one are the same frame. */
function Banner({
  icon,
  app,
  text,
  age,
}: {
  icon: string
  app: string
  text: string
  age: number
}) {
  const enter = Math.min(1, age / 320)
  const ease = 1 - (1 - enter) ** 3
  return (
    <div
      data-slot="macos-banner"
      className="absolute top-[36px] right-[12px] z-30 flex w-[340px] items-start gap-3 rounded-[18px] border border-white/10 bg-[#2a2a2e]/85 p-3 text-white shadow-[0_12px_40px_rgb(0_0_0/0.5)] backdrop-blur-2xl"
      style={{ transform: `translateX(${(1 - ease) * 380}px)` }}
    >
      {/* biome-ignore lint/performance/noImgElement: the app's own icon as an inline data URL */}
      <img src={icon} alt="" className="size-9 shrink-0" />
      <div className="min-w-0 text-[13px] leading-snug">
        <div className="font-semibold">{app}</div>
        <div className="text-white/80">{text}</div>
      </div>
    </div>
  )
}

/** Where the presenter's overlays sit: the bottom-left corner of the view. The
 *  camera only ever closes in on the top-right corner and everything it shows grows
 *  down and to the left from there, so this is the one place no menu, banner or
 *  glyph ever reaches. Sized to the viewport (cqw), outside the scaled screen. */
const OVERLAY = "absolute bottom-[14%] left-[5%] z-30 origin-bottom-left"

/** The chord as keycaps, popping up where a presenter's key overlay would. */
function Keycaps({ keys, age }: { keys: string; age: number }) {
  const t = Math.min(1, age / 160)
  const out = Math.max(0, (age - (KEY_MS - 260)) / 260)
  return (
    <div
      data-slot="macos-keycaps"
      className={cn(OVERLAY, "flex gap-[0.7cqw]")}
      style={{
        opacity: Math.min(t, 1 - out),
        transform: `scale(${0.92 + 0.08 * t})`,
      }}
    >
      {[...keys].map((k, i) => (
        <kbd
          // biome-ignore lint/suspicious/noArrayIndexKey: a chord is positional
          key={i}
          className="flex h-[5cqw] min-w-[5cqw] items-center justify-center rounded-[1cqw] border border-white/15 bg-neutral-800/85 px-[1.2cqw] font-medium text-[2.3cqw] text-white shadow-[0_2px_0_rgb(255_255_255/0.08),0_8px_24px_rgb(0_0_0/0.4)] backdrop-blur-xl"
          style={{ fontFamily: SYSTEM }}
        >
          {k}
        </kbd>
      ))}
    </div>
  )
}

/** The mouse, the keycaps' counterpart: the button that was pressed lights in the
 *  accent, so a right-click reads as one, where the pointer alone cannot say which
 *  button went down. Same place and timing as the keycaps. */
function Mouse({
  button,
  age,
  accent,
}: {
  button: "left" | "right"
  age: number
  accent: string
}) {
  const t = Math.min(1, age / 160)
  const out = Math.max(0, (age - (KEY_MS - 260)) / 260)
  const lit = (side: "left" | "right") =>
    side === button ? accent : "rgb(255 255 255 / 0.06)"
  return (
    <div
      data-slot="macos-mouse"
      className={cn(
        OVERLAY,
        "flex items-center gap-[1cqw] rounded-[1.2cqw] border border-white/15 bg-neutral-800/85 px-[1.4cqw] py-[1cqw] shadow-[0_8px_24px_rgb(0_0_0/0.4)] backdrop-blur-xl",
      )}
      style={{
        opacity: Math.min(t, 1 - out),
        transform: `scale(${0.92 + 0.08 * t})`,
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 36" className="h-[4.6cqw] w-auto">
        <path d="M12 1 A11 11 0 0 0 1 12 L1 14 L12 14 Z" fill={lit("left")} />
        <path
          d="M12 1 A11 11 0 0 1 23 12 L23 14 L12 14 Z"
          fill={lit("right")}
        />
        <rect
          x="1"
          y="1"
          width="22"
          height="34"
          rx="11"
          fill="none"
          stroke="rgb(255 255 255 / 0.7)"
          strokeWidth="1.5"
        />
        <path
          d="M12 1 L12 14 M1 14 L23 14"
          stroke="rgb(255 255 255 / 0.45)"
          strokeWidth="1.2"
        />
      </svg>
      <span
        className="font-medium text-[2cqw] text-white"
        style={{ fontFamily: SYSTEM }}
      >
        {button === "right" ? "right-click" : "click"}
      </span>
    </div>
  )
}
