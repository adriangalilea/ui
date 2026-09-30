import {
  parseSession,
  renderSessionSvg,
  sessionTimeline,
} from "@/registry/base-nova/lib/terminal-session"
import { Player } from "@/registry/base-nova/ui/player"
import { Terminal } from "@/registry/base-nova/ui/terminal"

const SESSION = `$ trash thesis-draft.txt
trashed: ~/Desktop/thesis-draft.txt

@700 $ trash list
thesis-draft.txt  2026-08-20 14:27  ~/Desktop/thesis-draft.txt

@700 $ trash restore thesis-draft.txt
restored: ~/Desktop/thesis-draft.txt
~ 0 items left`

const ACCENT = "#e7a13c"
// The session's clip: one chapter per command, played by the player around it.
const CLIP = sessionTimeline(parseSession(SESSION)).clip

export default function Demo() {
  // The same script, drawn twice: live in the DOM, and as an SVG still by the
  // renderer in terminal-session. One source, so a feature card and the page it
  // links to can never disagree about what the terminal did.
  const still = renderSessionSvg(parseSession(SESSION), { accent: ACCENT })
  return (
    <div className="space-y-4">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="font-mono text-xs lowercase text-muted-foreground">
            live · terminal in a player
          </div>
          <Player clip={CLIP} label="trash, list, restore">
            <Terminal
              session={SESSION}
              accent={ACCENT}
              rows={12}
              alt="A terminal session: trash, list, restore."
            />
          </Player>
        </div>
        <div className="space-y-2">
          <div className="font-mono text-xs lowercase text-muted-foreground">
            still · terminal-session, no react
          </div>
          {/* biome-ignore lint/performance/noImgElement: an inline data URL */}
          <img
            alt="The same session rendered as a still."
            className="w-full rounded-xl border border-border"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(still)}`}
          />
        </div>
      </div>
      <Player clip={CLIP} label="the same session, default phosphor">
        <Terminal
          session={SESSION}
          rows={12}
          alt="The same session on the default phosphor."
        />
      </Player>
    </div>
  )
}
