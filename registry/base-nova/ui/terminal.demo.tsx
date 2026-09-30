"use client"

import {
  parseSession,
  renderSessionSvg,
  sessionTimeline,
} from "@/registry/base-nova/lib/terminal-session"
import { Player } from "@/registry/base-nova/ui/player"
import { Terminal } from "@/registry/base-nova/ui/terminal"

/** A session in the player: one chapter per command. */
function Played({
  session,
  accent,
  alt,
}: {
  session: string
  accent?: string
  alt: string
}) {
  const clip = sessionTimeline(parseSession(session)).clip
  return (
    <Player clip={clip} label={alt}>
      {(progress) => (
        <Terminal
          session={session}
          progress={progress}
          accent={accent}
          rows={12}
          alt={alt}
        />
      )}
    </Player>
  )
}

const SESSION = `$ trash thesis-draft.txt
trashed: ~/Desktop/thesis-draft.txt

@700 $ trash list
thesis-draft.txt  2026-08-20 14:27  ~/Desktop/thesis-draft.txt

@700 $ trash restore thesis-draft.txt
restored: ~/Desktop/thesis-draft.txt
~ 0 items left`

const ACCENT = "#e7a13c"

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
            live · terminal
          </div>
          <Played
            session={SESSION}
            accent={ACCENT}
            alt="A terminal session: trash, list, restore."
          />
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
      <Played
        session={SESSION}
        alt="The same session on the default phosphor."
      />
    </div>
  )
}
