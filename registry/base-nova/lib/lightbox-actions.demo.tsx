import {
  ACTIONS,
  available,
  escRung,
  keycap,
  type Layer,
  resolve,
} from "@/registry/base-nova/lib/lightbox-actions"

const SETS: { title: string; layers: Layer[] }[] = [
  { title: "an image at fit", layers: ["always", "fit"] },
  { title: "zoomed in", layers: ["always", "zoomed"] },
  { title: "a video at fit", layers: ["always", "fit", "video"] },
  { title: "the sheet up, zoomed", layers: ["always", "zoomed", "sheet"] },
]

function Sheet({ layers }: { layers: ReadonlySet<Layer> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs lowercase">
      {ACTIONS.map((a) => {
        const on =
          available(a, layers) &&
          resolve(a.keys[0] as string, layers)?.id === a.id
        return (
          <div
            key={a.id}
            className="contents"
            style={{ opacity: on ? 1 : 0.4 }}
          >
            <dt className="flex gap-1">
              {a.keys.map((k) => (
                <kbd key={k} className="rounded bg-foreground/5 px-1">
                  {keycap(k)}
                </kbd>
              ))}
            </dt>
            <dd className="text-foreground/55">{a.label}</dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function Demo() {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {SETS.map((s) => {
        const layers = new Set(s.layers)
        return (
          <div
            key={s.title}
            className="space-y-4 rounded-xl border border-border bg-sidebar p-4"
          >
            <div className="font-mono text-xs text-muted-foreground">
              {s.title} · esc → {escRung(layers) ?? "browser"}
            </div>
            <Sheet layers={layers} />
          </div>
        )
      })}
    </div>
  )
}
