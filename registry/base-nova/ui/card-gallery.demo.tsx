"use client"

import { Sample } from "@/app/samples"
import { CardGallery } from "@/registry/base-nova/ui/card-gallery"
import { ScrollStage } from "@/registry/base-nova/ui/scroll-stage"
import { useScrollStageTimeline } from "@/registry/base-nova/ui/scroll-stage-timeline"

// #region cards
const marks = [
  { label: "Observe", mark: "01" },
  { label: "Shape", mark: "02" },
  { label: "Release", mark: "03" },
]
const cards = marks.map((mark) => (
  <div
    key={mark.label}
    className="flex min-h-[clamp(24rem,54svh,36rem)] flex-col items-start justify-center gap-6 p-8 sm:p-16"
  >
    <span className="font-mono text-sm text-muted-foreground">
      {mark.mark} / 03
    </span>
    <h3 className="text-4xl font-semibold">{mark.label}</h3>
    <p className="max-w-sm text-base text-muted-foreground">
      {
        [
          "Find the detail that changes the whole picture.",
          "Turn that observation into something you can try.",
          "Put it in someone’s hands and learn from what happens.",
        ][Number(mark.mark) - 1]
      }
    </p>
  </div>
))
// #endregion

// #region driven
const beats = [{ span: 1 }, { span: 1 }, { span: 0.5 }]
function Driven() {
  const timeline = useScrollStageTimeline(beats, { top: 32, bottom: 96 })
  return (
    <CardGallery
      marks={marks}
      bleed
      at={timeline.active}
      offset={timeline.offset}
      onSeek={timeline.seek}
    >
      {cards}
    </CardGallery>
  )
}
// #endregion

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="gallery"
        label="keyboard, swipe or picker"
        with="cards"
        presentation
      >
        <CardGallery marks={marks} bleed>
          {cards}
        </CardGallery>
        <p className="mt-4 text-sm text-muted-foreground">
          Focus the gallery and use ← →, swipe sideways, or choose a card below.
        </p>
      </Sample>
      <Sample
        name="story"
        presentation
        label="the same cards, driven by page scroll"
        with="cards driven"
      >
        <ScrollStage
          pin="all"
          acts={3}
          pace="70svh"
          tail="0svh"
          stacked={
            <CardGallery marks={marks} bleed>
              {cards}
            </CardGallery>
          }
        >
          <Driven />
        </ScrollStage>
      </Sample>
    </div>
  )
}
