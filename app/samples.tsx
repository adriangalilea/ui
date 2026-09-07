"use client"

// EVERY EXAMPLE CARRIES ITS OWN CODE, the way shadcn's pages do, without anybody writing
// a snippet by hand. A demo wraps each example in `<Sample name="…">`; the item page
// reads the demo's source, cuts out the JSX inside each Sample block (dedented), renders
// it through <Code> on the server and hands the rendered blocks to the demo through this
// context. The snippet IS the code that drew the example above it, so the two cannot
// drift, and a Sample whose block the page did not find throws: a name typo screams
// instead of showing an example with no code. The whole file stays at the foot of the
// page, verbatim, for the shape of the thing.

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

/** One example: the rendered thing, and a `code` toggle that opens its own source
 *  under it. `label` is the mono kicker above the example. */
export function Sample({
  name,
  label,
  children,
}: {
  name: string
  label?: React.ReactNode
  children: React.ReactNode
}) {
  const samples = React.useContext(SamplesContext)
  const [open, setOpen] = React.useState(false)
  if (!samples) throw new Error("<Sample> outside <SamplesProvider>")
  const code = samples[name]
  if (code === undefined)
    throw new Error(
      `<Sample name="${name}">: no such block in the demo's source`,
    )
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        {label ? (
          <div className="font-mono text-xs text-muted-foreground">{label}</div>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "hide code" : "code"}
        </button>
      </div>
      {children}
      {open && <div>{code}</div>}
    </section>
  )
}
