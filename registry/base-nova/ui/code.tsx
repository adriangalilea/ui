// A code block, highlighted on the SERVER. Shiki is the highlighter VS Code uses, so
// the grammars and themes are the ones the reader already knows, and running it at
// build time means the page ships the markup and none of the highlighter: only the
// copy control is client code.
//
// Two themes are baked into one render (`--shiki-light` / `--shiki-dark` on every
// token) and code.css picks with the theme, so switching does not re-highlight and
// cannot flash.

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
  className?: string
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
  className,
}: CodeProps) {
  const source = dedent(children)
  const html = await codeToHtml(source, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  })
  return (
    <div className={`ag-code${className ? ` ${className}` : ""}`}>
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
