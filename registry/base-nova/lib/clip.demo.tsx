import { Sample } from "@/app/samples"
import { progressAt, spans } from "@/registry/base-nova/lib/clip"
import {
  parseSession,
  sessionTimeline,
} from "@/registry/base-nova/lib/terminal-session"

// #region clip
const CLIP = sessionTimeline(
  parseSession(`$ awake grant
~ macOS asks once, natively

@600 $ awake grant --remove
~ takes it back`),
).clip
// #endregion

/** A terminal session's clip: its length, a chapter per command, and a moment as the
 *  progress its component draws. */
export default function ClipDemo() {
  return (
    <Sample
      name="clip"
      label="a session's clip · chapters and a moment"
      with="clip"
    >
      <ul className="space-y-1 font-mono text-xs">
        {spans(CLIP).map((c) => (
          <li key={c.start}>
            <span className="text-muted-foreground tabular-nums">
              {c.start}–{c.end} ms
            </span>{" "}
            {c.title}
          </li>
        ))}
        <li className="text-muted-foreground">
          progressAt(clip, 1000) = {progressAt(CLIP, 1000).toFixed(3)}
        </li>
      </ul>
    </Sample>
  )
}
