// The macos-session timeline: a menu bar app's story as steps, compiled by the APP from
// a scene script played through its real engine (awake's `awake-scene` is the model),
// and played here. The app owns every word, glyph and banner; this file owns pacing
// and nothing else. Framework-free by contract: `frameAt(timeline, ms)` is a pure fold,
// so scrubbing, stills and autoplay are the same function at different times.

import { TYPE_MS } from "@/registry/base-nova/lib/terminal-session"

/** A menu row. A separator says only that; an item says only what is true of it. */
export interface MenuRow {
  title?: string
  separator?: true
  disabled?: true
  checked?: true
  /** The key equivalent drawn at the row's end (the app's toggle chord). */
  chord?: string
  submenu?: MenuRow[]
}

/** The Mac as the stage shows it. */
export interface WorldState {
  clock: string
  battery: number
  charging: boolean
  lid: "open" | "closed"
  asleep: boolean
  heat: boolean
}

export type StepKind =
  | "world"
  | "glyph"
  | "command"
  | "output"
  | "muted"
  | "menu"
  | "close"
  | "hover"
  | "press"
  | "key"
  | "right-click"
  | "banner"
  | "caption"

export interface Step {
  kind: StepKind
  /** The author's pause before this step, ms. Absent: the kind's default. */
  delay?: number
  text?: string
  rows?: MenuRow[]
  /** Indices into the open menu, then its submenu. */
  path?: number[]
  glyph?: string
  tooltip?: string
  keys?: string
  world?: WorldState
}

export interface Timeline {
  app: string
  chord: string
  steps: Step[]
}

/** The app's own pixels, drawn by its own code: one PNG per glyph state per menu bar
 *  appearance, and the icon its banners wear. */
export interface Art {
  icon: string
  glyphs: Record<string, { light: string; dark: string }>
}

// ── pacing: the one place a step's time is decided ──
//
// PAUSE is the breath before a step when the script names none; HOLD is how long the
// step itself takes. A glyph, a banner and a world change follow their cause at once:
// the app reacts, it does not deliberate.

const PAUSE: Record<StepKind, number> = {
  world: 600,
  glyph: 0,
  command: 500,
  output: 0,
  muted: 0,
  menu: 500,
  close: 500,
  hover: 450,
  press: 450,
  key: 500,
  "right-click": 500,
  banner: 150,
  caption: 250,
}

/** How long a pressed row flashes before the menu closes, as NSMenu does. */
export const PRESS_MS = 220
/** How long a keycap chip stays up. */
export const KEY_MS = 1100
/** How long a banner stays on screen. */
export const BANNER_MS = 5200
/** How long the lid takes to fold, and the panel to go dark with it. */
export const LID_MS = 900

/** How far the lid has travelled toward where it is going, 0..1, eased out: every
 *  motion on stage is a function of scene time, so a scrubbed frame, a played one and
 *  a captured one are the same frame. */
export function lidTravel(frame: Frame, ms: number): number {
  const t = Math.min(1, Math.max(0, (ms - frame.lidSince) / LID_MS))
  return 1 - (1 - t) ** 3
}
/** Output lands a beat after the previous line. */
const LAND_MS = 140

const hold = (s: Step) =>
  s.kind === "command"
    ? (s.text?.length ?? 0) * TYPE_MS + LAND_MS
    : s.kind === "output" || s.kind === "muted"
      ? LAND_MS
      : s.kind === "press"
        ? PRESS_MS
        : 0

export interface SceneClock {
  /** When each step starts (after its pause), ms. */
  starts: number[]
  /** When each step is complete. */
  ends: number[]
  /** The whole story, plus the last banner's stay. */
  total: number
}

