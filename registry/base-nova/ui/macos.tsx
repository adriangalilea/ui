"use client"

// A menu bar app, performed: the menu bar with the app's own glyph, its real menu, the
// terminal driving it, its banners, the chord pressed, the lid closing and the Mac
// going to sleep. Every word and pixel comes from the app (a timeline its own engine
// compiled, lib/macos-session); this draws the frame at a moment, and something else
// moves time: inside `<Player clip={sceneClock(timeline).clip}>` it plays, inside a
// scroll stage it scrolls, with a fixed `progress` it is a still (a link card, a
// film frame).
// Display-only: role="img", zero focusables.
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
  LOCK_MS,
  lapseAt,
  lidTravel,
  type MenuRow,
  PRESS_MS,
  pointerAt,
  pointerTargets,
  type SceneClock,
  type Surface,
  sceneClock,
  type TerminalLine,
  type Timeline,
  zoomAt,
} from "@/registry/base-nova/lib/macos-session"
import type { Person } from "@/registry/base-nova/lib/person"
import {
  LINE_HEIGHT,
  terminalPalette,
} from "@/registry/base-nova/lib/terminal-session"
import { Avatar } from "@/registry/base-nova/ui/avatar"
import {
  MacbookFrame,
  StudioDisplayFrame,
} from "@/registry/base-nova/ui/device-frame"
import { Kbd, KeysText } from "@/registry/base-nova/ui/kbd"
import { usePlayhead } from "@/registry/base-nova/ui/playhead"

/** The hardware around the screen. Absent: the screen alone, rounded. */
export type MacosDevice = "macbook" | "display"

export interface MacosProps {
  timeline: Timeline
  art: Art
  /** The moment drawn, 0..1 of the story, for a still. Inside a driver (a Player)
   *  omit it: the driver provides the moment. */
  progress?: number
  /** The app's accent: menu highlight, terminal phosphor. */
  accent?: string
  /** A MacBook (the lid folds when the scene closes it) or a display (it sleeps). */
  device?: MacosDevice
  /** The coding agents a story may open in its terminal, by the name its timeline
   *  uses (`{ claude: ClaudeCode, codex: Codex }`): the page chooses the skins, so
   *  this component depends on none of them. */
  agents?: Record<string, React.ComponentType<AgentViewProps>>
  /** The person this Mac belongs to, the account its lock screen shows: the page
   *  chooses who. Absent, the lock screen shows a silhouette and no name. */
  user?: Person
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

/** The viewer's own time, as an English Mac spells it: `menu` for the menu bar
 *  ("9:41 AM"), `time` for the lock screen ("9:41"), `date` above it ("Tuesday,
 *  September 30"). */
interface Now {
  menu: string
  time: string
  date: string
}

const MINUTE = 60_000
const minuteNow = () => Math.floor(Date.now() / MINUTE)
const tick = (changed: () => void) => {
  const id = setInterval(changed, 15_000)
  return () => clearInterval(id)
}

/** The current minute on the viewer's clock, in their timezone. Null on the
 *  server: its clock and timezone are not the viewer's, so its frame shows no time
 *  rather than a wrong one, and the browser fills it in at hydration. */
function useNow(): Now | null {
  const minute = React.useSyncExternalStore(tick, minuteNow, () => null)
  return React.useMemo(() => {
    if (minute === null) return null
    const at = new Date(minute * MINUTE)
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).formatToParts(at)
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value
    const time = `${part("hour")}:${part("minute")}`
    return {
      menu: `${time} ${part("dayPeriod")}`,
      time,
      date: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(at),
    }
  }, [minute])
}

