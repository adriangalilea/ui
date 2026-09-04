export default function Demo() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="font-sans text-3xl font-bold tracking-tight">
          display and body: sans
        </p>
        <p className="font-mono text-xs lowercase text-muted-foreground">
          metadata: mono, text-xs, lowercase
        </p>
        <p className="font-typewriter text-2xl">
          the studio's own voice: typewriter, never bold
        </p>
      </div>
      <div className="flex gap-3">
        {["brand", "tone-ok", "tone-warn", "tone-bad", "tone-info"].map((t) => (
          <div key={t} className="space-y-1">
            <div
              className="size-12 rounded-lg"
              style={{ background: `var(--${t})` }}
            />
            <div className="font-mono text-[10px] text-muted-foreground">
              {t}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1 rounded-2xl border border-border bg-sidebar p-6">
        <p style={{ opacity: "var(--alpha-title)" }}>title · alpha-title</p>
        <p style={{ opacity: "var(--alpha-body)" }}>body · alpha-body</p>
        <p
          className="font-mono text-xs"
          style={{ opacity: "var(--alpha-meta)" }}
        >
          meta · alpha-meta
        </p>
      </div>
    </div>
  )
}
