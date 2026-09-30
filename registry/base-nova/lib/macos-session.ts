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
  /** The script did this (a command, a click, the lid, a caption); absent, the app
   *  did it in answer. The player waits for the viewer before an author step. */
  author?: true
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
// People do not read in an instant, and a story that moves on before its detail lands
// has not shown it. So every step says what it asks of the viewer once it is on screen
// (LOOK: a line to read, a menu to scan, the lid to watch close), and before the next
// AUTHOR step (the script's own act: a command, a click, the lid, a caption) the
// player waits until all of it has been taken in. A reaction (output, a banner, the
// glyph) follows its cause at once: the app answers, it does not deliberate. PAUSE is
// only the breath between steps; an author's `@ms` replaces it.

const PAUSE: Record<StepKind, number> = {
  world: 400,
  glyph: 120,
  command: 400,
  output: 0,
  muted: 0,
  menu: 400,
  close: 300,
  hover: 400,
  press: 350,
  key: 400,
  "right-click": 400,
  banner: 300,
  caption: 250,
}

/** How long a pressed row flashes before the menu closes, as NSMenu does. */
export const PRESS_MS = 220
/** How long a keycap chip stays up. */
export const KEY_MS = 1600
/** How long the lid takes to fold, and the panel to go dark with it. */
export const LID_MS = 1100
/** How long the camera holds on the glyph after it changes. */
export const GLYPH_FOCUS_MS = 2400
/** Output lands a beat after the previous line. */
const LAND_MS = 140
/** The opening frame, held before the story's first act. */
const ESTABLISH_MS = 1600

/** Time to notice a change and read `text` at a steady adult pace (about 210 words a
 *  minute), in ms. */
export function readMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return 700 + words * 285
}

/** How long a banner stays: long enough to read twice. */
export function bannerStay(text: string): number {
  return readMs(text) * 2
}

const hold = (s: Step) =>
  s.kind === "command"
    ? (s.text?.length ?? 0) * TYPE_MS + LAND_MS
    : s.kind === "output" || s.kind === "muted"
      ? LAND_MS
      : s.kind === "press"
        ? PRESS_MS
        : 0

/** What a step asks of the viewer once it has landed, ms. */
function look(s: Step, before: WorldState, glyph: string): number {
  const text = s.text ?? ""
  switch (s.kind) {
    case "world": {
      const w = s.world as WorldState
      if (w.lid !== before.lid) return LID_MS + 1200
      if (w.clock !== before.clock || w.battery !== before.battery) return 1800
      if (w.asleep !== before.asleep) return 1400
      return 0
    }
    case "glyph":
      return s.glyph === glyph ? 0 : GLYPH_FOCUS_MS
    case "command":
      return 300
    case "output":
      return readMs(text)
    case "muted":
      return readMs(text) / 2
    case "menu":
      // The camera closes in, then the eye walks the rows.
      return 1400 + (s.rows?.filter((r) => !r.separator).length ?? 0) * 110
    case "hover":
      return 900
    case "key":
      return KEY_MS
    case "right-click":
      return 700
    case "banner":
      return readMs(text) + 600
    case "caption":
      return readMs(text)
    default:
      return 0
  }
}

const READ_IN_TURN = new Set<StepKind>(["output", "muted", "banner", "caption"])

export interface SceneClock {
  /** When each step starts (after its pause), ms. */
  starts: number[]
  /** When each step is complete. */
  ends: number[]
  /** The whole story, until the last thing on screen has been taken in. */
  total: number
}

export function sceneClock(timeline: Timeline): SceneClock {
  let at = 0
  // When the viewer is done with everything on screen so far.
  let ready = 0
  // The opening world is where the story starts, not a change to watch.
  const first = timeline.steps[0]
  let world = first?.kind === "world" ? (first.world as WorldState) : NIGHT
  // A banner posted behind a shut lid is read when the lid opens.
  let unseen = 0
  let glyph = "off"
  const starts: number[] = []
  const ends: number[] = []
  for (const s of timeline.steps) {
    // The story opens on its first step: no frame of anything before it.
    if (starts.length > 0) at += s.delay ?? PAUSE[s.kind]
    if (s.author) at = Math.max(at, ready)
    starts.push(at)
    const landed = at + hold(s)
    ends.push(landed)
    // The opening frame is taken in before anything happens: where we are, what is
    // on screen.
    const seen = starts.length === 1 ? ESTABLISH_MS : look(s, world, glyph)
    if (s.kind === "glyph") glyph = s.glyph as string
    if (s.kind === "banner" && world.lid === "closed") unseen += seen
    // Words are read one line after another; a picture is taken in at a glance,
    // alongside whatever else is being read.
    else if (READ_IN_TURN.has(s.kind)) ready = Math.max(ready, landed) + seen
    else ready = Math.max(ready, landed + seen)
    if (s.kind === "world") {
      const w = s.world as WorldState
      if (w.lid === "open" && world.lid === "closed") {
        ready = Math.max(ready, landed + LID_MS + unseen)
        unseen = 0
      }
      world = w
    }
    at = landed
  }
  return { starts, ends, total: Math.max(1, at, ready) + 800 }
}

/** How far the lid has travelled toward where it is going, 0..1, eased in and out
 *  like a hand closing it: every motion on stage is a function of scene time, so a
 *  scrubbed frame, a played one and a captured one are the same frame. */
export function lidTravel(frame: Frame, ms: number): number {
  const t = Math.min(1, Math.max(0, (ms - frame.lidSince) / LID_MS))
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
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
  /** When the glyph last changed (ms): the camera holds on it for GLYPH_FOCUS_MS. */
  glyphSince: number
  /** When the current caption appeared: it fades in from here. */
  captionSince: number
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
    glyphSince: Number.NEGATIVE_INFINITY,
    captionSince: Number.NEGATIVE_INFINITY,
  }
  let unseen: string | null = null
  timeline.steps.forEach((s, i) => {
    const start = clock.starts[i] as number
    if (start > ms) return
    const end = clock.ends[i] as number
    f.step = i
    switch (s.kind) {
      case "world":
        if (s.world?.lid !== f.world.lid) {
          f.lidSince = start
          // Notifications that arrived behind the shut lid are there when it opens.
          if (s.world?.lid === "open" && unseen) {
            const since = start + LID_MS
            f.banner =
              ms >= since && ms < since + bannerStay(unseen)
                ? { text: unseen, since }
                : null
            unseen = null
          }
        }
        f.world = s.world as WorldState
        break
      case "glyph":
        if (s.glyph !== f.glyph) f.glyphSince = start
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
      case "banner": {
        const text = s.text ?? ""
        if (f.world.lid === "closed") unseen = text
        else
          f.banner =
            ms < start + bannerStay(text) ? { text, since: start } : null
        break
      }
      case "caption":
        f.caption = s.text ?? null
        f.captionSince = start
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
