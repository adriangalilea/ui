"use client"

// The lightbox: one interruptible spring over a View, a three-layer track, a fly
// that passes under the page's chrome. The trigger element IS the source rect; its
// `src` is the page's pixels and paints frame one, `full` cross-fades in on decode.
// Per frame the engine writes the active layer's transform and --lb-p on its three
// readers (scrim, chrome, active layer); chrome reads --lb-p in CSS. React changes
// only at checkpoints (open, settle, step, release). Base UI Dialog supplies portal,
// inert, focus trap, focus return and the scroll lock (its gutter included: no token
// rule duplicates it); every key and pointer verb dispatches an id from
// lightbox-actions.
//
// Keys are captured on the dialog root and stopped, so a host page owning arrows is
// silent while open. The rail is the one boundary: keys pressed inside `renderRail`
// belong to the consumer's widgets and BUBBLE TO THE HOST, the only way React
// handlers stay alive inside a portal whose React root sits at the same node as the
// host's document listeners. A host that owns arrows guards its handler on
// `useLightbox().id === null`. Escape walks the ladder from anywhere.

import { Dialog } from "@base-ui/react/dialog"
import * as React from "react"
import {
  ACTIONS,
  type Action,
  type ActionId,
  type Layer as ActionLayer,
  action,
  available,
  escRung,
  KEYS,
  keycap,
  keyOf,
  keyshortcuts,
  resolve,
} from "@/registry/base-nova/lib/lightbox-actions"
import {
  assert,
  assertSize,
  type Band,
  COAST,
  clampPan,
  DOUBLE_MOUSE,
  DOUBLE_TOUCH,
  DOUBLE_TRAVEL,
  dismissCommit,
  dragProgress,
  dragScale,
  FIT,
  fit,
  GONE,
  HAND,
  INTENT,
  KEY_PAN,
  MACHINE,
  neighbours,
  type Obstruction,
  overshoot,
  PINCH_CLOSE,
  PINCH_PASSED,
  type Point,
  panBounds,
  pinchProgress,
  project,
  RELOCK,
  type Rect,
  rubber,
  type Sample,
  type Size,
  SLIDE_GAP,
  Spring,
  STILL,
  sharpScale,
  slideCommit,
  sourceView,
  stageBand,
  TAP_TRAVEL,
  type Tuning,
  type Tunings,
  type View,
  velocity,
  WHEEL_GUARD,
  WHEEL_SILENCE,
  WHEEL_ZOOM,
  wheelIsHand,
  wheelPx,
  wheelTick,
  zoomAt,
  zoomMax as zoomCeiling,
} from "@/registry/base-nova/lib/lightbox-motion"
import "./lightbox.css"

export type Source = {
  /** The rendition the page painted, cache-hot: frame one. */
  src: string
  /** The original; decoded in parallel, cross-fades in. Same as `src` when there is no better file. */
  full: string
  /** Candidates of `full` by width; `sizes` is owned by the lightbox. */
  srcset?: string
  /** Natural px of `full`. */
  width: number
  height: number
  /** A CSS `background` value under the image: `url(data:...)` or a color. */
  blur?: string
}
export type Media =
  | { kind: "image"; source: Source; alt: string }
  | { kind: "gif"; source: Source; alt: string }
  | {
      kind: "video"
      src: string
      poster: Source
      /** The accessible name: the slide, the `<video>`, the poster and the trigger. */
      title: string
      start?: number
      muted?: boolean
      loop?: boolean
    }
  | { kind: "frame"; src: string; width: number; height: number; title: string }
export type Entry = { id: string; media: Media; caption?: React.ReactNode }
export type Facts = {
  index: number
  count: number
  natural: Size | null
  rendered: Size
  zoom: number
  zoomMax: number
  sourceLimited: boolean
}
export interface LightboxProps {
  /** Explicit order; else triggers in document order at open. */
  entries?: Entry[]
  loop?: boolean
  /** `#lb=<id>` deep links, Back closes. */
  history?: boolean
  /** Controlled, consumer-owned. */
  rail?: boolean
  onRailChange?: (open: boolean) => void
  renderRail?: (entry: Entry, facts: Facts) => React.ReactNode
  onOpenChange?: (id: string | null) => void
  /** What the dialog is announced as, after the count. */
  label?: string
  children: React.ReactNode
}
export interface LightboxTriggerProps {
  entry: Entry
  /** Default `<a href={full}>`; must be focusable. */
  render?: React.ReactElement
  /** Rendered untouched: next/image, a poster, a card. */
  children: React.ReactNode
}

type Trigger = { entry: Entry; el: HTMLElement }
type Session = { ids: string[]; index: number; rest: boolean }
type Phase = "enter" | "idle" | "exit"
/** What the pose spring is flying toward; the settle action is a function of it. */
type Aim = "enter" | "exit" | "free"
type Dispatch = (id: ActionId | "escape" | "zoom.toggle", at?: Point) => void
type VideoMedia = Extract<Media, { kind: "video" }>
/** Fixed for the provider's lifetime: triggers subscribe here and never re-render
 *  on a checkpoint. */
type Registry = {
  triggers: React.RefObject<Map<string, Trigger>>
  entries: React.RefObject<Entry[] | undefined>
  open: (id: string, rest?: boolean) => void
  close: () => void
  step: (d: 1 | -1) => void
  prime: (entry: Entry) => void
}
/** Changes on every checkpoint; only `useLightbox()` reads it. */
type State = { id: string | null; facts: Facts | null }

const RegistryContext = React.createContext<Registry | null>(null)
const StateContext = React.createContext<State | null>(null)

/** Reserved for the bar and the caption; consumer chrome is declared via data-obstructs. */
const INSET_Y = 48
const INSET_X = 16
const FRAME_GUTTER = 32
/** The rail beside the media at lg (px), under it below (share of the stage). The
 *  css reads both from the root (--lb-rail-w, --lb-rail-h). */
const RAIL_W = 288
const RAIL_H = 0.4
const LG = "(min-width: 64rem)"
/** The two elements the browser activates from the keyboard: a `render` that is
 *  merely focusable opens by pointer only. */
const ACTIVATABLE = "a[href], button"
/** Targets that keep their own keys (Escape excepted). */
const TYPING = "input, textarea, select, [contenteditable]"
/** Targets Space and Enter activate. */
const ACTIVATES = "button, a[href], select, summary, [role=button], [role=link]"
/** What Tab can land on; hidden chrome and inert siblings are filtered live. */
const TABBABLE =
  "a[href], button, input, select, textarea, summary, iframe, [tabindex]:not([tabindex='-1'])"

/** The platform's close-request hook (Android Back, Chrome 120+); absent from lib.dom. */
declare class CloseWatcher {
  onclose: (() => void) | null
  destroy(): void
}
/** Registry keys that scroll the `?` sheet while it has focus. */
const SHEET_SCROLLS: ReadonlySet<string> = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
])

const boxOf = (m: Media): Size =>
  m.kind === "video"
    ? { w: m.poster.width, h: m.poster.height }
    : m.kind === "frame"
      ? { w: m.width, h: m.height }
      : { w: m.source.width, h: m.source.height }
const naturalOf = (m: Media): Size | null =>
  m.kind === "frame" ? null : boxOf(m)
const fullOf = (m: Media): string =>
  m.kind === "video" || m.kind === "frame" ? m.src : m.source.full
const altOf = (m: Media): string =>
  m.kind === "frame" || m.kind === "video" ? m.title : m.alt
/** Every kind names itself; a nameless video or frame is a lie to the reader. */
function assertMedia(m: Media): void {
  assertSize(boxOf(m))
  if (m.kind === "video" || m.kind === "frame")
    assert(m.title, `${m.kind} "${m.src}" has no title`)
}
const gutterOf = (m: Media): number => (m.kind === "frame" ? FRAME_GUTTER : 0)

function fitOf(m: Media, band: Band): Size {
  return fit(boxOf(m), band, m.kind === "frame" ? FRAME_GUTTER : INSET_X)
}

/** The trigger's rect, its corner resolved to px the way the browser draws it: a
 *  percentage is of the box, a length is capped at the half-size that makes a pill. */
function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  const [rx] = getComputedStyle(el).borderTopLeftRadius.split(" ") as [string]
  const n = Number.parseFloat(rx)
  assert(Number.isFinite(n), `border radius "${rx}" is not a number`)
  const radius = rx.endsWith("%")
    ? (n / 100) * r.width
    : Math.min(n, Math.min(r.width, r.height) / 2)
  return { x: r.left, y: r.top, w: r.width, h: r.height, radius }
}

function measureBand(rail: boolean): Band {
  const vv = window.visualViewport
  assert(vv, "visualViewport")
  const base: Band = {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    w: vv.width,
    h: vv.height,
  }
  const blocks: Obstruction[] = []
  for (const el of document.querySelectorAll<HTMLElement>("[data-obstructs]")) {
    const r = el.getBoundingClientRect()
    if (r.height <= 0) continue
    blocks.push(
      el.dataset.obstructs === "top"
        ? { side: "top", edge: r.bottom }
        : { side: "bottom", edge: r.top },
    )
  }
  const b = stageBand(base, blocks)
  // The rail takes its share of the stage before the bar and caption insets, so the
  // chrome positioned from this band ends where the rail begins.
  const lane = !rail
    ? b
    : window.matchMedia(LG).matches
      ? { ...b, w: b.w - RAIL_W }
      : { ...b, h: b.h * (1 - RAIL_H) }
  return { ...lane, top: lane.top + INSET_Y, h: lane.h - 2 * INSET_Y }
}

