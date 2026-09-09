"use client"

import {
  Act,
  ScrollStage,
  useScrollStage,
} from "@/registry/base-nova/ui/scroll-stage"
import { useScrollStageTimeline } from "@/registry/base-nova/ui/scroll-stage-timeline"

const BEATS = [
  { id: "write", span: 1 },
  { id: "read", span: 1 },
  { id: "continue", span: 0.5 },
]

/** The same framework can drive non-CSS renderers, with reversible reading beats. */
export function TimelineDemo() {
  return (
    <ScrollStage
      acts={3}
      pace="90svh"
      stacked={<p>Write → read → continue.</p>}
    >
      <TimelineScene />
    </ScrollStage>
  )
}

function TimelineScene() {
  const timeline = useScrollStageTimeline(BEATS, { top: 80, bottom: 80 })
  const progress = timeline.progress[timeline.active]
  if (progress === undefined)
    throw new Error(`no progress for beat ${timeline.active}`)
  return (
    <div className="w-full space-y-8 p-8">
      <h3 className="text-xl font-semibold">write. read. continue.</h3>
      <p className="font-mono text-4xl">{Math.round(progress * 100)}%</p>
      <nav aria-label="Timeline beats" className="flex gap-3">
        {BEATS.map((beat, i) => (
          <button
            key={beat.id}
            type="button"
            onClick={() => timeline.seek(i)}
            aria-current={timeline.active === i ? "step" : undefined}
            className="size-11 rounded-full border aria-[current]:bg-muted"
          >
            {i + 1}
          </button>
        ))}
      </nav>
    </div>
  )
}

const ACTS = [
  {
    title: "one track",
    body: "The section is tall. Its stage is sticky. Scroll drives --stage-p from 0 to 1 across the dwell, in CSS, no React per frame.",
  },
  {
    title: "acts",
    body: "Each <Act> gets --act-p (its own window) and --act-on (1 while on stage). Opacity, transform, clip: all CSS.",
  },
  {
    title: "state, rarely",
    body: "useAct() changes once per checkpoint. Mount a phone when its act begins; never sample scroll.",
  },
]

function Words() {
  const { active, seek } = useScrollStage()
  return (
    <div className="space-y-8">
      {ACTS.map((a, i) => (
        <div
          key={a.title}
          className="space-y-2 transition-opacity duration-500"
          style={{ opacity: i === active ? 1 : 0.35 }}
        >
          <div className="font-mono text-xs text-muted-foreground">
            0{i + 1}
          </div>
          <h3 className="text-lg font-semibold tracking-tight">{a.title}</h3>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
            {a.body}
          </p>
        </div>
      ))}
      <nav aria-label="story acts" className="flex gap-2">
        {ACTS.map((act, index) => (
          <button
            key={act.title}
            type="button"
            onClick={() => seek(index)}
            aria-label={`Go to ${act.title}`}
            aria-current={active === index ? "step" : undefined}
            className="size-11 rounded-full bg-foreground/5 text-sm aria-[current]:bg-foreground/15 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {index + 1}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function Demo() {
  return (
    <div className="space-y-16">
      <CssDemo />
      <TimelineDemo />
    </div>
  )
}

function CssDemo() {
  return (
    <ScrollStage
      acts={ACTS.length}
      pace="90svh"
      stacked={
        <div className="space-y-12">
          {ACTS.map((a, i) => (
            <div key={a.title} className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight">
                {a.title}
              </h3>
              <Stage index={i} />
              <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      }
    >
      <div className="grid w-full items-center gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/3]">
          {ACTS.map((a, i) => (
            <Act
              key={a.title}
              index={i}
              className="absolute inset-0 transition-none"
              style={{
                opacity: "var(--act-on)",
                transform: "translateY(calc((1 - var(--act-p)) * 24px))",
              }}
            >
              <Stage index={i} />
            </Act>
          ))}
        </div>
        <Words />
      </div>
    </ScrollStage>
  )
}

function Stage({ index }: { index: number }) {
  return (
    <div className="flex h-full min-h-48 w-full items-center justify-center rounded-2xl border border-border bg-sidebar font-mono text-6xl text-foreground/30">
      {index + 1}
    </div>
  )
}
