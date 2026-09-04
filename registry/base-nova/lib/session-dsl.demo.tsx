import {
  parseSession,
  renderSessionSvg,
  sessionTimeline,
} from "@/registry/base-nova/lib/session-dsl"

const SESSION = `# comments drop
$ awake 2h
~ lid closed, on battery, no display
@500 still working`

export default function Demo() {
  const lines = parseSession(SESSION)
  const timeline = sessionTimeline(lines)
  const svg = renderSessionSvg(lines, { accent: "#e7a13c" })
  return (
    <div className="space-y-6">
      <pre className="rounded-xl border border-border bg-sidebar p-4 font-mono text-xs">
        {SESSION}
      </pre>
      <div className="font-mono text-xs text-muted-foreground">
        {lines.length} lines · {timeline.total} ms · {svg.length} bytes of svg
      </div>
      {/* biome-ignore lint/performance/noImgElement: an inline data URL */}
      <img
        alt="The session rendered as a still"
        className="w-full rounded-xl border border-border"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
      />
    </div>
  )
}
