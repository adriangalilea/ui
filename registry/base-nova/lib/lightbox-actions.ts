// The lightbox's action registry: the single source for key dispatch, buttons,
// tooltips, aria-keyshortcuts, the live region and the `?` sheet. Every pointer verb
// dispatches an id from this table too. Layers stack innermost first; `resolve` hands a
// key to the innermost active layer that owns it. Framework-free; the shape is what a
// future keymap item adopts unchanged.

export type Layer =
  | "always"
  | "fit"
  | "zoomed"
  | "video"
  | "sheet"
  | "fullscreen"

/** Innermost first: the order `resolve` and the Escape ladder walk. */
export const LAYERS: readonly Layer[] = [
  "sheet",
  "fullscreen",
  "zoomed",
  "fit",
  "video",
  "always",
]

export type Action = {
  readonly id: string
  /** KeyboardEvent.key values; `Shift+` prefixes a named key. */
  readonly keys: readonly string[]
  readonly layer: Layer
  readonly label: string
  /** Held-key repeat accepted unless false. */
  readonly repeat?: boolean
}

export const ACTIONS = [
  { id: "sheet", keys: ["?"], layer: "always", label: "keys" },
  { id: "sheet.close", keys: ["Escape"], layer: "sheet", label: "close keys" },
  { id: "zoom.fit", keys: ["Escape", "0"], layer: "zoomed", label: "fit" },
  { id: "close", keys: ["Escape"], layer: "fit", label: "close" },
  {
    id: "prev",
    keys: ["ArrowLeft"],
    layer: "fit",
    label: "previous",
    repeat: false,
  },
  {
    id: "next",
    keys: ["ArrowRight"],
    layer: "fit",
    label: "next",
    repeat: false,
  },
  { id: "first", keys: ["Home"], layer: "always", label: "first" },
  { id: "last", keys: ["End"], layer: "always", label: "last" },
  { id: "pan.left", keys: ["ArrowLeft"], layer: "zoomed", label: "pan" },
  { id: "pan.right", keys: ["ArrowRight"], layer: "zoomed", label: "pan" },
  { id: "pan.up", keys: ["ArrowUp"], layer: "zoomed", label: "pan" },
  { id: "pan.down", keys: ["ArrowDown"], layer: "zoomed", label: "pan" },
  {
    id: "step.prev",
    keys: ["Shift+ArrowLeft"],
    layer: "zoomed",
    label: "previous",
  },
  {
    id: "step.next",
    keys: ["Shift+ArrowRight"],
    layer: "zoomed",
    label: "next",
  },
  { id: "zoom.in", keys: ["+", "="], layer: "always", label: "zoom in" },
  { id: "zoom.out", keys: ["-"], layer: "always", label: "zoom out" },
  { id: "rail", keys: ["i"], layer: "always", label: "details" },
  { id: "chrome", keys: ["h"], layer: "always", label: "hide chrome" },
  { id: "fullscreen", keys: ["f"], layer: "always", label: "fullscreen" },
  { id: "open", keys: ["o"], layer: "always", label: "open original" },
  { id: "play", keys: [" ", "k"], layer: "video", label: "play / pause" },
  { id: "seek.back", keys: ["j"], layer: "video", label: "-10s" },
  { id: "seek.fwd", keys: ["l"], layer: "video", label: "+10s" },
  { id: "mute", keys: ["m"], layer: "video", label: "mute" },
] as const satisfies readonly Action[]

export type ActionId = (typeof ACTIONS)[number]["id"]

/** Every key the registry claims, so the dialog can swallow them all while open. */
export const KEYS: ReadonlySet<string> = new Set(ACTIONS.flatMap((a) => a.keys))

export function action(id: ActionId): Action {
  const found = ACTIONS.find((a) => a.id === id)
  if (!found) throw new Error(`lightbox: unknown action ${id}`)
  return found
}

/** The innermost active layer owning `key`, or null. */
export function resolve(
  key: string,
  layers: ReadonlySet<Layer>,
): Action | null {
  for (const layer of LAYERS) {
    if (!layers.has(layer)) continue
    const owner = ACTIONS.find(
      (a) => a.layer === layer && (a.keys as readonly string[]).includes(key),
    )
    if (owner) return owner
  }
  return null
}

/** The Escape ladder, one rung per press: sheet closes, fullscreen exits (the browser
 *  does it, so null: we never double), zoomed springs to fit, then close. */
export function escRung(layers: ReadonlySet<Layer>): ActionId | null {
  if (layers.has("sheet")) return "sheet.close"
  if (layers.has("fullscreen")) return null
  if (layers.has("zoomed")) return "zoom.fit"
  return "close"
}

/** Whether a row is live for this layer set (the sheet dims the rest). */
export function available(a: Action, layers: ReadonlySet<Layer>): boolean {
  return layers.has(a.layer)
}

/** A KeyboardEvent as a registry key; null yields the chord to the browser. Shift
 *  prefixes named keys only: a printable key already carries it ("?" is "?"). */
export function keyOf(e: {
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
}): string | null {
  if (e.altKey || e.ctrlKey || e.metaKey) return null
  return e.shiftKey && e.key.length > 1 ? `Shift+${e.key}` : e.key
}

/** `aria-keyshortcuts` for a row: named keys as-is, Shift chords joined by +. */
export function keyshortcuts(a: Action): string {
  return a.keys.map((k) => (k === " " ? "Space" : k)).join(" ")
}

/** Human key caps for `<kbd>`. */
export function keycap(key: string): string {
  const caps: Record<string, string> = {
    " ": "space",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Escape: "esc",
    Home: "home",
    End: "end",
  }
  return key
    .split("+")
    .map((part) => caps[part] ?? part.toLowerCase())
    .join(" ")
}

// Two actions sharing a key within one layer is a dispatch ambiguity: scream at load.
for (const layer of LAYERS) {
  const seen = new Set<string>()
  for (const a of ACTIONS) {
    if (a.layer !== layer) continue
    for (const k of a.keys) {
      if (seen.has(k))
        throw new Error(
          `lightbox: key "${k}" is claimed twice in layer "${layer}" (${a.id})`,
        )
      seen.add(k)
    }
  }
}
