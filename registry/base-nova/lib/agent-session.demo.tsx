import { Sample } from "@/app/samples"
import { formatElapsed } from "@/registry/base-nova/lib/agent-session"

// #region seconds
const SECONDS = [12, 187, 8040]
// #endregion

/** The lib is the entry types the skins share, and how both CLIs say elapsed time. */
export default function AgentSessionDemo() {
  return (
    <Sample
      name="elapsed"
      label="formatElapsed · seconds as both CLIs say them"
      with="seconds"
    >
      <ul className="space-y-1 font-mono text-xs">
        {SECONDS.map((s) => (
          <li key={s}>
            <span className="text-muted-foreground tabular-nums">{s}s</span> →{" "}
            {formatElapsed(s)}
          </li>
        ))}
      </ul>
    </Sample>
  )
}
