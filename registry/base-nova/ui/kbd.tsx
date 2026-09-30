// Keyboard shortcuts drawn as keys. `<Kbd keys="⌃⌥⌘A" />` draws one shortcut, in any
// notation lib/keys reads (`ctrl+alt+cmd+a`, `← →` for keys pressed in turn), and
// screams when the string is not keys. `<KeysText>` draws a sentence with its
// shortcuts as keys ("Press ⌃⌥⌘A to …"), for text that comes from somewhere else: a
// caption, a scene, a changelog. `isKeys` lets a renderer decide between keys and
// code (`awake hotkey` is a command, not keys).

import { cn } from "@/lib/utils"
import { keys, withKeys } from "@/registry/base-nova/lib/keys"

export function isKeys(text: string): boolean {
  return keys(text) !== null
}

/** One key. Every measure is in em, so a cap is the same shape at any size: inline
 *  in a sentence or large over a stage. The Mac's own face draws ⌃⌥⌘ as macOS does. */
const CAP =
  "inline-flex min-w-[1.8em] items-center justify-center rounded-[0.32em] border border-b-2 border-border bg-muted px-[0.45em] py-[0.32em] text-[0.8em] font-medium leading-none text-foreground/90 [font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif]"

function Caps({ caps }: { caps: string[] }) {
  return (
    <span className="inline-flex gap-[0.25em]">
      {caps.map((cap, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: caps repeat (⌘ ⌘), position is identity
        <kbd key={i} data-slot="kbd-cap" className={CAP}>
          {cap}
        </kbd>
      ))}
    </span>
  )
}

export function Kbd({
  keys: text,
  className,
}: {
  keys: string
  className?: string
}) {
  const combos = keys(text)
  if (!combos) throw new Error(`Kbd: "${text}" is not a keyboard shortcut`)
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex gap-[0.5em] align-[-0.12em] font-[inherit] not-italic",
        className,
      )}
    >
      {combos.map((caps, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a sequence is positional
        <Caps key={i} caps={caps} />
      ))}
    </kbd>
  )
}

export function KeysText({ children }: { children: string }) {
  return (
    <>
      {withKeys(children).map((part, i) =>
        "keys" in part ? (
          <kbd
            // biome-ignore lint/suspicious/noArrayIndexKey: a sentence is positional
            key={i}
            data-slot="kbd"
            className="inline-flex align-[-0.12em] font-[inherit] not-italic"
          >
            <Caps caps={part.keys} />
          </kbd>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a sentence is positional
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
