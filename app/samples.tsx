"use client"

// EVERY EXAMPLE CARRIES ITS OWN CODE, the way shadcn's pages do, without anybody writing
// a snippet by hand. A demo wraps each example in `<Sample name="…">`; the item page
// reads the demo's source, cuts out the JSX inside each Sample block (plus the
// `// #region` blocks the sample asks for with `with="…"`, the data it reads), renders
// it through <Code> on the server and hands the rendered blocks to the demo through
// this context. The snippet IS the code that drew the example above it, so the two
// cannot drift, and a Sample whose block the page did not find throws: a name typo
// screams instead of showing an example with no code. The whole file stays at the foot
// of the page, verbatim, for the shape of the thing.
//
// THE CONTROL is a segmented preview | code switch on the example's frame, the
// convention every component site trained its readers on: a bare word at the edge of
// the page did not read as a button, and it was not one worth pressing.

import * as React from "react"

const SamplesContext = React.createContext<Record<
  string,
  React.ReactNode
> | null>(null)

export function SamplesProvider({
  samples,
  children,
}: {
  samples: Record<string, React.ReactNode>
  children: React.ReactNode
}) {
  return (
    <SamplesContext.Provider value={samples}>
      {children}
    </SamplesContext.Provider>
  )
}

const TABS = ["preview", "code"] as const
type Tab = (typeof TABS)[number]

/** One example: a frame with the kicker and the preview | code switch in its head, the
 *  rendered thing or its source in its body. `with` names `// #region` blocks of the
 *  demo source to show above the JSX (read by the page, not here). */
export function Sample({
  name,
  label,
  children,
}: {
  name: string
  label?: React.ReactNode
  /** Space-separated `// #region` names to include in the code. */
  with?: string
  children: React.ReactNode
}) {
  const samples = React.useContext(SamplesContext)
  const [tab, setTab] = React.useState<Tab>("preview")
  if (!samples) throw new Error("<Sample> outside <SamplesProvider>")
  const code = samples[name]
  if (code === undefined)
    throw new Error(
      `<Sample name="${name}">: no such block in the demo's source`,
    )
  const id = React.useId()
  return (
    <section
      data-slot="sample"
      className="overflow-hidden rounded-xl border border-border"
    >
      <div className="flex items-center justify-between gap-4 border-border border-b bg-sidebar px-4 py-2">
        <div className="min-w-0 truncate font-mono text-muted-foreground text-xs">
          {label}
        </div>
        <div
          role="tablist"
          aria-label="example view"
          className="flex shrink-0 rounded-md border border-border bg-background p-0.5 font-mono text-xs"
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${id}-${t}`}
              aria-selected={tab === t}
              aria-controls={`${id}-panel`}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? "rounded-[5px] bg-foreground/10 px-2.5 py-1 text-foreground"
                  : "rounded-[5px] px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}`}
        className={
          tab === "preview" ? "p-6" : "[&>*]:rounded-none [&>*]:border-0"
        }
      >
        {tab === "preview" ? children : code}
      </div>
    </section>
  )
}
