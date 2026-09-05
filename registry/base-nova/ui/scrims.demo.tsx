"use client"

import * as React from "react"
import { Scrims } from "@/registry/base-nova/ui/scrims"

// A fog is the colour of the page, so it can only be SEEN over something that is not:
// photographs run to the viewport edges here, and the blur under the fog is the tell.
// Over flat panels the whole component is invisible and looks broken, which is what
// the first version of this demo showed.
const SHOTS = [1015, 1016, 1018, 1021, 1024, 1039] as const
const shot = (id: number) => `https://picsum.photos/id/${id}/1200/700`

const NOTES = [
  "Scroll. The top fog arrives over the first 160px and the bottom one leaves over the last 140px, so the page opens and closes clean.",
  "Neither is ever transitioned. A scrim that crossfades over 500ms is still crossfading while a smooth anchor scroll is flying, which is what read as a weird effect.",
  "Linked to the scroll instead, it is simply where the scroll is: drag the scrollbar and the fog tracks your hand exactly.",
  "A page with a sticky blurred header already HAS a top scrim. Turn this one off there, with top={false}.",
  "On a page too short to scroll the timeline never runs, so both rest at zero and nothing fogs a page that cannot move.",
  "It is a masked backdrop-blur over a gradient: no layout, no pointer events, and nothing for the content underneath to know about.",
] as const

export default function Demo() {
  const [top, setTop] = React.useState(true)
  const [bottom, setBottom] = React.useState(true)
  return (
    <div className="space-y-16">
      <Scrims top={top} bottom={bottom} />
      {/* Above the scrims (z-20) so the controls stay readable through the fog. */}
      <div className="sticky top-4 z-30 flex w-fit gap-2 rounded-full border border-border bg-background/80 p-1 font-mono text-xs backdrop-blur">
        {(
          [
            ["top", top, setTop],
            ["bottom", bottom, setBottom],
          ] as const
        ).map(([label, on, set]) => (
          <button
            key={label}
            type="button"
            onClick={() => set(!on)}
            aria-pressed={on}
            className={`rounded-full px-3 py-1 transition-colors ${
              on
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {SHOTS.map((id, i) => (
        <section key={id} className="space-y-4">
          <div className="font-mono text-xs text-muted-foreground">
            0{i + 1}
          </div>
          {/* biome-ignore lint/performance/noImgElement: the registry ships no next/image */}
          <img
            src={shot(id)}
            alt=""
            width={1200}
            height={700}
            className="w-full rounded-2xl border border-border object-cover"
          />
          <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/80">
            {NOTES[i]}
          </p>
        </section>
      ))}
    </div>
  )
}