const sameBand = (a: Band, b: Band) =>
  Math.abs(a.top - b.top) < 1 &&
  Math.abs(a.left - b.left) < 1 &&
  Math.abs(a.w - b.w) < 1 &&
  Math.abs(a.h - b.h) < 1

/** Decode of `full` starts on pointerdown, at the size the stage will ask for: the
 *  same band the Still measures, rail included, so both pick one candidate. A
 *  video's poster is the shared element, so it primes like an image. */
function prime(entry: Entry, rail: boolean) {
  const m = entry.media
  const source =
    m.kind === "image" ? m.source : m.kind === "video" ? m.poster : null
  if (!source) return
  if (source.full === source.src && !source.srcset) return
  const img = new Image()
  if (source.srcset) {
    img.srcset = source.srcset
    img.sizes = `${Math.round(fitOf(m, measureBand(rail)).w)}px`
  }
  img.src = source.full
  // The live element reports a broken original; a primer has nothing to add.
  img.decode().catch(() => {})
}

export function useLightbox(): Pick<Registry, "open" | "close" | "step"> &
  State {
  const registry = React.useContext(RegistryContext)
  const state = React.useContext(StateContext)
  assert(registry && state, "useLightbox() outside <Lightbox>")
  const { open, close, step } = registry
  return { open, close, step, id: state.id, facts: state.facts }
}