export function sceneClock(timeline: Timeline): SceneClock {
  let at = 0
  const starts: number[] = []
  const ends: number[] = []
  for (const s of timeline.steps) {
    at += s.delay ?? PAUSE[s.kind]
    starts.push(at)
    at += hold(s)
    ends.push(at)
  }
  const lastBanner = timeline.steps.findLastIndex((s) => s.kind === "banner")
  const tail = lastBanner < 0 ? 0 : (starts[lastBanner] as number) + BANNER_MS
  return { starts, ends, total: Math.max(1, at + 1200, tail) }
}

// ── the fold: a timeline at one instant ──

export interface TerminalLine {
  kind: "command" | "output" | "muted"
  text: string
}

export interface Frame {
  world: WorldState
  /** When the lid last moved (ms): its fold and the panel's fade run from here. */
  lidSince: number
  glyph: string
  tooltip: string
  terminal: TerminalLine[]
  /** The command being typed right now, and how much of it is typed. */
  typing: { text: string; chars: number } | null
  menu: {
    rows: MenuRow[]
    hover: number[] | null
    pressed: number[] | null
  } | null
  /** The chord on screen as keycaps, and since when (ms). */
  key: { keys: string; since: number } | null
  /** A right-click on the glyph, and since when. */
  rightClick: number | null
  banner: { text: string; since: number } | null
  caption: string | null
  /** Index of the last step that has started. */
  step: number
}

const NIGHT: WorldState = {
  clock: "21:00",
  battery: 80,
  charging: false,
  lid: "open",
  asleep: false,
  heat: false,
}

/** The whole stage at `ms`. Pure: no clock of its own, no memory between calls. */
export function frameAt(
  timeline: Timeline,
  clock: SceneClock,
  ms: number,
): Frame {
  const f: Frame = {
    world: NIGHT,
    lidSince: Number.NEGATIVE_INFINITY,
    glyph: "off",
    tooltip: "",
    terminal: [],
    typing: null,
    menu: null,
    key: null,
    rightClick: null,
    banner: null,
    caption: null,
    step: -1,
  }
  timeline.steps.forEach((s, i) => {
    const start = clock.starts[i] as number
    if (start > ms) return
    const end = clock.ends[i] as number
    f.step = i
    switch (s.kind) {
      case "world":
        if (s.world?.lid !== f.world.lid) f.lidSince = start
        f.world = s.world as WorldState
        break
      case "glyph":
        f.glyph = s.glyph as string
        f.tooltip = s.tooltip ?? ""
        break
      case "command":
        if (ms < end) {
          f.typing = {
            text: s.text ?? "",
            chars: Math.floor((ms - start) / TYPE_MS),
          }
        } else {
          f.typing = null
          f.terminal.push({ kind: "command", text: s.text ?? "" })
        }
        break
      case "output":
      case "muted":
        f.terminal.push({ kind: s.kind, text: s.text ?? "" })
        break
      case "menu":
        f.menu = { rows: s.rows ?? [], hover: null, pressed: null }
        break
      case "hover":
        if (f.menu) f.menu.hover = s.path ?? null
        break
      case "press":
        if (f.menu) {
          f.menu.hover = s.path ?? null
          f.menu.pressed = s.path ?? null
        }
        if (ms >= end) f.menu = null
        break
      case "close":
        f.menu = null
        break
      case "key":
        f.key =
          ms < start + KEY_MS ? { keys: s.keys ?? "", since: start } : null
        break
      case "right-click":
        f.rightClick = ms < start + KEY_MS ? start : null
        break
      case "banner":
        f.banner =
          ms < start + BANNER_MS ? { text: s.text ?? "", since: start } : null
        break
      case "caption":
        f.caption = s.text ?? null
        break
    }
  })
  return f
}

/** The row a path points at in an open menu. */
export function rowAt(rows: MenuRow[], path: number[]): MenuRow | undefined {
  const top = rows[path[0] as number]
  return path.length === 1 ? top : top?.submenu?.[path[1] as number]
}

// Runnable example: scripts/examples/macos-session.ts (the lib carries no runtime).
