// Runnable example and gate: `bun scripts/examples/macos-session.ts` folds every
// timeline under public/macos/ and asserts it is playable. Every hover and press lands
// on a real row of a menu that is open at that instant, a press lands on a row that
// does something, and the story ends with the menu closed. The app's compiler already
// refuses a script that clicks a row its menu does not have; this is the same promise
// checked from the side that plays the file.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import {
  frameAt,
  rowAt,
  sceneClock,
  type Timeline,
} from "../../registry/base-nova/lib/macos-session"

// mise runs every example from the repo root.
const root = join(process.cwd(), "public/macos")
let checked = 0
for (const app of readdirSync(root)) {
  for (const file of readdirSync(join(root, app))) {
    if (!file.endsWith(".json") || file === "art.json") continue
    const name = `${app}/${file}`
    const timeline = JSON.parse(
      readFileSync(join(root, app, file), "utf8"),
    ) as Timeline
    const clock = sceneClock(timeline)
    timeline.steps.forEach((s, i) => {
      if (s.kind !== "hover" && s.kind !== "press") return
      // The instant just before this step: the menu it points into.
      const before = frameAt(timeline, clock, (clock.starts[i] as number) - 1)
      if (!before.menu)
        throw new Error(`${name} step ${i}: ${s.kind} with no menu open`)
      const row = rowAt(before.menu.rows, s.path ?? [])
      if (!row || row.separator)
        throw new Error(`${name} step ${i}: ${s.kind} at ${s.path} is no row`)
      if (s.kind === "press" && (row.disabled || row.submenu))
        throw new Error(
          `${name} step ${i}: pressed "${row.title}" does nothing`,
        )
    })
    const end = frameAt(timeline, clock, clock.total)
    if (end.menu) throw new Error(`${name}: ends with the menu open`)
    console.log(
      `${name}: ${timeline.steps.length} steps, ${(clock.total / 1000).toFixed(1)}s, ends ${end.glyph} at ${end.world.clock}`,
    )
    checked++
  }
}
if (checked === 0) throw new Error(`no timelines under ${root}`)
