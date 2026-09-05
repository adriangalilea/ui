// A code block, highlighted on the SERVER. Shiki is the highlighter VS Code uses, so
// the grammars and themes are the ones the reader already knows, and running it at
// build time means the page ships the markup and none of the highlighter: only the
// copy control is client code.
//
// Two themes are baked into one render (`--shiki-light` / `--shiki-dark` on every
// token) and code.css picks with the theme, so switching does not re-highlight and
// cannot flash.

import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers"
import { type BundledLanguage, codeToHtml } from "shiki"
import { Copy } from "@/registry/base-nova/ui/copy"
import "./code.css"

export interface CodeProps {
  /** The source. Common leading indentation is removed, so a snippet can be written
   *  indented inside the code that renders it and still read flush. */
  children: string
  /** A Shiki language id. `text` when it is not code, which skips the grammar. */
  lang?: BundledLanguage | "text"
  /** A path or a name for the tab. Without one the frame is bare. */
  filename?: string
  /** Hide the copy control, for a snippet nobody would want in their clipboard. */
  copy?: boolean
  /** Lines to mark, `"2"` or `"1,4-6"`, counted from 1. For source you do NOT own:
   *  a file rendered verbatim cannot carry `[!code highlight]` comments without them
   *  becoming part of the file. Where you do own it, prefer the comments, which move
   *  with the lines when the code is edited. */
  highlight?: string
  /** Number the lines. Off by default: most snippets are short enough that numbers
   *  are furniture, and they are only worth their width when something refers to one. */
  lines?: boolean
  className?: string
}

/** `"1,4-6"` to the set {1,4,5,6}. Screams rather than silently marking nothing. */
export function parseLines(spec: string): Set<number> {
  const out = new Set<number>()
  for (const part of spec.split(",")) {
    const range = part.trim()
    if (!range) continue
    const [a, b = a] = range.split("-").map((n) => Number(n.trim()))
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === undefined)
      throw new Error(`code: "${range}" is not a line or a range of lines`)
    for (let n = a; n <= (b as number); n++) out.add(n)
  }
  return out
}

/** Strip the shortest indentation any non-blank line has, and the blank first and
 *  last lines a template literal always brings. */
export function dedent(src: string): string {
  const lines = src.replace(/\t/g, "  ").split("\n")
  while (lines.length && !lines[0]?.trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop()
  const pad = Math.min(
    ...lines
      .filter((l) => l.trim())
      .map((l) => l.length - l.trimStart().length),
  )
  return lines.map((l) => l.slice(pad)).join("\n")
}

export async function Code({
  children,
  lang = "tsx",
  filename,
  copy = true,
  highlight,
  lines,
  className,
}: CodeProps) {
  const source = dedent(children)
  const marked = highlight ? parseLines(highlight) : null
  const html = await codeToHtml(source, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    transformers: [
      // The notations travel INSIDE the source, so they survive an edit that moves a
      // line and they are what a reader copies out of a doc. Shiki strips the comment
      // from the rendered output; the clipboard gets `source`, which still has it.
      transformerNotationDiff({ matchAlgorithm: "v3" }),
      transformerNotationHighlight({ matchAlgorithm: "v3" }),
      transformerNotationWordHighlight({ matchAlgorithm: "v3" }),
      transformerNotationFocus({ matchAlgorithm: "v3" }),
      transformerNotationErrorLevel({ matchAlgorithm: "v3" }),
      // ...and the `highlight` prop for source nobody may write into.
      {
        name: "ag:highlight-prop",
        line(node, line) {
          if (marked?.has(line)) this.addClassToHast(node, "highlighted")
        },
      },
    ],
  })
  return (
    <div
      className={`ag-code${lines ? " ag-code-numbered" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="ag-code-bar">
        <span className="ag-code-name">{filename ?? lang}</span>
        {copy && <Copy value={source} label />}
      </div>
      {/* Shiki's own <pre><code>, styled by code.css. */}
      <div
        className="ag-code-scroll"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki's own output, built on the server from a string prop, never from anything a reader can reach
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