export function Macos({
  timeline,
  art,
  progress,
  accent = "#0a84ff",
  device,
  agents,
  user,
  alt,
  className,
}: MacosProps) {
  const clock = React.useMemo(() => sceneClock(timeline), [timeline])
  const ms = usePlayhead(progress).at * clock.total
  const f = frameAt(timeline, clock, ms)
  // 0 = open, 1 = shut, in between while it moves.
  const travel = lidTravel(f, ms)
  const shut = f.world.lid === "closed" ? travel : 1 - travel
  const now = useNow()
  const screen = (
    <Screen
      timeline={timeline}
      clock={clock}
      now={now}
      frame={f}
      ms={ms}
      shut={shut}
      art={art}
      accent={accent}
      agents={agents}
      user={user}
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
  const lapse = lapseAt(f, ms)

  return (
    <div
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
        {/* Time passing IS the story behind a shut lid, so it takes the stage: the
            clock runs from where it was to where it lands like a time-lapse, the
            time covered counts up, the battery counts down. In the space the shut
            lid leaves (or over the dark panel), only in the shut half of the lid's
            travel, never over a lit screen. */}
        <div
          data-slot="macos-lid-status"
          className="pointer-events-none absolute inset-x-0 top-0 bottom-[12%] flex flex-col items-center justify-center gap-[1.2cqw] text-foreground tabular-nums"
          style={{ opacity: Math.max(0, shut * 2 - 1) }}
        >
          <span
            className="font-extralight text-[9cqw] leading-none tracking-tight"
            style={{ fontFamily: SYSTEM }}
          >
            {lapse.clock ?? now?.time}
          </span>
          <span className="font-mono text-[1.8cqw] text-foreground/70 lowercase">
            {lapse.gained && (
              <span className="text-foreground">{lapse.gained} · </span>
            )}
            {/* Heat is what a shut lid in a bag risks, so it is said here, where
                the viewer is looking while the screen is dark. */}
            {f.world.heat && (
              <span className="text-[#ff6b4a]">critical heat · </span>
            )}
            battery {lapse.battery}% ·{" "}
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
        {/* A shortcut in a caption is drawn as the keys it is; the reserved
            lines draw it too, so they are exactly as tall. */}
        {captions.map((c) => (
          <p key={c} className="invisible [grid-area:1/1]">
            <KeysText>{c}</KeysText>
          </p>
        ))}
        <p
          className="[grid-area:1/1]"
          style={{
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 4}px)`,
          }}
        >
          {f.caption && <KeysText>{f.caption}</KeysText>}
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
  now,
  frame: f,
  ms,
  shut,
  art,
  accent,
  agents,
  user,
}: {
  timeline: Timeline
  clock: SceneClock
  now: Now | null
  frame: Frame
  ms: number
  shut: number
  art: Art
  accent: string
  agents: MacosProps["agents"]
  user: Person | undefined
}) {
  const app = timeline.app
  const stage = React.useRef<HTMLDivElement>(null)
  const pointer = usePointer(stage, timeline, clock, ms, f)
  // A story that types nothing has no terminal on screen, and Finder in front.
  const typed = React.useMemo(
    () => timeline.steps.some((s) => TYPED.has(s.kind)),
    [timeline],
  )
  // The widest line the terminal will print, in characters: the window is sized
  // to hold it, so no line of the story ever wraps.
  const columns = React.useMemo(
    () =>
      Math.max(
        0,
        ...timeline.steps.map((s) =>
          s.kind === "command"
            ? (s.text?.length ?? 0) + 2
            : s.kind === "output" || s.kind === "muted"
              ? (s.text?.length ?? 0)
              : 0,
        ),
      ),
    [timeline],
  )
  // A right-click presses the status item for a beat, as the menu bar does; an
  // open menu or surface keeps it pressed.
  const pressed =
    f.menu !== null ||
    f.surface !== null ||
    (f.click?.button === "right" && ms - f.click.since < PRESS_MS + 120)
  const surface = f.surface && art.surfaces?.[f.surface.name]
  if (f.surface && !surface)
    throw new Error(`macos: no surface "${f.surface.name}" in art.surfaces`)
  return (
    <div
      data-slot="macos-screen"
      className="absolute inset-0 overflow-hidden [container-type:size]"
    >
      {/* The scale is the box's width over the design width, done by CSS
          (tan(atan2(a, b)) is a/b for two lengths), so the server's HTML already
          holds the opening frame at its true size: nothing waits for a measure. */}
      <div
        ref={stage}
        data-slot="macos-stage"
        className="absolute top-0 left-0 origin-top-left overflow-hidden bg-[#06070f] text-white"
        style={
          {
            width: STAGE_WIDTH,
            height: `calc(${STAGE_WIDTH}px * tan(atan2(100cqh, 100cqw)))`,
            transform: `scale(tan(atan2(100cqw, ${STAGE_WIDTH}px)))`,
            fontFamily: SYSTEM,
            "--ag-macos-accent": accent,
          } as React.CSSProperties
        }
      >
        <Wallpaper />
        <MenuBar
          app={app}
          front={typed ? "Terminal" : "Finder"}
          glyph={art.glyphs[f.glyph]}
          open={pressed}
          clock={f.world.clock ?? now?.menu}
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
        {typed && (
          <TerminalWindow
            columns={columns}
            lines={f.terminal}
            typing={f.typing}
            accent={accent}
            agent={f.agent}
            Agent={f.agent ? agents?.[f.agent.name] : undefined}
          />
        )}
        {f.surface && surface && (
          <SurfaceView
            surface={surface}
            open={f.surface}
            ms={ms}
            stage={stage}
          />
        )}
        {pointer && <Cursor x={pointer.x} y={pointer.y} />}
        <LockScreen
          locked={f.world.locked === true}
          since={f.lockSince}
          ms={ms}
          clock={f.world.clock ?? now?.time}
          date={f.world.date ?? now?.date}
          user={user}
          battery={f.world.battery}
          charging={f.world.charging}
        />
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

/** The steps that put something in a terminal: a story with none shows no terminal. */
const TYPED = new Set([
  "command",
  "output",
  "muted",
  "agent",
  "history",
  "prompt",
])

/** Where a surface hangs: its top this far under the menu bar (the arrow in the
 *  gap), kept this far inside the screen's edge. */
const SURFACE_TOP = 26 + 11
const SURFACE_EDGE = 8
const ARROW = { width: 22, height: 10 }

/** The app's surface hanging from its glyph, as an NSPopover hangs: centred under
 *  the status item unless that would leave the screen, then slid inside the edge
 *  with its arrow still on the glyph. The body is the app's clip, played in step
 *  with scene time: while the story moves forward it plays, anything else (a scrub, a
 *  still, a pause) seeks it to the exact second. */
function SurfaceView({
  surface,
  open,
  ms,
  stage,
}: {
  surface: Surface
  open: { name: string; from: number; since: number }
  ms: number
  stage: React.RefObject<HTMLDivElement | null>
}) {
  const [glyph, setGlyph] = React.useState<number | null>(null)
  React.useLayoutEffect(() => {
    const root = stage.current
    const item = root?.querySelector<HTMLElement>(
      '[data-slot="macos-status-item"]',
    )
    if (!root || !item) return
    const x = offsetIn(item, root).x + item.offsetWidth / 2
    if (x !== glyph) setGlyph(x)
  })
  const second = open.from + (ms - open.since) / 1000
  const video = React.useRef<HTMLVideoElement>(null)
  const last = React.useRef(ms)
  React.useEffect(() => {
    const v = video.current
    if (!v) return
    const forward = ms > last.current && ms - last.current < 250
    last.current = ms
    if (Math.abs(v.currentTime - second) > 0.15) v.currentTime = second
    if (forward && v.paused)
      v.play().catch((e: unknown) => {
        // A pause landing while play() is pending rejects it; that is the next
        // frame's decision, not an error.
        if (!(e instanceof DOMException && e.name === "AbortError")) throw e
      })
    if (!forward && !v.paused) v.pause()
  })
  // Unmeasured (the server's first frame), it waits unseen rather than guessing.
  if (glyph === null) return null
  const left = Math.min(
    Math.max(SURFACE_EDGE, glyph - surface.width / 2),
    STAGE_WIDTH - SURFACE_EDGE - surface.width,
  )
  const appear = Math.min(1, Math.max(0, (ms - open.since) / 160))
  return (
    <div
      data-slot="macos-surface"
      className="absolute z-20"
      style={{
        left,
        top: SURFACE_TOP,
        width: surface.width,
        height: surface.height,
        opacity: appear,
        transform: `translateY(${(1 - appear) * -4}px)`,
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${ARROW.width} ${ARROW.height + 1}`}
        className="absolute"
        style={{
          left: glyph - left - ARROW.width / 2,
          top: -ARROW.height,
          width: ARROW.width,
          height: ARROW.height + 1,
        }}
      >
        <path
          d={`M0 ${ARROW.height + 1} Q${ARROW.width / 4} ${ARROW.height + 1} ${ARROW.width / 2} 0 Q${(ARROW.width * 3) / 4} ${ARROW.height + 1} ${ARROW.width} ${ARROW.height + 1} Z`}
          fill={surface.background}
          stroke="rgb(255 255 255 / 0.1)"
        />
      </svg>
      <div
        className="size-full overflow-hidden rounded-[16px] border border-white/10 shadow-[0_18px_50px_rgb(0_0_0/0.5)]"
        style={{ background: surface.background }}
      >
        <video
          ref={video}
          src={surface.src}
          poster={surface.poster}
          muted
          playsInline
          preload="auto"
          className="size-full object-cover"
        />
      </div>
    </div>
  )
}

