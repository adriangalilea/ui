import { Scrims } from "@/registry/base-nova/ui/scrims"

export default function Demo() {
  return (
    <div className="space-y-16">
      <Scrims />
      {Array.from({ length: 8 }, (_, i) => (
        <section key={String(i)} className="space-y-3">
          <div className="font-mono text-xs text-muted-foreground">
            section {i + 1}
          </div>
          <div className="h-56 rounded-2xl border border-border bg-sidebar" />
          <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/80">
            The top fog appears over the first 160px of scroll; the bottom one
            leaves over the last 140px. Neither ever transitions: both are where
            the scroll is.
          </p>
        </section>
      ))}
    </div>
  )
}
