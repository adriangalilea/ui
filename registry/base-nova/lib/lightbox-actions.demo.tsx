import {
  escRung,
  keycap,
  type Layer,
  sheet,
} from "@/registry/base-nova/lib/lightbox-actions"

const SETS: { title: string; layers: Layer[]; unavailable: string[] }[] = [
  { title: "an image at fit", layers: ["always", "fit"], unavailable: [] },
  {
    title: "zoomed in, no rail",
    layers: ["always", "zoomed"],
    unavailable: ["rail"],
  },
  {
    title: "a video at fit, last of the set",
    layers: ["always", "fit", "video"],
    unavailable: ["next", "step.next"],
  },
  {
    title: "the sheet up over a fullscreen zoom",
    layers: ["always", "zoomed", "fullscreen", "sheet"],
    unavailable: [],
  },
]

/** The same rows the lightbox renders: only what the world behind the sheet
 *  answers to, esc once on its current rung, one row per action. */
function Sheet({
  layers,
  unavailable,
}: {
  layers: ReadonlySet<Layer>
  unavailable: ReadonlySet<string>
}) {
  return (
    <div className="space-y-4 font-mono text-xs lowercase">
      {sheet(layers, unavailable).map((section) => (
        <div key={section.section} className="space-y-2">
          <div className="text-muted-foreground">{section.section}</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {section.rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="flex gap-1">
                  {row.keys.map((k) => (
                    <kbd key={k} className="rounded bg-foreground/5 px-1">
                      {keycap(k)}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-foreground/55">{row.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

export default function Demo() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {SETS.map((s) => {
        const layers = new Set(s.layers)
        const behind = new Set(layers)
        behind.delete("sheet")
        return (
          <div
            key={s.title}
            className="space-y-4 rounded-xl border border-border bg-sidebar p-4"
          >
            <div className="font-mono text-xs text-muted-foreground">
              {s.title} · esc → {escRung(behind) ?? "the browser"}
            </div>
            <Sheet layers={layers} unavailable={new Set(s.unavailable)} />
          </div>
        )
      })}
    </div>
  )
}
