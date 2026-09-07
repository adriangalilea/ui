// Server side of `samples.tsx`: the JSX inside every `<Sample name="…">…</Sample>` in a
// demo's source, by name, with the common indentation removed. A separate module
// because the item page calls it on the server, and a function exported from a
// "use client" file arrives there as a client reference, not a function. Not nested:
// a Sample inside a Sample is two examples, write them as two.
export function extractSamples(source: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /<Sample\s+name="([^"]+)"[^>]*>\n([\s\S]*?)\n\s*<\/Sample>/g
  for (const m of source.matchAll(re)) {
    const [, name, body] = m as unknown as [string, string, string]
    const lines = body.split("\n")
    const indent = Math.min(
      ...lines
        .filter((l) => l.trim())
        .map((l) => l.match(/^\s*/)?.[0].length ?? 0),
    )
    out[name] = lines.map((l) => l.slice(indent)).join("\n")
  }
  return out
}
