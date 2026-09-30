// Keyboard shortcuts as data: a string of keys split into the caps a person presses,
// in the Mac's own glyphs. It reads the notations people write (`⌃⌥⌘A`,
// `ctrl+alt+cmd+a`, `⇧⌘F`, `← →`) and refuses anything that is not keys (`awake
// hotkey`), so a renderer can tell a shortcut from a command without being told.
// Framework-free.

/** Modifier glyphs, in the order macOS prints them. */
const MODIFIERS = ["fn", "⌃", "⌥", "⇧", "⌘"] as const
const MODIFIER_GLYPHS = "⌃⌥⇧⌘"

/** Named keys as people write them, to the cap macOS shows. */
const NAMED: Record<string, string> = {
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  opt: "⌥",
  option: "⌥",
  shift: "⇧",
  cmd: "⌘",
  command: "⌘",
  meta: "⌘",
  fn: "fn",
  esc: "esc",
  escape: "esc",
  enter: "↩",
  return: "↩",
  tab: "⇥",
  space: "space",
  delete: "⌫",
  backspace: "⌫",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  home: "home",
  end: "end",
}

/** One key (not a modifier) as its cap, or null when it is not a key. */
function key(token: string): string | null {
  const named = NAMED[token.toLowerCase()]
  if (named && !MODIFIER_GLYPHS.includes(named) && named !== "fn") return named
  if (/^f([1-9]|1[0-9]|20)$/i.test(token)) return token.toUpperCase()
  if ([...token].length === 1 && !MODIFIER_GLYPHS.includes(token)) return token
  return null
}

function modifier(token: string): string | null {
  if (MODIFIER_GLYPHS.includes(token) && token.length === 1) return token
  const named = NAMED[token.toLowerCase()]
  return named && (MODIFIER_GLYPHS.includes(named) || named === "fn")
    ? named
    : null
}

function ordered(mods: string[]): string[] {
  const set = new Set(mods)
  return MODIFIERS.filter((m) => set.has(m))
}

/** One combination pressed together ("⌃⌥⌘A", "ctrl+alt+cmd+a", "esc"), as its caps
 *  with the modifiers in macOS order and a letter capitalised under a modifier.
 *  Null when the string is not a shortcut. */
export function combo(text: string): string[] | null {
  const s = text.trim()
  if (!s) return null
  // Written with +: every part a modifier, the last one a key ("⌘+" is Command
  // and the plus key, read as glyphs below).
  const parts = s.split("+")
  if (parts.length > 1 && parts.every(Boolean)) {
    const last = key(parts.at(-1) as string)
    const mods = parts.slice(0, -1).map(modifier)
    if (!last || mods.some((m) => m === null)) return null
    return [...ordered(mods as string[]), last.toUpperCase()]
  }
  // Written in glyphs: modifier glyphs, then one key.
  const chars = [...s]
  let i = 0
  while (i < chars.length && MODIFIER_GLYPHS.includes(chars[i] as string)) i++
  const rest = chars.slice(i).join("")
  const mods = chars.slice(0, i)
  if (!rest) return null
  const last = key(rest)
  if (!last) return null
  return [...ordered(mods), mods.length ? last.toUpperCase() : last]
}

/** Combinations pressed one after another, space-separated ("← →", "g g"), or null
 *  when any of them is not a shortcut. */
export function keys(text: string): string[][] | null {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const combos = parts.map(combo)
  return combos.every((c) => c !== null) ? (combos as string[][]) : null
}

/** A text with shortcuts written in glyphs ("Press ⌃⌥⌘A to keep your Mac awake."),
 *  split so each shortcut can be drawn as keys and the rest stays text. */
export function withKeys(
  text: string,
): ({ text: string } | { keys: string[] })[] {
  const out: ({ text: string } | { keys: string[] })[] = []
  const run =
    /[⌃⌥⇧⌘]+(?:F(?:[1-9]|1[0-9]|20)(?![0-9])|[↩⇥⌫⎋←→↑↓␣]|[A-Za-z0-9](?![A-Za-z0-9])|[^\s\p{L}\p{N}])/gu
  let at = 0
  for (const m of text.matchAll(run)) {
    const found = combo(m[0])
    if (!found) continue
    if (m.index > at) out.push({ text: text.slice(at, m.index) })
    out.push({ keys: found })
    at = m.index + m[0].length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}
