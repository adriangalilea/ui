// Runnable example: `bun scripts/examples/session-still.ts > /tmp/still.svg` prints
// the SVG of a sample session to stdout and its timeline to stderr. The lib itself
// stays free of any runtime (no bun, no node, no DOM) so browsers can ship it.
import {
  parseSession,
  renderSessionSvg,
  sessionTimeline,
} from "../../registry/base-nova/lib/terminal-session"

const sample = `$ trash thesis-draft.txt
trashed: ~/Desktop/thesis-draft.txt

@600 $ trash list
thesis-draft.txt  2026-08-20 14:27  ~/Desktop/thesis-draft.txt
~ 1 item`

const lines = parseSession(sample)
const timeline = sessionTimeline(lines)
console.error(`${lines.length} lines, ${timeline.total} ms`)
process.stdout.write(renderSessionSvg(lines))