export function Lightbox({
  entries,
  loop = false,
  history = false,
  rail = false,
  onRailChange,
  renderRail,
  onOpenChange,
  label = "media",
  children,
}: LightboxProps) {
  assert(
    !renderRail === !onRailChange,
    "rail: renderRail and onRailChange come together",
  )
  const triggers = React.useRef(new Map<string, Trigger>())
  const [session, setSession] = React.useState<Session | null>(null)
  const [facts, setFacts] = React.useState<Facts | null>(null)
  const dispatchRef = React.useRef<Dispatch | null>(null)
  const openChange = React.useRef(onOpenChange)
  openChange.current = onOpenChange
  // Read through a ref so `open`, `registry` and `entryOf` are created once per
  // provider: an inline `entries` array must never rebuild the session.
  const entriesRef = React.useRef(entries)
  entriesRef.current = entries
  const railRef = React.useRef(rail)
  railRef.current = rail

  const open = React.useCallback((id: string, rest = false) => {
    const entries = entriesRef.current
    const ids = entries
      ? entries.map((e) => e.id)
      : [...triggers.current.values()]
          .sort((a, b) =>
            a.el.compareDocumentPosition(b.el) &
            Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1,
          )
          .map((t) => t.entry.id)
    const index = ids.indexOf(id)
    assert(index >= 0, `open("${id}"): no such entry`)
    setSession({ ids, index, rest })
    openChange.current?.(id)
  }, [])

  const registry = React.useMemo<Registry>(
    () => ({
      triggers,
      entries: entriesRef,
      open,
      close: () => dispatchRef.current?.("close"),
      step: (d) => dispatchRef.current?.(d === 1 ? "step.next" : "step.prev"),
      prime: (entry) => prime(entry, railRef.current),
    }),
    [open],
  )
  const state = React.useMemo<State>(
    () => ({
      id: session ? (session.ids[session.index] as string) : null,
      facts,
    }),
    [session, facts],
  )
  const bind = React.useCallback((d: Dispatch) => {
    dispatchRef.current = d
  }, [])
  const onIndex = React.useCallback((index: number) => {
    setSession((s) => (s ? { ...s, index } : s))
  }, [])
  const onClosed = React.useCallback(() => {
    dispatchRef.current = null
    setSession(null)
    setFacts(null)
    openChange.current?.(null)
  }, [])

  // A deep link opens once, at mount; a session already open is never re-opened.
  React.useEffect(() => {
    if (!history || dispatchRef.current) return
    const m = /^#lb=(.+)$/.exec(window.location.hash)
    if (!m) return
    const id = decodeURIComponent(m[1] as string)
    if (triggers.current.has(id)) open(id, true)
  }, [history, open])

  const entryOf = React.useCallback((id: string): Entry => {
    const e =
      entriesRef.current?.find((x) => x.id === id) ??
      triggers.current.get(id)?.entry
    assert(e, `no entry "${id}"`)
    return e
  }, [])

  return (
    <RegistryContext.Provider value={registry}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
      <Dialog.Root
        open={session !== null}
        modal
        disablePointerDismissal
        // Every close request is ours: Escape walks the ladder (the capture handler
        // owns it; the platform key is routed here when it reaches Base UI, and with
        // no rung left the dispatch is a no-op), Back from the engine's
        // CloseWatcher, the button from dispatch.
        onOpenChange={(next, details) => {
          if (next) return
          details.cancel()
          if (details.reason === "escape-key") dispatchRef.current?.("escape")
        }}
      >
        <Dialog.Portal>
          {session && (
            <Stage
              ids={session.ids}
              index={session.index}
              rest={session.rest}
              entryOf={entryOf}
              triggers={triggers}
              loop={loop}
              history={history}
              rail={rail}
              onRailChange={onRailChange}
              renderRail={renderRail}
              label={label}
              bind={bind}
              onIndex={onIndex}
              onFacts={setFacts}
              onClosed={onClosed}
            />
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </RegistryContext.Provider>
  )
}

export function LightboxTrigger({
  entry,
  render,
  children,
}: LightboxTriggerProps) {
  const ctx = React.useContext(RegistryContext)
  assert(ctx, "<LightboxTrigger> outside <Lightbox>")
  const ref = React.useRef<HTMLElement>(null)
  const { triggers, entries } = ctx
  assertMedia(entry.media)
  if (entries.current)
    assert(
      entries.current.some((e) => e.id === entry.id),
      `trigger "${entry.id}" is not in entries`,
    )

  React.useLayoutEffect(() => {
    const el = ref.current
    assert(el, "trigger rendered nothing")
    if (process.env.NODE_ENV !== "production") {
      assert(
        el.matches(ACTIVATABLE),
        `trigger "${entry.id}" is not a link or a button`,
      )
      assert(
        el.getAttribute("aria-label") ||
          el.textContent?.trim() ||
          el.querySelector("img[alt]:not([alt=''])"),
        `trigger "${entry.id}" has no accessible name`,
      )
    }
    triggers.current.set(entry.id, { entry, el })
    return () => {
      triggers.current.delete(entry.id)
    }
  }, [entry, triggers])

  const element = (render ??
    React.createElement("a", {
      href: fullOf(entry.media),
    })) as React.ReactElement<Record<string, unknown>>
  const props = element.props
  assert(
    !("ref" in props),
    `trigger "${entry.id}": the render element carries its own ref; the trigger owns it`,
  )
  return React.cloneElement(
    element,
    {
      ref,
      "data-lightbox": entry.id,
      "aria-label": props["aria-label"] ?? (altOf(entry.media) || undefined),
      onPointerDown: (e: React.PointerEvent) => {
        ;(
          props.onPointerDown as ((e: React.PointerEvent) => void) | undefined
        )?.(e)
        ctx.prime(entry)
      },
      onClick: (e: React.MouseEvent) => {
        ;(props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e)
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return
        e.preventDefault()
        ctx.open(entry.id)
      },
    },
    children,
  )
}

type StageProps = {
  ids: string[]
  index: number
  rest: boolean
  entryOf: (id: string) => Entry
  triggers: React.RefObject<Map<string, Trigger>>
  loop: boolean
  history: boolean
  rail: boolean
  onRailChange?: (open: boolean) => void
  renderRail?: (entry: Entry, facts: Facts) => React.ReactNode
  label: string
  bind: (d: Dispatch) => void
  onIndex: (index: number) => void
  onFacts: (f: Facts) => void
  onClosed: () => void
}

type Pose = { x: number; y: number; s: number; p: number }
const POSE_EPS: Pose = { x: 0.5, y: 0.5, s: 0.001, p: 0.002 }

function Stage(props: StageProps) {
  const {
    ids,
    index,
    rest,
    entryOf,
    triggers,
    loop,
    history,
    rail,
    onRailChange,
    renderRail,
    label,
    bind,
    onIndex,
    onFacts,
    onClosed,
  } = props
  const count = ids.length
  const id = ids[index] as string
  const entry = entryOf(id)
  const media = entry.media

  const root = React.useRef<HTMLDivElement>(null)
  const scrim = React.useRef<HTMLDivElement>(null)
  const chromeEl = React.useRef<HTMLDivElement>(null)
  const stage = React.useRef<HTMLDivElement>(null)
  const track = React.useRef<HTMLDivElement>(null)
  const layers = React.useRef(new Map<string, HTMLDivElement>())
  const video = React.useRef<HTMLVideoElement | null>(null)

  const [band, setBand] = React.useState<Band>(() => measureBand(rail))
  const [phase, setPhase] = React.useState<Phase>(rest ? "idle" : "enter")
  const [zoom, setZoom] = React.useState(1)
  const [chrome, setChrome] = React.useState(true)
  const [sheet, setSheet] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [warm, setWarm] = React.useState(rest)
  const [dir, setDir] = React.useState<1 | -1>(1)
  const [status, setStatus] = React.useState<string | null>(null)
  // Keyed by a counter so a repeated status is a fresh DOM mutation, announced again.
  const [announce, setAnnounce] = React.useState({ text: "", n: 0 })
  const [caption, setCaption] = React.useState<React.ReactNode>(null)

  const fitted = fitOf(media, band)
  const natural = React.useMemo(() => naturalOf(media), [media])
  const dpr = window.devicePixelRatio
  const zoomMax =
    media.kind === "frame"
      ? 1
      : media.kind === "gif"
        ? 2
        : zoomCeiling((natural as Size).w, fitted.w, dpr)
  const sharp = natural ? sharpScale(natural.w, fitted.w, dpr) : 1
  const sourceLimited = media.kind !== "frame" && sharp < zoomMax
  const zoomed = zoom > 1.01
  const facts = React.useMemo<Facts>(
    () => ({
      index,
      count,
      natural,
      rendered: { w: fitted.w * zoom, h: fitted.h * zoom },
      zoom,
      zoomMax,
      sourceLimited,
    }),
    [index, count, natural, fitted.w, fitted.h, zoom, zoomMax, sourceLimited],
  )
  React.useEffect(() => onFacts(facts), [facts, onFacts])

  const layerSet = React.useMemo(() => {
    const s = new Set<ActionLayer>(["always"])
    s.add(zoomed ? "zoomed" : "fit")
    if (media.kind === "video") s.add("video")
    if (sheet) s.add("sheet")
    if (fullscreen) s.add("fullscreen")
    return s
  }, [zoomed, media.kind, sheet, fullscreen])
  const unavailable = React.useMemo(() => {
    const u = new Set<ActionId>()
    if (media.kind === "frame")
      for (const a of ["zoom.in", "zoom.out", "zoom.fit"] as const) u.add(a)
    if (!document.fullscreenEnabled) u.add("fullscreen")
    if (!renderRail) u.add("rail")
    const can = neighbours(index, count, loop)
    if (!can.prev) for (const a of ["prev", "step.prev"] as const) u.add(a)
    if (!can.next) for (const a of ["next", "step.next"] as const) u.add(a)
    return u
  }, [media.kind, loop, index, count, renderRail])

  // Everything the engine reads, one frame fresh, never a stale closure.
  const live = React.useRef({
    ids,
    index,
    entry,
    fitted,
    band,
    zoomMax,
    sharp,
    sourceLimited,
    layerSet,
    unavailable,
    rail,
    loop,
    history,
    onRailChange,
    onIndex,
    onClosed,
  })
  live.current = {
    ids,
    index,
    entry,
    fitted,
    band,
    zoomMax,
    sharp,
    sourceLimited,
    layerSet,
    unavailable,
    rail,
    loop,
    history,
    onRailChange,
    onIndex,
    onClosed,
  }

  // The engine: one object of mutable clocks and gesture state, owned by this effect.
  const engine = React.useRef<{
    dispatch: Dispatch
    settleIndex: () => void
    refit: (prev: { band: Band; fitted: Size }) => void
  } | null>(null)

  // The engine mounts once per open; everything live is read through `live`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: one engine per open
  React.useLayoutEffect(() => {
    const rootEl = root.current
    const trackEl = track.current
    const scrimEl = scrim.current
    const barEl = chromeEl.current
    assert(rootEl && trackEl && scrimEl && barEl, "stage without a root")
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const tune = (t: Tunings<keyof Pose>): Tunings<keyof Pose> =>
      reduced ? STILL : t
    const L = live
    const pose = new Spring<keyof Pose>(
      rest ? { ...FIT, p: 1 } : { x: 0, y: 0, s: 1, p: 0 },
      POSE_EPS,
    )
    const slide = new Spring<"x">({ x: 0 }, { x: 0.5 })
    const S = {
      raf: 0,
      last: 0,
      poseOn: false,
      slideOn: false,
      aim: "free" as Aim,
      onSlide: null as (() => void) | null,
      pending: null as { target: Pose; tuning: Tunings<keyof Pose> } | null,
      heldVel: { x: 0, y: 0, s: 0, p: 0 } as Pose,
      ph: (rest ? "idle" : "enter") as Phase,
      z: rest ? "own" : "fly",
      gesture: false,
      enterAt: performance.now(),
      popped: false,
    }

    const layerEl = () => {
      const el = layers.current.get(L.current.ids[L.current.index] as string)
      assert(el, "active layer missing")
      return el
    }
    const center = (): Point => {
      const b = L.current.band
      return { x: b.left + b.w / 2, y: b.top + b.h / 2 }
    }
    const rel = (x: number, y: number): Point => {
      const c = center()
      return { x: x - c.x, y: y - c.y }
    }
    const vh = () => {
      const vv = window.visualViewport
      assert(vv, "visualViewport")
      return vv.height
    }

    // --lb-p is registered `inherits: false` and lands on its three readers only,
    // so the rail's subtree and the sheet never see a per-frame style change.
    const write = () => {
      const { x, y, s, p } = pose.value
      const el = layerEl()
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
      const pv = String(p)
      el.style.setProperty("--lb-p", pv)
      scrimEl.style.setProperty("--lb-p", pv)
      barEl.style.setProperty("--lb-p", pv)
      if (S.ph === "enter" && S.z === "fly" && p >= 0.85) {
        S.z = "own"
        rootEl.dataset.z = "own"
      } else if (S.ph === "exit" && S.z === "own" && p <= 0.6) {
        S.z = "fly"
        rootEl.dataset.z = "fly"
      }
    }
    const writeSlide = () => {
      trackEl.style.transform = `translate3d(${slide.value.x}px, 0, 0)`
    }
    const tick = (t: number) => {
      const dt = S.last ? t - S.last : 16
      S.last = t
      if (S.poseOn) {
        const done = pose.step(dt)
        write()
        if (done) {
          S.poseOn = false
          S.pending = null
          upgradeSizes()
          if (S.aim === "enter") settleEnter()
          else if (S.aim === "exit") closed()
        }
      }
      if (S.slideOn) {
        const done = slide.step(dt)
        writeSlide()
        if (done) {
          S.slideOn = false
          const cb = S.onSlide
          S.onSlide = null
          cb?.()
        }
      }
      if (S.poseOn || S.slideOn) S.raf = requestAnimationFrame(tick)
      else {
        S.raf = 0
        S.last = 0
        if (!S.gesture) {
          layerEl().style.willChange = ""
          trackEl.style.willChange = ""
        }
      }
    }
    const start = () => {
      if (S.raf) return
      S.last = 0
      S.raf = requestAnimationFrame(tick)
    }
    // The settle action is a function of the aim, never of who last called: a free
    // spring during an enter completes the enter; one during an exit cancels it and
    // re-enters, so phase, z and the neighbours all recover on settle.
    const animate = (
      view: View,
      p: number,
      tuning: Tunings<keyof Pose>,
      vel?: Point,
      aim: Aim = "free",
    ) => {
      const target = { ...view, p }
      pose.aim(
        target,
        tune(tuning),
        vel ? { x: vel.x, y: vel.y, s: 0, p: 0 } : undefined,
      )
      S.pending = { target, tuning }
      S.poseOn = true
      if (aim === "free" && S.ph !== "idle") {
        if (S.ph === "exit") {
          S.ph = "enter"
          setPhase("enter")
        }
        S.aim = "enter"
      } else S.aim = aim
      layerEl().style.willChange = "transform"
      start()
    }
    const animateSlide = (
      x: number,
      tuning: Tuning,
      vx: number,
      done?: () => void,
    ) => {
      slide.aim({ x }, tune(tuning), { x: vx })
      S.slideOn = true
      S.onSlide = done ?? null
      trackEl.style.willChange = "transform"
      start()
    }
    // A hand took over: drop the clock, remember where it was going. The pose holds
    // at its live value (the drag offsets from there); the slide keeps its target.
    const pause = () => {
      if (S.raf) cancelAnimationFrame(S.raf)
      S.raf = 0
      S.last = 0
      S.heldVel = pose.vel
      S.poseOn = false
      pose.hold()
    }
    const resume = () => {
      if (S.pending) {
        pose.aim(S.pending.target, tune(S.pending.tuning), S.heldVel)
        S.poseOn = true
      }
      if (S.poseOn || S.slideOn) start()
    }

    // A larger candidate is decoded off-DOM first, so the live element's reselection
    // hits the decode cache and paints in the same frame: the sharp image never
    // blinks to the base. A later settle supersedes an in-flight decode.
    let sizesToken = 0
    const upgradeSizes = () => {
      const up = layerEl().querySelector<HTMLImageElement>("img.ag-lb-up")
      if (!up?.srcset) return
      const next = `${Math.round(L.current.fitted.w * pose.value.s)}px`
      if (up.sizes === next) return
      const token = ++sizesToken
      const probe = new Image()
      probe.sizes = next
      probe.srcset = up.srcset
      probe.src = up.src
      probe.decode().then(
        () => {
          if (token === sizesToken && up.isConnected) up.sizes = next
        },
        // The live element reports a broken candidate; the probe has nothing to add.
        () => {},
      )
    }
    const say = (text: string) => setAnnounce((a) => ({ text, n: a.n + 1 }))
    const announceSlide = () => {
      const { index, ids, entry } = L.current
      say(`${index + 1} of ${ids.length} · ${altOf(entry.media)}`)
    }
    const settleEnter = () => {
      S.ph = "idle"
      setPhase("idle")
      if (S.z !== "own") {
        S.z = "own"
        rootEl.dataset.z = "own"
      }
      clipToSource()
      setWarm(true)
      announceSlide()
    }
    // The one point where the history entry goes, after the fly has landed.
    const closed = () => {
      const { history, ids, index } = L.current
      if (history && !S.popped) {
        const state = window.history.state as { lb?: string } | null
        if (state?.lb === ids[index]) window.history.back()
        else
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          )
      }
      L.current.onClosed()
    }
    const clipVars = (el: HTMLElement, clip: Size, radius: number) => {
      el.style.setProperty("--lb-clip-x", `${clip.w}px`)
      el.style.setProperty("--lb-clip-y", `${clip.h}px`)
      el.style.setProperty("--lb-radius", `${radius}px`)
    }
    const source = () => {
      const { ids, index, fitted, band } = L.current
      const t = triggers.current.get(ids[index] as string)
      if (!t?.el.isConnected) return null
      const r = rectOf(t.el)
      if (r.w <= 0 || r.h <= 0) return null
      return sourceView(r, fitted, band)
    }
    // The active layer always wears its own source clip, so --lb-p maps to the same
    // crop whether the entry was opened or stepped to: a drag re-crops toward the
    // card from the first frame, never at release.
    const clipToSource = () => {
      const sv = source()
      const el = layerEl()
      if (sv) clipVars(el, sv.clip, sv.radius)
      else clipVars(el, { w: 0, h: 0 }, 0)
      return sv
    }
    // A neighbour has no inline transform: whatever a spring left on a layer that
    // stopped being active is cleared before the new one takes the pose.
    const clearLayer = (el: HTMLDivElement) => {
      el.style.transform = ""
      el.style.willChange = ""
      el.style.removeProperty("--lb-p")
      el.style.removeProperty("--lb-clip-x")
      el.style.removeProperty("--lb-clip-y")
      el.style.removeProperty("--lb-radius")
    }
    // A committing slide is dropped by any gesture that takes the stage vertically:
    // the track springs home, the index never changes. One rule for pinch, exit and
    // the x-to-y relock.
    const dropSlide = () => {
      S.onSlide = null
      if (!S.slideOn && slide.value.x === 0) return
      animateSlide(0, MACHINE, slide.vel.x)
    }

    // Idempotent: a second call mid-fly re-aims the running exit from the live rect.
    const beginExit = (vel?: Point) => {
      if (S.ph !== "exit") {
        S.ph = "exit"
        setPhase("exit")
      }
      const sv = clipToSource()
      dropSlide()
      animate(sv ? sv.view : GONE, 0, MACHINE, vel, "exit")
    }

    // A step of one slides to the neighbour (wrapping under loop); a jump cuts.
    const stepTo = (to: number, tuning: Tuning, vx = 0) => {
      const { ids, loop, index } = L.current
      const n = ids.length
      const d = to - index
      if (d === 0) return
      const step = Math.abs(d) === 1
      if (step) {
        const can = neighbours(index, n, loop)
        if (!(d === 1 ? can.next : can.prev)) return
      }
      const wrapped = step ? (index + d + n) % n : to
      assert(wrapped >= 0 && wrapped < n, `step to ${to} of ${n}`)
      setDir(d > 0 ? 1 : -1)
      setStatus(null)
      if (
        pose.value.s !== 1 ||
        pose.value.p !== 1 ||
        pose.value.x ||
        pose.value.y
      )
        animate(FIT, 1, MACHINE)
      setZoom(1)
      if (Math.abs(d) !== 1) {
        L.current.onIndex(wrapped)
        return
      }
      const w = L.current.band.w + SLIDE_GAP
      animateSlide(-d * w, tuning, vx, () => L.current.onIndex(wrapped))
    }

    const zoomTo = (s: number, at: Point, tuning = MACHINE) => {
      const { fitted, band, zoomMax } = L.current
      const target = Math.min(zoomMax, Math.max(1, s))
      const v = clampPan(zoomAt(pose.value, target, at), fitted, band)
      animate(target <= 1 ? FIT : v, 1, tuning)
      setZoom(target)
    }
    // Per axis: a flick that comes to rest on its own coasts; one the bounds cut
    // short bounces off the wall under the stiff spring. The free axis never shares
    // the wall's kick.
    const coastOrWall = (coast: View, target: View): Tunings<keyof Pose> => ({
      x: coast.x === target.x ? COAST : MACHINE,
      y: coast.y === target.y ? COAST : MACHINE,
      s: MACHINE,
      p: MACHINE,
    })
    // A zoom session released: the rubber past the ceiling is undone at the anchor,
    // then momentum projects and the pan clamps. One path for pinch and wheel.
    const releaseZoom = (vel: Point, at: Point) => {
      const { fitted, band, zoomMax } = L.current
      const s = Math.min(pose.value.s, zoomMax)
      const v = s === pose.value.s ? pose.value : zoomAt(pose.value, s, at)
      const coast = { x: project(v.x, vel.x), y: project(v.y, vel.y), s }
      const target = clampPan(coast, fitted, band)
      animate(
        target,
        1,
        s === pose.value.s ? coastOrWall(coast, target) : MACHINE,
        vel,
      )
      setZoom(s)
    }

    const dispatch: Dispatch = (id, at = { x: 0, y: 0 }) => {
      const { layerSet, unavailable, entry, ids, index, sourceLimited, sharp } =
        L.current
      const v = video.current
      switch (id) {
        case "close":
          beginExit()
          return
        case "escape": {
          const rung = escRung(layerSet)
          if (rung) dispatch(rung)
          return
        }
        case "sheet":
          setSheet((s) => !s)
          return
        case "sheet.close":
          setSheet(false)
          return
        case "zoom.fit":
          if (unavailable.has(id)) return
          zoomTo(1, at)
          return
        case "zoom.in":
        case "zoom.out": {
          if (unavailable.has(id)) return
          const s = id === "zoom.in" ? pose.value.s * 1.5 : pose.value.s / 1.5
          if (id === "zoom.in" && sourceLimited && s > sharp) {
            const w = (naturalOf(entry.media) as Size).w
            setStatus(`source-limited · ${w}px`)
            say(`source-limited · ${w}px`)
          }
          zoomTo(s, at)
          return
        }
        case "zoom.toggle":
          if (entry.media.kind === "frame") return
          zoomTo(pose.value.s > 1.01 ? 1 : Math.min(2, L.current.zoomMax), at)
          return
        case "prev":
        case "step.prev":
          stepTo(index - 1, MACHINE)
          return
        case "next":
        case "step.next":
          stepTo(index + 1, MACHINE)
          return
        case "first":
          stepTo(0, MACHINE)
          return
        case "last":
          stepTo(ids.length - 1, MACHINE)
          return
        case "pan.left":
        case "pan.right":
        case "pan.up":
        case "pan.down": {
          const dx =
            id === "pan.left" ? KEY_PAN : id === "pan.right" ? -KEY_PAN : 0
          const dy =
            id === "pan.up" ? KEY_PAN : id === "pan.down" ? -KEY_PAN : 0
          const { fitted, band } = L.current
          animate(
            clampPan(
              { ...pose.value, x: pose.value.x + dx, y: pose.value.y + dy },
              fitted,
              band,
            ),
            1,
            MACHINE,
          )
          return
        }
        case "rail": {
          if (unavailable.has(id)) return
          const { onRailChange, rail } = L.current
          assert(onRailChange, "rail without onRailChange")
          onRailChange(!rail)
          return
        }
        case "chrome": {
          // Hiding the chrome hides its tab stops; focus goes back to the stage first.
          if (
            rootEl.dataset.chrome === "on" &&
            barEl.contains(document.activeElement)
          ) {
            assert(stage.current, "stage unmounted")
            stage.current.focus()
          }
          setChrome((c) => !c)
          return
        }
        case "fullscreen":
          if (unavailable.has(id)) return
          if (document.fullscreenElement) void document.exitFullscreen()
          else void rootEl.requestFullscreen()
          return
        case "open":
          window.open(fullOf(entry.media), "_blank", "noopener")
          return
        case "play":
          if (!v) return
          if (v.paused)
            // Stepping off mid-buffer pauses under a pending play(): the media API
            // rejects that with AbortError, which is the one rejection that is not a bug.
            v.play().catch((e: DOMException) => {
              if (e.name !== "AbortError") throw e
            })
          else v.pause()
          return
        case "seek.back":
          if (v) v.currentTime = Math.max(0, v.currentTime - 10)
          return
        case "seek.fwd":
          if (v)
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10)
          return
        case "mute":
          if (v) v.muted = !v.muted
          return
        default: {
          const never: never = id
          throw new Error(`lightbox: unknown action ${String(never)}`)
        }
      }
    }

    // ---- pointer
    // `samples` hold ONE trajectory: the finger, or the pinch midpoint; the window is
    // emptied whenever the pointer count changes. `anchor` is the last point the hand
    // was at, relative to the band center: where a rubbered zoom is undone.
    type G = {
      pts: Map<number, Point>
      start: Sample
      samples: Sample[]
      prev: Point
      grab: Pose
      slide0: number
      axis: "x" | "y" | null
      mode: "pan" | "fit"
      pinch: {
        s0: number
        p0: number
        d0: number
        mid0: Point
        view0: View
      } | null
      pinched: boolean
      pinchMax: number
      anchor: Point
      onMedia: boolean
      type: string
    }
    let G: G | null = null
    let lastTap: Sample | null = null
    let tapTimer = 0
    const chromeTarget = (t: EventTarget | null) =>
      t instanceof Element &&
      !!t.closest("[data-lb-chrome], input, textarea, [contenteditable]")
    const dist = (pts: Map<number, Point>) => {
      const [a, b] = [...pts.values()] as [Point, Point]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const midScreen = (pts: Map<number, Point>): Point => {
      const [a, b] = [...pts.values()] as [Point, Point]
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }
    const mid = (pts: Map<number, Point>) => {
      const m = midScreen(pts)
      return rel(m.x, m.y)
    }
    const sample = (g: G, x: number, y: number, t: number) => {
      g.samples.push({ x, y, t })
      if (g.samples.length > 6) g.samples.shift()
    }
    // A gesture that takes the stage off the x axis (a pan, a pinch, a vertical
    // drag, a zoom or pan wheel) drops any committing slide first; only an x-axis
    // gesture keeps it frozen, to re-aim it on release.
    const beginGesture = () => {
      pause()
      S.gesture = true
      rootEl.dataset.gesture = ""
      layerEl().style.willChange = "transform"
    }
    const endGesture = () => {
      S.gesture = false
      delete rootEl.dataset.gesture
    }
    const onDown = (e: PointerEvent) => {
      if (chromeTarget(e.target)) return
      if (e.pointerType === "mouse" && e.button !== 0) return
      const kind = L.current.entry.media.kind
      if (!G) {
        // A finger landing ends any wheel session: one hand at a time.
        if (W) {
          clearTimeout(W.timer)
          W = null
        }
        beginGesture()
        G = {
          pts: new Map(),
          start: { x: e.clientX, y: e.clientY, t: e.timeStamp },
          samples: [],
          prev: { x: e.clientX, y: e.clientY },
          grab: pose.value,
          slide0: slide.value.x,
          axis: null,
          mode: pose.value.s > 1.01 ? "pan" : "fit",
          pinch: null,
          pinched: false,
          pinchMax: pose.value.s,
          anchor: rel(e.clientX, e.clientY),
          onMedia:
            e.target instanceof Element && !!e.target.closest(".ag-lb-layer"),
          type: e.pointerType,
        }
        if (G.mode === "pan") dropSlide()
      }
      G.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (G.pts.size === 2 && kind !== "frame") {
        G.pinch = {
          s0: pose.value.s,
          p0: pose.value.p,
          d0: dist(G.pts),
          mid0: mid(G.pts),
          view0: pose.value,
        }
        G.pinched = true
        G.axis = null
        G.samples = []
        dropSlide()
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!G?.pts.has(e.pointerId)) return
      if (G.samples.length === 0) rootEl.setPointerCapture(e.pointerId)
      G.pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const { fitted, band, zoomMax } = L.current
      if (G.pinch && G.pts.size >= 2) {
        const ms = midScreen(G.pts)
        sample(G, ms.x, ms.y, e.timeStamp)
        const raw = (G.pinch.s0 * dist(G.pts)) / G.pinch.d0
        // From fit, pinching in is the dismiss gesture and follows the fingers;
        // from a zoom it rubbers under 1 and springs back.
        const s = G.pinch.s0 <= 1.01 && raw < 1 ? raw : rubber(raw, 1, zoomMax)
        const m = mid(G.pts)
        G.anchor = m
        const v = zoomAt(G.pinch.view0, s, G.pinch.mid0)
        G.pinchMax = Math.max(G.pinchMax, raw)
        // A pinch that starts mid-drag carries the drag's darkness: p never jumps.
        pose.value = {
          x: v.x + m.x - G.pinch.mid0.x,
          y: v.y + m.y - G.pinch.mid0.y,
          s,
          p: s < 1 ? Math.min(G.pinch.p0, pinchProgress(s)) : G.pinch.p0,
        }
        write()
        return
      }
      if (G.pts.size !== 1) return
      sample(G, e.clientX, e.clientY, e.timeStamp)
      G.anchor = rel(e.clientX, e.clientY)
      const dx = e.clientX - G.start.x
      const dy = e.clientY - G.start.y
      const mx = e.clientX - G.prev.x
      const my = e.clientY - G.prev.y
      G.prev = { x: e.clientX, y: e.clientY }
      if (G.mode === "pan") {
        const b = panBounds(G.grab, fitted, band)
        pose.value = {
          ...G.grab,
          x: overshoot(G.grab.x + dx, b.x),
          y: overshoot(G.grab.y + dy, b.y),
        }
        write()
        return
      }
      // The finger left after a pinch drifts a few px: that is never a slide.
      if (G.axis === null) {
        if (Math.abs(dx) + Math.abs(dy) < INTENT) return
        G.axis = G.pinched || Math.abs(dx) <= Math.abs(dy) ? "y" : "x"
        if (G.axis === "y") dropSlide()
      } else if (
        G.axis === "x" &&
        Math.abs(my) > RELOCK &&
        Math.abs(my) > 3 * Math.abs(mx)
      ) {
        G.axis = "y"
        dropSlide()
      } else if (
        G.axis === "y" &&
        !G.pinched &&
        Math.abs(mx) > RELOCK &&
        Math.abs(mx) > 3 * Math.abs(my)
      ) {
        // The image springs back to the grab while the track takes the hand; the
        // release re-aims the pose from S.pending, so the clock is aimed directly.
        G.axis = "x"
        pose.aim(G.grab, tune(MACHINE))
        S.poseOn = true
        start()
      }
      if (G.axis === "y") {
        const h = vh()
        pose.value = {
          x: G.grab.x,
          y: G.grab.y + dy,
          s: G.grab.s * dragScale(dy, h),
          p: G.grab.p * dragProgress(dy, h),
        }
        write()
      } else {
        const { ids, index, loop } = L.current
        const can = neighbours(index, ids.length, loop)
        let x = G.slide0 + dx
        if ((x > 0 && !can.prev) || (x < 0 && !can.next)) x *= 0.35
        slide.value = { x }
        writeSlide()
      }
    }
    const tap = (G: G, e: PointerEvent) => {
      const { entry } = L.current
      if (!G.onMedia) {
        if (pose.value.s <= 1.01) dispatch("escape")
        else resume()
        return
      }
      if (entry.media.kind === "video") {
        dispatch("play")
        resume()
        return
      }
      if (entry.media.kind === "frame") {
        resume()
        return
      }
      const now = e.timeStamp
      const window_ = G.type === "touch" ? DOUBLE_TOUCH : DOUBLE_MOUSE
      const at = rel(e.clientX, e.clientY)
      if (
        lastTap &&
        now - lastTap.t < window_ &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TRAVEL
      ) {
        clearTimeout(tapTimer)
        lastTap = null
        dispatch("zoom.toggle", at)
        return
      }
      lastTap = { x: e.clientX, y: e.clientY, t: now }
      if (G.type === "touch" && pose.value.s <= 1.01) {
        clearTimeout(tapTimer)
        tapTimer = window.setTimeout(() => {
          lastTap = null
          dispatch("chrome")
        }, DOUBLE_TOUCH)
      }
      resume()
    }
    const onUp = (e: PointerEvent) => {
      if (!G?.pts.has(e.pointerId)) return
      G.pts.delete(e.pointerId)
      if (G.pts.size === 1) {
        const [p] = [...G.pts.values()] as [Point]
        G.pinch = null
        G.samples = []
        G.grab = pose.value
        G.start = { x: p.x, y: p.y, t: e.timeStamp }
        G.prev = p
        G.axis = null
        G.mode = pose.value.s > 1.01 ? "pan" : "fit"
        return
      }
      if (G.pts.size > 0) return
      endGesture()
      const g = G
      G = null
      // The release is the last sample: a finger held still before lifting
      // contributes a zero-displacement tail and no momentum.
      sample(g, e.clientX, e.clientY, e.timeStamp)
      const v = velocity(g.samples, e.timeStamp)
      const { fitted, band, ids, index, loop } = L.current
      if (g.pinched) {
        const s = pose.value.s
        if (s < PINCH_CLOSE && g.pinchMax < PINCH_PASSED) {
          beginExit(v)
          return
        }
        if (s < 1) {
          animate(FIT, 1, HAND, v)
          setZoom(1)
          return
        }
        releaseZoom(v, g.anchor)
        return
      }
      const travel = Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y)
      if (g.axis === null) {
        if (travel < TAP_TRAVEL) tap(g, e)
        else resume()
        return
      }
      if (g.mode === "pan") {
        const coast = {
          x: project(pose.value.x, v.x),
          y: project(pose.value.y, v.y),
          s: pose.value.s,
        }
        const target = clampPan(coast, fitted, band)
        animate(target, 1, coastOrWall(coast, target), v)
        return
      }
      if (g.axis === "y") {
        // The rule is about drag distance: mid-fly the absolute y still holds the
        // source offset, so the delta from the grab is what is tested. The axis is
        // locked: lateral hand speed never reaches the spring.
        const vy = { x: 0, y: v.y }
        if (dismissCommit(pose.value.y - g.grab.y, v.y, vh())) beginExit(vy)
        else animate(FIT, 1, HAND, vy)
        return
      }
      const d = slideCommit(
        slide.value.x,
        v.x,
        band.w,
        neighbours(index, ids.length, loop),
      )
      if (d === 0) {
        animateSlide(0, HAND, v.x)
        resume()
        return
      }
      stepTo(index + d, HAND, v.x)
    }

    // ---- wheel
    // A wheel session applies its accumulated delta (`x`, `y`) to the pose the hand
    // found (`grab`, or `slide0` for the track), the way a drag offsets from its
    // grab; the content follows the fingers on every axis. `last` is the accepted
    // tick the velocity window is measured against; `at` the last cursor; `live`
    // whether the session ever moved anything (a vertical session at fit is held
    // back until the inertia guard passes, and decides nothing if it never did). A
    // slide or dismiss commits the moment its rule is met, not at silence: a
    // trackpad's inertia tail is then `pass`ed, so a flick steps at once and never
    // overshoots the neighbour.
    type W = {
      axis: "zoom" | "pan" | "x" | "y" | "pass"
      live: boolean
      ticks: number[]
      y: number
      x: number
      grab: Pose
      slide0: number
      max: number
      samples: Sample[]
      last: number
      at: Point
      timer: number
    }
    let W: W | null = null
    const endWheel = () => {
      const w = W
      W = null
      if (!w) return
      const { fitted, band } = L.current
      endGesture()
      const v = velocity(w.samples, w.last)
      switch (w.axis) {
        case "pass":
          return
        case "zoom": {
          const s = pose.value.s
          if (s < PINCH_CLOSE && w.max < PINCH_PASSED) {
            beginExit()
            return
          }
          if (s < 1) {
            animate(FIT, 1, MACHINE)
            setZoom(1)
            return
          }
          releaseZoom({ x: 0, y: 0 }, w.at)
          return
        }
        case "pan":
          animate(clampPan(pose.value, fitted, band), 1, MACHINE)
          return
        case "y":
          if (!w.live) return
          animate(FIT, 1, HAND, v)
          return
        case "x": {
          animateSlide(0, HAND, v.x)
          resume()
        }
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (chromeTarget(e.target)) return
      if (performance.now() - S.enterAt < WHEEL_GUARD) return
      if (G) return
      if (W) clearTimeout(W.timer)
      const { fitted, band, zoomMax, ids, index, loop, entry } = L.current
      // Lines and pages become px here; the guard reads the tick the device sent,
      // motion reads it bounded.
      const rawX = wheelPx(e.deltaX, e.deltaMode, band.h)
      const rawY = wheelPx(e.deltaY, e.deltaMode, band.h)
      const dx = wheelTick(rawX)
      const dy = wheelTick(rawY)
      if (!W) {
        const axis: W["axis"] = e.ctrlKey
          ? "zoom"
          : pose.value.s > 1.01
            ? "pan"
            : Math.abs(dx) > Math.abs(dy)
              ? "x"
              : "y"
        if (axis === "zoom" && entry.media.kind === "frame") return
        W = {
          axis,
          live: axis !== "y",
          ticks: [],
          y: 0,
          x: 0,
          grab: pose.value,
          slide0: slide.value.x,
          max: pose.value.s,
          samples: [],
          last: 0,
          at: rel(e.clientX, e.clientY),
          timer: 0,
        }
        if (axis !== "y") beginGesture()
        if (axis === "zoom" || axis === "pan") dropSlide()
      }
      W.timer = window.setTimeout(endWheel, WHEEL_SILENCE)
      if (W.axis === "pass") return
      e.preventDefault()
      const now = performance.now()
      W.last = now
      W.at = rel(e.clientX, e.clientY)
      switch (W.axis) {
        case "zoom": {
          const raw = pose.value.s * Math.exp(-dy * WHEEL_ZOOM)
          const s = W.max <= 1.01 && raw < 1 ? raw : rubber(raw, 1, zoomMax)
          W.max = Math.max(W.max, raw)
          const v = zoomAt(pose.value, s, W.at)
          pose.value = { ...v, p: s < 1 ? pinchProgress(s) : 1 }
          write()
          return
        }
        case "pan": {
          // The raw accumulator rubbers, the way a drag offsets from its grab.
          const b = panBounds(pose.value, fitted, band)
          W.x -= dx
          W.y -= dy
          pose.value = {
            ...pose.value,
            x: overshoot(W.grab.x + W.x, b.x),
            y: overshoot(W.grab.y + W.y, b.y),
          }
          write()
          return
        }
        case "x": {
          const can = neighbours(index, ids.length, loop)
          W.x -= dx
          let x = W.slide0 + W.x
          if ((x > 0 && !can.prev) || (x < 0 && !can.next)) x *= 0.35
          // Never past the neighbour's slot: nothing is mounted beyond it.
          x = overshoot(x, band.w + SLIDE_GAP)
          slide.value = { x }
          writeSlide()
          W.samples.push({ x, y: 0, t: now })
          const vx = velocity(W.samples, now).x
          const d = slideCommit(x, vx, band.w, can)
          if (d !== 0) {
            W.axis = "pass"
            stepTo(index + d, HAND, vx)
          }
          return
        }
        case "y": {
          // Nothing accumulates before the guard decides: a session it rejects is
          // passed through whole, one it accepts starts from its first applied tick,
          // offsetting the pose it finds there.
          if (!W.live) {
            W.ticks.push(Math.abs(rawY))
            if (W.ticks.length < 3) return
            if (!wheelIsHand(W.ticks)) {
              W.axis = "pass"
              return
            }
            beginGesture()
            dropSlide()
            W.live = true
            W.grab = pose.value
          }
          W.y -= dy
          const h = vh()
          const grab = W.grab
          pose.value = {
            x: grab.x,
            y: grab.y + W.y,
            s: grab.s * dragScale(W.y, h),
            p: grab.p * dragProgress(W.y, h),
          }
          W.samples.push({ x: 0, y: W.y, t: now })
          write()
          const v = velocity(W.samples, now)
          if (dismissCommit(W.y, v.y, h)) {
            W.axis = "pass"
            beginExit({ x: 0, y: v.y })
          }
        }
      }
    }

    // ---- keys, captured on the document for the engine's lifetime: the host page
    // never sees a key while the dialog is open, and a focus that strays to body
    // (a rail unmounting under it) never silences the registry. Escape walks the
    // ladder from anywhere, the rail included; every other key inside the rail
    // belongs to the consumer's widgets and is not touched; keys typed into a field
    // elsewhere stay with the field; Space and Enter on a focused control activate
    // it; the default is prevented only for keys the registry dispatches. Tab is
    // never stopped: Base UI's document guard keeps it inside the modal, and with
    // nothing tabbable it stays on the stage. A key that is part of an IME
    // composition belongs to the composition.
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      const key = keyOf(e)
      const { layerSet, unavailable } = L.current
      const target = e.target instanceof Element ? e.target : null
      const swallow = () => {
        e.preventDefault()
        e.stopPropagation()
      }
      if (key === "Escape") {
        const rung = escRung(layerSet)
        if (rung) {
          swallow()
          dispatch(rung)
        }
        return
      }
      if (e.key === "Tab") {
        if (!tabbable()) e.preventDefault()
        return
      }
      if (target?.closest(".ag-lb-rail")) return
      if (target?.closest(TYPING)) return
      e.stopPropagation()
      if (key === null) return
      if ((key === " " || key === "Enter") && target?.closest(ACTIVATES)) return
      if (layerSet.has("sheet")) {
        // The sheet owns the keyboard: registry keys are inert behind it, and the
        // keys that scroll or tab through the sheet itself keep their default.
        if (key === "?") {
          e.preventDefault()
          dispatch("sheet")
        } else if (KEYS.has(key) && !SHEET_SCROLLS.has(key)) e.preventDefault()
        return
      }
      const a = resolve(key, layerSet)
      if (!a) {
        if (KEYS.has(key)) e.preventDefault()
        return
      }
      e.preventDefault()
      if (e.repeat && a.repeat === false) return
      if (unavailable.has(a.id as ActionId)) return
      dispatch(a.id as ActionId)
    }

    const tabbable = () =>
      [...rootEl.querySelectorAll<HTMLElement>(TABBABLE)].some(
        (el) =>
          !el.closest("[inert]") &&
          el.checkVisibility({ visibilityProperty: true }),
      )

    // Back on Android (and any platform close request) walks the ladder, one rung
    // per request; a watcher is consumed by its close, so the next rung re-arms.
    let watcher: CloseWatcher | null = null
    const arm = () => {
      if (!("CloseWatcher" in window)) return
      watcher = new CloseWatcher()
      watcher.onclose = () => {
        dispatch("escape")
        arm()
      }
    }
    arm()

    const onFullscreen = () =>
      setFullscreen(document.fullscreenElement === rootEl)
    const onPop = () => {
      S.popped = true
      dispatch("close")
    }
    let bandRaf = 0
    const onViewport = () => {
      if (bandRaf) return
      bandRaf = requestAnimationFrame(() => {
        bandRaf = 0
        const next = measureBand(L.current.rail)
        if (!sameBand(next, L.current.band)) setBand(next)
      })
    }

    rootEl.addEventListener("pointerdown", onDown)
    rootEl.addEventListener("pointermove", onMove)
    rootEl.addEventListener("pointerup", onUp)
    rootEl.addEventListener("pointercancel", onUp)
    rootEl.addEventListener("wheel", onWheel, { passive: false })
    document.addEventListener("keydown", onKey, { capture: true })
    document.addEventListener("fullscreenchange", onFullscreen)
    window.addEventListener("popstate", onPop)
    const vv = window.visualViewport
    assert(vv, "visualViewport")
    vv.addEventListener("resize", onViewport)
    vv.addEventListener("scroll", onViewport)
    window.addEventListener("resize", onViewport)

    engine.current = {
      dispatch,
      settleIndex: () => {
        slide.value = { x: 0 }
        writeSlide()
        pose.value = { ...FIT, p: 1 }
        const active = layerEl()
        for (const el of layers.current.values())
          if (el !== active) clearLayer(el)
        clipToSource()
        write()
        upgradeSizes()
        announceSlide()
      },
      refit: (prev) => {
        if (S.ph !== "idle" || S.gesture) return
        const { band, fitted } = L.current
        const { x, y, s, p } = pose.value
        const dx = prev.band.left + prev.band.w / 2 - (band.left + band.w / 2)
        const dy = prev.band.top + prev.band.h / 2 - (band.top + band.h / 2)
        const k = prev.fitted.w / fitted.w
        pose.value = { x: x + dx, y: y + dy, s: s * k, p }
        write()
        animate(
          s > 1.01 ? clampPan({ x: x + dx, y: y + dy, s }, fitted, band) : FIT,
          1,
          MACHINE,
        )
      },
    }
    bind(dispatch)

    // Frame one: the source pose, written before paint. The engine is the only
    // writer of data-z and --lb-p.
    rootEl.dataset.z = S.z
    if (!rest) {
      const sv = source()
      assert(sv, "open without a trigger rect")
      clipVars(layerEl(), sv.clip, sv.radius)
      pose.value = { ...sv.view, p: 0 }
      write()
      animate(FIT, 1, MACHINE, undefined, "enter")
    } else {
      write()
      announceSlide()
    }

    return () => {
      if (S.raf) cancelAnimationFrame(S.raf)
      if (bandRaf) cancelAnimationFrame(bandRaf)
      clearTimeout(tapTimer)
      if (W) clearTimeout(W.timer)
      rootEl.removeEventListener("pointerdown", onDown)
      rootEl.removeEventListener("pointermove", onMove)
      rootEl.removeEventListener("pointerup", onUp)
      rootEl.removeEventListener("pointercancel", onUp)
      rootEl.removeEventListener("wheel", onWheel)
      document.removeEventListener("keydown", onKey, { capture: true })
      watcher?.destroy()
      document.removeEventListener("fullscreenchange", onFullscreen)
      window.removeEventListener("popstate", onPop)
      vv.removeEventListener("resize", onViewport)
      vv.removeEventListener("scroll", onViewport)
      window.removeEventListener("resize", onViewport)
      engine.current = null
    }
  }, [])

  // The trigger is the source: hidden for the open lifetime, restored in the unmount
  // paint. On every step (and on a deep-link open) the new trigger scrolls into
  // view so close has a target; the trigger the user just clicked is on screen
  // already, and its rect was measured before this effect, so it never scrolls.
  const opened = React.useRef(!rest)
  // biome-ignore lint/correctness/useExhaustiveDependencies: per entry
  React.useLayoutEffect(() => {
    const t = triggers.current.get(id)
    const el = t?.el
    if (el) {
      if (!opened.current)
        el.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        })
      el.style.visibility = "hidden"
    }
    opened.current = false
    setCaption(
      entry.caption ??
        el?.closest("figure")?.querySelector("figcaption")?.textContent ??
        altOf(entry.media),
    )
    // A deep link has nothing behind it: at rest no entry is pushed, and close strips
    // the hash. A step rewrites the entry in place.
    if (history) {
      const state = window.history.state as { lb?: string } | null
      const url = `#lb=${encodeURIComponent(id)}`
      if (state?.lb) window.history.replaceState({ lb: id }, "", url)
      else if (rest) window.history.replaceState(null, "", url)
      else window.history.pushState({ lb: id }, "", url)
    }
    return () => {
      if (el) el.style.visibility = ""
    }
  }, [id])

  // After a step commits the track resets and the new active layer takes the pose.
  const settledIndex = React.useRef(index)
  React.useLayoutEffect(() => {
    if (settledIndex.current === index) return
    settledIndex.current = index
    engine.current?.settleIndex()
  }, [index])

  // The band moved (rail, viewport): the media re-fits beside it through the spring.
  const geo = React.useRef({ band, fitted })
  // biome-ignore lint/correctness/useExhaustiveDependencies: band is the trigger
  React.useLayoutEffect(() => {
    const prev = geo.current
    geo.current = { band, fitted }
    if (sameBand(prev.band, band)) return
    engine.current?.refit(prev)
  }, [band])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rail flips the band
  React.useLayoutEffect(() => {
    const next = measureBand(rail)
    if (!sameBand(next, band)) setBand(next)
  }, [rail])

  const dispatch = (a: ActionId) => engine.current?.dispatch(a)
  // The sheet owns the keyboard while up: its siblings are inert, so Tab has
  // nothing to reach outside it and assistive tech sees only the sheet. Focus goes
  // to it on mount and back to the stage once the siblings are live again.
  const sheetEl = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!sheet) return
    assert(sheetEl.current, "sheet rendered nothing")
    sheetEl.current.focus()
    return () => {
      stage.current?.focus()
    }
  }, [sheet])
  const slots = React.useMemo(() => {
    const out: { slot: -1 | 0 | 1; id: string }[] = [{ slot: 0, id }]
    const can = neighbours(index, count, loop)
    const at = (k: -1 | 1) =>
      (k === 1 ? can.next : can.prev)
        ? (ids[(index + k + count) % count] as string)
        : null
    for (const slot of dir === 1 ? ([1, -1] as const) : ([-1, 1] as const)) {
      const nid = at(slot)
      if (nid && !out.some((o) => o.id === nid)) out.push({ slot, id: nid })
    }
    return out
  }, [id, ids, index, count, loop, dir])

  return (
    <Dialog.Popup
      ref={root}
      className="ag-lb"
      data-phase={phase}
      data-chrome={chrome ? "on" : "off"}
      data-zoomed={zoomed ? "" : undefined}
      data-kind={media.kind}
      aria-label={`${index + 1} of ${count} · ${label}`}
      initialFocus={stage}
      finalFocus={() => triggers.current.get(ids[index] as string)?.el ?? true}
      style={
        {
          "--lb-rail-w": `${RAIL_W}px`,
          "--lb-rail-h": `${RAIL_H * 100}%`,
        } as React.CSSProperties
      }
    >
      <div ref={scrim} className="ag-lb-scrim" />
      <div
        ref={stage}
        className="ag-lb-stage"
        tabIndex={-1}
        inert={sheet || undefined}
        style={{
          top: band.top,
          left: band.left,
          width: band.w,
          height: band.h,
        }}
      >
        <div ref={track} className="ag-lb-track">
          {slots.map(({ slot, id: lid }) => (
            <Layer
              key={lid}
              entry={entryOf(lid)}
              slot={slot}
              band={band}
              active={slot === 0}
              warm={warm}
              layers={layers}
              video={video}
            />
          ))}
        </div>
      </div>
      {/* The chrome lives in the media lane, the band the stage measures, so it is
          never under the rail. */}
      <div
        ref={chromeEl}
        className="ag-lb-chrome"
        data-lb-chrome
        inert={sheet || undefined}
        style={{
          top: band.top - INSET_Y,
          left: band.left,
          width: band.w,
          height: band.h + 2 * INSET_Y,
        }}
      >
        <div className="ag-lb-bar">
          <span className="ag-lb-counter">
            {index + 1} / {count}
          </span>
          {status && <span className="ag-lb-status">{status}</span>}
          <span className="ag-lb-spacer" />
          <Button id="close" dispatch={dispatch} unavailable={unavailable}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </Button>
        </div>
        <Button
          id="prev"
          dispatch={dispatch}
          unavailable={unavailable}
          className="ag-lb-nav"
          data-side="left"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </Button>
        <Button
          id="next"
          dispatch={dispatch}
          unavailable={unavailable}
          className="ag-lb-nav"
          data-side="right"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </Button>
        <Button
          id="rail"
          dispatch={dispatch}
          unavailable={unavailable}
          className="ag-lb-details"
          pressed={rail}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 7v5M8 4.5v.5" />
          </svg>
        </Button>
        <div className="ag-lb-caption">{caption}</div>
      </div>
      <div className="ag-lb-live" aria-live="polite">
        <span key={announce.n}>{announce.text}</span>
      </div>
      {rail && renderRail && (
        <Rail inert={sheet} stage={stage}>
          <div className="ag-lb-facts">{factsLine(facts)}</div>
          {renderRail(entry, facts)}
        </Rail>
      )}
      {sheet && (
        <div
          ref={sheetEl}
          className="ag-lb-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="keys"
          tabIndex={-1}
          data-lb-chrome
        >
          <div className="ag-lb-sheet-head">keys</div>
          <dl>
            {ACTIONS.map((a) => (
              <div
                key={a.id}
                data-unavailable={
                  !available(a, layerSet) || unavailable.has(a.id)
                    ? ""
                    : undefined
                }
              >
                <dt>
                  {a.keys.map((k) => (
                    <kbd key={k}>{keycap(k)}</kbd>
                  ))}
                </dt>
                <dd>{a.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Dialog.Popup>
  )
}

/** The consumer's rail. Focus inside it goes back to the stage before the aside
 *  is detached: an element removed under focus fires no focusout, and a focus left
 *  on body is a dead keyboard. */
function Rail({
  inert,
  stage,
  children,
}: {
  inert: boolean
  stage: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  const aside = React.useRef<HTMLElement>(null)
  React.useLayoutEffect(() => {
    return () => {
      assert(aside.current, "rail rendered nothing")
      // On a full close the stage ref is already detached (it precedes the rail in
      // the tree) and Base UI returns focus to the trigger.
      if (stage.current && aside.current.contains(document.activeElement))
        stage.current.focus()
    }
  }, [stage])

  return (
    <aside
      ref={aside}
      className="ag-lb-rail"
      data-lb-chrome
      aria-label="details"
      inert={inert || undefined}
    >
      {children}
    </aside>
  )
}

function factsLine(f: Facts): string {
  const on = `${Math.round(f.rendered.w)}px on screen`
  const zoom = `${Math.round(f.zoom * 100)}%`
  const parts = [
    f.natural ? `${f.natural.w} × ${f.natural.h}` : "frame",
    on,
    zoom,
  ]
  if (f.sourceLimited) parts.push("source-limited")
  return parts.join(" · ")
}

function Button({
  id,
  dispatch,
  unavailable,
  pressed,
  className,
  children,
  ...rest
}: {
  id: ActionId
  dispatch: (id: ActionId) => void
  unavailable: ReadonlySet<ActionId>
  pressed?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "id" | "children">) {
  const a: Action = action(id)
  return (
    <button
      type="button"
      className={`ag-lb-btn${className ? ` ${className}` : ""}`}
      aria-label={a.label}
      aria-keyshortcuts={keyshortcuts(a)}
      aria-pressed={pressed}
      title={`${a.label} · ${a.keys.map(keycap).join(" ")}`}
      aria-disabled={unavailable.has(id) || undefined}
      onClick={() => dispatch(id)}
      {...rest}
    >
      {children}
    </button>
  )
}

const Layer = React.memo(function Layer({
  entry,
  slot,
  band,
  active,
  warm,
  layers,
  video,
}: {
  entry: Entry
  slot: -1 | 0 | 1
  band: Band
  active: boolean
  warm: boolean
  layers: React.RefObject<Map<string, HTMLDivElement>>
  video: React.RefObject<HTMLVideoElement | null>
}) {
  const m = entry.media
  const fitted = fitOf(m, band)
  const gutter = gutterOf(m)
  const w = fitted.w + 2 * gutter
  const h = fitted.h + 2 * gutter
  const blur =
    m.kind === "image" || m.kind === "gif"
      ? m.source.blur
      : m.kind === "video"
        ? m.poster.blur
        : undefined
  const mounted = active || warm
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      assert(el, "layer rendered nothing")
      layers.current.set(entry.id, el)
      return () => {
        layers.current.delete(entry.id)
      }
    },
    [entry.id, layers],
  )
  return (
    // biome-ignore lint/a11y/useSemanticElements: a slide is a group, not a fieldset
    <div
      ref={ref}
      className="ag-lb-layer"
      role="group"
      aria-roledescription="slide"
      aria-hidden={!active}
      data-active={active ? "" : undefined}
      data-kind={m.kind}
      style={{
        left: (band.w - w) / 2 + slot * (band.w + SLIDE_GAP),
        top: (band.h - h) / 2,
        width: w,
        height: h,
        padding: gutter,
        background: blur,
      }}
    >
      {mounted && (
        <Content m={m} active={active} fitted={fitted} video={video} />
      )}
    </div>
  )
})

/** A still: the page's pixels paint frame one, the original cross-fades over them
 *  once decoded. The active slide asks for its fit; a neighbour asks for its own
 *  fit at low priority, from `srcset` only. */
function Still({
  source: s,
  alt,
  active,
  fitted,
  upgrades,
}: {
  source: Source
  alt: string
  active: boolean
  fitted: Size
  upgrades: boolean
}) {
  // The live element is the one place the resource answers for: a decode superseded
  // by a `sizes` reselection is silent, a broken original throws with its url.
  const ready = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const url = img.currentSrc
    img.decode().then(
      () => img.setAttribute("data-ready", ""),
      (err: unknown) => {
        if (img.currentSrc === url) throw err
      },
    )
  }
  const failed = (e: React.SyntheticEvent<HTMLImageElement>) => {
    throw new Error(`lightbox: failed to load ${e.currentTarget.currentSrc}`)
  }
  // The upgrade is earned once: a slide that was active keeps its decoded original
  // one slot away instead of regressing to its blur and fading up again on the way
  // back. A neighbour never visited stays base-only (the three-bitmap cap holds).
  const seen = React.useRef(false)
  if (active) seen.current = true
  const upgrade = upgrades && (!!s.srcset || (s.full !== s.src && seen.current))
  return (
    <>
      {/* biome-ignore lint/performance/noImgElement: the page's own pixels, frame one */}
      <img
        className="ag-lb-base"
        src={s.src}
        alt={alt}
        draggable={false}
        // Decoded as part of presenting the first frame: the source is cache-hot and
        // cheap, and a blank first frame under a hidden trigger is the failure.
        decoding="sync"
      />
      {upgrade && (
        // biome-ignore lint/performance/noImgElement: the original, cross-fading in
        <img
          className="ag-lb-up"
          src={s.full}
          srcSet={s.srcset}
          sizes={`${Math.round(fitted.w)}px`}
          fetchPriority={active ? "high" : "low"}
          decoding="async"
          alt=""
          draggable={false}
          onLoad={ready}
          onError={failed}
        />
      )}
    </>
  )
}

/** The one <video>: mounted on the active slide only, released once, on unmount.
 *  `src` is owned by the effect so setup and cleanup are symmetric (StrictMode runs
 *  the pair once on mount). No `poster`: the Still under it is the poster, and a
 *  <video> with no decoded frame is transparent until the first frame arrives. */
function Video({
  m,
  video,
}: {
  m: VideoMedia
  video: React.RefObject<HTMLVideoElement | null>
}) {
  const el = React.useRef<HTMLVideoElement>(null)
  React.useEffect(() => {
    const v = el.current
    assert(v, "video rendered nothing")
    v.src = m.src
    video.current = v
    return () => {
      v.pause()
      v.removeAttribute("src")
      v.load()
      video.current = null
    }
  }, [video, m.src])
  return (
    <video
      ref={el}
      className="ag-lb-video"
      aria-label={m.title}
      preload="metadata"
      playsInline
      muted={m.muted}
      loop={m.loop}
      onLoadedMetadata={(e) => {
        if (m.start) e.currentTarget.currentTime = m.start
      }}
    />
  )
}

function Content({
  m,
  active,
  fitted,
  video,
}: {
  m: Media
  active: boolean
  fitted: Size
  video: React.RefObject<HTMLVideoElement | null>
}) {
  if (m.kind === "image" || m.kind === "gif")
    return (
      <Still
        source={m.source}
        alt={m.alt}
        active={active}
        fitted={fitted}
        upgrades={m.kind === "image"}
      />
    )
  if (m.kind === "video")
    return (
      <>
        <Still
          source={m.poster}
          alt={m.title}
          active={active}
          fitted={fitted}
          upgrades
        />
        {active && <Video m={m} video={video} />}
      </>
    )
  return active ? (
    <iframe className="ag-lb-frame" src={m.src} title={m.title} />
  ) : (
    <div className="ag-lb-frame-ghost">{m.title}</div>
  )
}