/** The desktop picture: an original, not Apple's (theirs are theirs), in the spirit
 *  of macOS 26's: deep blue night with a luminous sweep of violet and teal across it.
 *  Pure CSS, so it scales with the stage and costs no request. `dim` darkens it for
 *  the lock screen, which also softens it as a lock screen does. */
function Wallpaper({ dim = 0 }: { dim?: number }) {
  return (
    <div
      aria-hidden="true"
      data-slot="macos-wallpaper"
      className="absolute inset-0 overflow-hidden bg-[linear-gradient(165deg,#0b1230_0%,#070a1c_45%,#04050d_100%)]"
    >
      <div
        className="absolute rounded-[50%] blur-[70px]"
        style={{
          left: -180,
          top: 260,
          width: 900,
          height: 420,
          transform: "rotate(-18deg)",
          background:
            "conic-gradient(from 200deg at 55% 50%, #2f5dff 0deg, #7b4dff 80deg, #1fb6c9 170deg, #2f5dff 260deg, #1a2a80 360deg)",
          opacity: 0.75,
        }}
      />
      <div
        className="absolute rounded-[50%] blur-[40px]"
        style={{
          left: 120,
          top: 330,
          width: 760,
          height: 140,
          transform: "rotate(-14deg)",
          background:
            "linear-gradient(90deg, transparent, rgb(180 200 255 / 0.55), rgb(120 230 240 / 0.35), transparent)",
        }}
      />
      <div
        className="absolute rounded-full blur-[90px]"
        style={{
          right: -120,
          top: -160,
          width: 520,
          height: 420,
          background: "radial-gradient(closest-side, #1d6fd1, transparent)",
          opacity: 0.55,
        }}
      />
      {dim > 0 && (
        <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />
      )}
    </div>
  )
}

