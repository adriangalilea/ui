import { Reveal } from "@/registry/base-nova/ui/reveal"

export default function Demo() {
  return (
    <div className="space-y-32">
      {["a section", "another", "a third"].map((title, i) => (
        <Reveal key={title} as="section" className="space-y-4">
          <div className="font-mono text-xs text-muted-foreground">
            0{i + 1}
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
          <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/80">
            Wrap a region and it arrives as it enters the viewport. Once in, it
            stays: scrolling back never hides it. Under prefers-reduced-motion
            nothing moves.
          </p>
          <Reveal as="ul" stagger={80} className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((k) => (
              <li
                key={k}
                className="aspect-video rounded-xl border border-border bg-sidebar"
              />
            ))}
          </Reveal>
        </Reveal>
      ))}
      <Reveal
        mode="scroll"
        className="rounded-2xl border border-border bg-sidebar p-8"
      >
        <p className="font-mono text-xs text-muted-foreground">mode="scroll"</p>
        <p className="mt-2 text-[0.9375rem]">
          Tied to the scroll position, reversible, pure CSS.
        </p>
      </Reveal>
    </div>
  )
}
