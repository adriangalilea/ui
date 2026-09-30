import { Sample } from "@/app/samples"
import { keys, withKeys } from "@/registry/base-nova/lib/keys"

// #region strings
const STRINGS = [
  "⌃⌥⌘A",
  "ctrl+alt+cmd+a",
  "cmd+shift+4",
  "← →",
  "esc",
  "awake hotkey",
  "2h",
]
const SENTENCE = "Press ⌃⌥⌘A to keep your Mac awake."
// #endregion

/** What reads as keys and what does not, and a shortcut found inside a sentence. */
export default function KeysDemo() {
  return (
    <div className="space-y-8">
      <Sample
        name="keys"
        label="keys · any notation to the keys pressed, or null"
        with="strings"
      >
        <ul className="space-y-1 font-mono text-xs">
          {STRINGS.map((s) => (
            <li key={s}>
              <span className="text-muted-foreground">{s}</span> →{" "}
              {JSON.stringify(keys(s))}
            </li>
          ))}
        </ul>
      </Sample>
      <Sample
        name="with-keys"
        label="withKeys · a sentence split around its shortcuts"
        with="strings"
      >
        <p className="font-mono text-xs">
          {JSON.stringify(withKeys(SENTENCE))}
        </p>
      </Sample>
    </div>
  )
}
