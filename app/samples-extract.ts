// Server side of `samples.tsx`: the code of every `<Sample name="…">` in a demo's source.
//
// A sample's code is the JSX inside its block, dedented, PLUS any regions it asks for:
// `<Sample name="people" with="people">` prepends the source between
// `// #region people` and `// #endregion` (VS Code's own folding markers, so an editor
// folds them too). That is how a sample shows the DATA the JSX reads, which is most of
// the DX: a people section whose code showed two <TelegramChat> tags and no people was
// not a code sample. A separate module because the item page calls this on the server,
// and a function exported from a "use client" file arrives there as a client reference.
// Not nested: a Sample inside a Sample is two examples, write them as two.

function dedent(body: string): string {
  const lines = body.split("\n")
  const indent = Math.min(
    ...lines
      .filter((l) => l.trim())
      .map((l) => l.match(/^\s*/)?.[0].length ?? 0),
  )
  return lines.map((l) => l.slice(indent)).join("\n")
}

export function extractSamples(source: string): Record<string, string> {
  const regions: Record<string, string> = {}
  const regionRe =
    /^[ \t]*\/\/ #region (\S+)\n([\s\S]*?)\n[ \t]*\/\/ #endregion/gm
  for (const m of source.matchAll(regionRe)) {
    const [, name, body] = m as unknown as [string, string, string]
    regions[name] = dedent(body)
  }
  const out: Record<string, string> = {}
  const re = /<Sample\s+([^>]*?)>\n([\s\S]*?)\n\s*<\/Sample>/g
  for (const m of source.matchAll(re)) {
    const [, attrs, body] = m as unknown as [string, string, string]
    const name = /\bname="([^"]+)"/.exec(attrs)?.[1]
    if (!name)
      throw new Error(`a <Sample> without a name: ${attrs.slice(0, 60)}`)
    const withNames = /\bwith="([^"]+)"/.exec(attrs)?.[1]?.split(/\s+/) ?? []
    const parts = withNames.map((r) => {
      const region = regions[r]
      if (region === undefined)
        throw new Error(
          `<Sample name="${name}" with="${r}">: no // #region ${r}`,
        )
      return region
    })
    parts.push(dedent(body))
    out[name] = parts.join("\n\n")
  }
  return out
}
