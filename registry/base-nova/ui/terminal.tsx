"use client"

// A phosphor terminal that draws a session script (lib/terminal-session) at a moment:
// commands type char by char, output lands whole, `@ms` pauses. It draws; something
// else moves time: `<Player clip={sessionTimeline(…).clip}>` plays it, a scroll stage
// scrolls it, a fixed `progress` is a still. The still renderer in the same lib draws
// the identical frame as SVG, so a CLI's media and its live demo cannot drift.
// Display-only: role="img", zero focusables.

import * as React from "react"
import {
  LINE_HEIGHT,
  parseSession,
  type SessionLine,
  sessionTimeline,
  TYPE_MS,
  terminalPalette,
} from "@/registry/base-nova/lib/terminal-session"

export interface TerminalProps {
  /** A session script (`$ cmd` · `~ muted` · plain · `# comment` · `@ms` pause). */
  session: string
  /** The moment drawn, 0..1 of the session. */
  progress: number
  /** One accent drives the whole palette (default: phosphor green). */
  accent?: string
  /** Minimum rows the frame reserves, so a short session still gets a window that
   *  feels like one (a hero). The script's own length always wins when longer. */
  rows?: number
  /** Accessible description (the terminal is one picture). */
  alt: string
  className?: string
}

export function Terminal({
  session,
  progress,
  accent,
  rows = 0,
  alt,
  className,
}: TerminalProps) {
  const timeline = React.useMemo(
    () => sessionTimeline(parseSession(session)),
    [session],
  )
  const palette = React.useMemo(() => terminalPalette(accent), [accent])
  const at = Math.min(1, Math.max(0, progress)) * timeline.total
  let full = 0
  while (full < timeline.lines.length && (timeline.ends[full] as number) <= at)
    full++
  const current =
    full < timeline.lines.length ? timeline.lines[full] : undefined
  const start =
    full < timeline.lines.length ? (timeline.starts[full] as number) : 0
  const typedChars =
    current && current.kind === "command" && at > start
      ? Math.max(0, Math.floor((at - start) / TYPE_MS))
      : 0
  const done = full >= timeline.lines.length

  const prompt = (key: string, cursor: boolean) => (
    <div key={key}>
      <span style={{ color: palette.prompt }}>$ </span>
      {cursor && <span style={{ color: palette.dot }}>█</span>}
    </div>
  )

  const renderLine = (line: SessionLine, key: number, chars?: number) => {
    if (line.kind === "blank") return <div key={key}>&nbsp;</div>
    if (line.kind === "command")
      return (
        <div key={key}>
          <span style={{ color: palette.prompt }}>$ </span>
          <span style={{ color: palette.command }}>
            {chars === undefined ? line.text : line.text.slice(0, chars)}
          </span>
        </div>
      )
    return (
      <div
        key={key}
        style={{
          color: line.kind === "muted" ? palette.muted : palette.accent,
        }}
      >
        {line.text}
      </div>
    )
  }

  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{
        background: palette.bg,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: "var(--font-mono, Menlo, Monaco, monospace)",
        fontSize: 13,
        lineHeight: LINE_HEIGHT,
      }}
    >
      <div aria-hidden="true">
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: palette.bar,
            padding: "10px 16px",
          }}
        >
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: palette.dot,
              }}
            />
          ))}
        </div>
        {/* The box is sized by the FINISHED session (an invisible full copy in the
            same cell), so playback never grows the page: text streams into a fixed
            frame. Both layers share width, so wrapping is identical. */}
        <div
          style={{
            display: "grid",
            padding: "20px 24px 24px",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          <div
            style={{
              gridArea: "1 / 1",
              visibility: "hidden",
              minHeight: `${rows * LINE_HEIGHT}em`,
            }}
          >
            {timeline.lines.map((l, i) => renderLine(l, i))}
            {prompt("end", true)}
          </div>
          <div style={{ gridArea: "1 / 1" }}>
            {timeline.lines.slice(0, full).map((l, i) => renderLine(l, i))}
            {current &&
              current.kind === "command" &&
              typedChars > 0 &&
              renderLine(current, full, typedChars)}
            {prompt("live", done)}
          </div>
        </div>
      </div>
    </div>
  )
}
