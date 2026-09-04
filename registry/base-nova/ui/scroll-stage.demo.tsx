"use client"

import { Act, ScrollStage, useAct } from "@/registry/base-nova/ui/scroll-stage"

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
  const active = useAct()
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
    </div>
  )
}

export default function Demo() {
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