/** Wi-Fi at full strength, the lock screen's other status mark. */
function WifiGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 13" className="h-[12px] w-auto">
      <path
        d="M9 12.2 11.6 9.3a3.6 3.6 0 0 0-5.2 0Z M9 2.2c2.9 0 5.6 1.1 7.6 3l-1.6 1.8A8.6 8.6 0 0 0 9 4.6 8.6 8.6 0 0 0 3 7L1.4 5.2A11 11 0 0 1 9 2.2Zm0 3.6c1.9 0 3.6.7 4.9 1.9l-1.6 1.8A4.9 4.9 0 0 0 9 8.2c-1.3 0-2.4.5-3.3 1.3L4.1 7.7A7.2 7.2 0 0 1 9 5.8Z"
        fill="white"
      />
    </svg>
  )
}

/** macOS's lock screen, over everything: the wallpaper dimmed, the date and the
 *  time large, rounded and glassy, and at the bottom the person this Mac belongs to
 *  (their picture and name) over the glass password field. The Mac is awake behind
 *  it and nobody is at it; the top right keeps only Wi-Fi and the battery. It comes
 *  up and goes with a fade from `since`. */
function LockScreen({
  locked,
  since,
  ms,
  clock,
  date,
  user,
  battery,
  charging,
}: {
  locked: boolean
  since: number
  ms: number
  /** Absent only before the viewer's clock is known (the server's frame). */
  clock: string | undefined
  date: string | undefined
  user: Person | undefined
  battery: number
  charging: boolean
}) {
  const p = Math.min(1, Math.max(0, (ms - since) / LOCK_MS))
  const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2
  const shown = locked ? e : 1 - e
  if (shown === 0) return null
  return (
    <div
      data-slot="macos-lock"
      className="absolute inset-0 z-40 text-white"
      style={{ opacity: shown }}
    >
      <Wallpaper dim={0.28} />
      <div className="absolute top-[8px] right-[16px] flex items-center gap-[12px]">
        <WifiGlyph />
        <BatteryGlyph percent={battery} charging={charging} />
      </div>
      <div
        className="absolute inset-x-0 top-[70px] flex flex-col items-center"
        style={{ transform: `translateY(${(1 - shown) * 14}px)` }}
      >
        {date && (
          <div className="font-semibold text-[19px] text-white/90">{date}</div>
        )}
        {/* Glass rather than paint: white fading down through the letters, over
            the wallpaper's light. */}
        <div
          className="bg-[linear-gradient(180deg,rgb(255_255_255/0.97),rgb(255_255_255/0.62))] bg-clip-text font-semibold text-[136px] text-transparent tabular-nums leading-[0.98] tracking-[-0.015em] [filter:drop-shadow(0_4px_30px_rgb(0_0_0/0.22))]"
          style={{ fontFamily: `ui-rounded, "SF Pro Rounded", ${SYSTEM}` }}
        >
          {clock}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[38px] flex flex-col items-center">
        {/* The person's face is the studio's one face object (@ag/avatar, a plain
            picture without `full`), sized and ringed as the lock screen wears it;
            without a picture, macOS's silhouette. */}
        {user?.avatar ? (
          <Avatar
            src={user.avatar}
            alt={user.name}
            className="size-[50px] shadow-[0_6px_20px_rgb(0_0_0/0.35)] ring-[1.5px] ring-white/30"
          />
        ) : (
          <div className="size-[50px] rounded-full bg-[linear-gradient(180deg,#a3a7b3,#6b6f7c)] shadow-[0_6px_20px_rgb(0_0_0/0.35)] ring-[1.5px] ring-white/30">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-full p-[9px]"
            >
              <circle cx="12" cy="8.5" r="4.2" fill="rgb(255 255 255 / 0.95)" />
              <path
                d="M3.5 21.5c.8-4.4 4.3-7 8.5-7s7.7 2.6 8.5 7"
                fill="rgb(255 255 255 / 0.95)"
              />
            </svg>
          </div>
        )}
        {user && (
          <div className="mt-[8px] font-semibold text-[13px] text-white/95">
            {user.name}
          </div>
        )}
        <div className="mt-[12px] flex h-[28px] w-[184px] items-center justify-between rounded-full border border-white/25 bg-white/14 pr-[3px] pl-[13px] text-[12px] text-white/60 shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] backdrop-blur-2xl">
          Enter Password
          <span className="flex size-[22px] items-center justify-center rounded-full bg-white/20">
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-[10px]">
              <path
                d="M2 6h7.5M6.5 2.8 9.7 6 6.5 9.2"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <div className="mt-[9px] text-[11px] text-white/55">
          Touch ID or Enter Password
        </div>
      </div>
    </div>
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

function MenuBar({
  app,
  front,
  glyph,
  open,
  clock,
  battery,
  charging,
  children,
}: {
  app: string
  /** The frontmost app, whose name leads the menu bar. */
  front: string
  glyph: { light: string; dark: string } | undefined
  open: boolean
  /** Absent only before the viewer's clock is known (the server's frame). */
  clock: string | undefined
  battery: number
  charging: boolean
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="macos-menubar"
      className="relative z-10 flex h-[26px] items-center justify-end gap-[2px] bg-black/25 px-2 text-[13px] backdrop-blur-xl"
    >
      <span className="mr-auto px-2 font-semibold">{front}</span>
      <span
        data-slot="macos-status-item"
        className={cn("relative", STATUS_ITEM, open && "bg-white/20")}
      >
        {glyph && (
          // biome-ignore lint/performance/noImgElement: the app's own glyph as an inline data URL
          <img src={glyph.dark} alt={app} className="h-[16px] w-auto" />
        )}
        {children}
      </span>
      <span className={STATUS_ITEM}>
        <BatteryGlyph percent={battery} charging={charging} />
      </span>
      {/* The slot holds the widest time it can show, so the status items to its
          left (the glyph the pointer and a surface are measured against) never
          move when the viewer's clock arrives or a digit changes. */}
      <span className={cn(STATUS_ITEM, "grid tabular-nums")}>
        <span className="invisible [grid-area:1/1]">00:00 PM</span>
        <span className="text-right [grid-area:1/1]">{clock}</span>
      </span>
    </div>
  )
}

/** Every menu bar item's box, as the system lays them out: the same padding around
 *  each, so the space between icons is even whatever their widths. */
const STATUS_ITEM = "flex h-[22px] items-center rounded-[5px] px-[7px]"

/** The macOS 26 battery: a rounded rectangle, no outline, the charge a solid fill
 *  from the left inside a translucent body, a small nub apart from it. No
 *  percentage. */
function BatteryGlyph({
  percent,
  charging,
}: {
  percent: number
  charging: boolean
}) {
  return (
    <span className="flex items-center gap-[1.5px]">
      <span className="relative flex h-[11.5px] w-[25px] overflow-hidden rounded-[3.5px] bg-white/35">
        <span
          className={percent <= 20 && !charging ? "bg-[#ff453a]" : "bg-white"}
          style={{ width: `${Math.max(8, percent)}%` }}
        />
        {charging && (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-black">
            ⚡
          </span>
        )}
      </span>
      <span className="h-[4px] w-[1.5px] rounded-r-[1px] bg-white/35" />
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

/** The terminal window's own horizontal padding. */
const TERMINAL_PADDING = 40

function TerminalWindow({
  columns,
  lines,
  typing,
  accent,
  agent,
  Agent,
}: {
  /** The widest line the story prints, in characters. */
  columns: number
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
        {/* A box of definite height, so the skin's own overflow (the oldest lines
            scrolling away) happens in it, not in the window's clip. */}
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 px-4 pt-3 pb-3">
            <Agent
              entries={agent.entries}
              work={agent.work}
              finished={agent.finished}
              draft={agent.draft}
              cwd={agent.cwd}
            />
          </div>
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
      className="absolute top-[88px] left-[64px] flex h-[340px] flex-col overflow-hidden rounded-[12px] border border-white/10 shadow-[0_20px_60px_rgb(0_0_0/0.45)]"
      style={{
        // In the font's own advance (`ch`), two columns spare for a glyph the
        // mono face lacks (an arrow falls back wider), between the classic window
        // and the screen's margins.
        width: `min(${STAGE_WIDTH - 2 * 64}px, max(560px, calc(${columns + 2}ch + ${TERMINAL_PADDING}px)))`,
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
          once it does not (column-reverse anchors the one child at the bottom; its
          auto bottom margin takes any free space, so it sits at the top until it
          overflows, then its top is what is cut). */}
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden whitespace-pre-wrap px-5 pt-3 pb-4">
        <div className="mb-auto">
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
    // The same keys as everywhere else (@ag/kbd), large, and toned for the dark screen
    // they float over.
    <div
      data-slot="macos-keycaps"
      className={cn(
        OVERLAY,
        "text-[3.6cqw] [&_[data-slot=kbd-cap]]:border-white/15 [&_[data-slot=kbd-cap]]:bg-neutral-800/85 [&_[data-slot=kbd-cap]]:text-white [&_[data-slot=kbd-cap]]:shadow-[0_8px_24px_rgb(0_0_0/0.4)] [&_[data-slot=kbd-cap]]:backdrop-blur-xl",
      )}
      style={{
        opacity: Math.min(t, 1 - out),
        transform: `scale(${0.92 + 0.08 * t})`,
      }}
    >
      <Kbd keys={keys} />
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
