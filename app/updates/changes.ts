import { readFile } from "node:fs/promises"
import { join } from "node:path"

export interface Change {
  date: string
  subject: string
  notes: string[]
}

// CHANGELOG.md is also the website's source. Its release format is deliberately
// small: dated H2 headings, subject H3 headings, and wrapped bullet paragraphs.
export async function readChanges(): Promise<Change[]> {
  return parseChanges(
    await readFile(join(process.cwd(), "CHANGELOG.md"), "utf8"),
  )
}

export function parseChanges(markdown: string): Change[] {
  const changes: Change[] = []
  let date = ""
  let change: Change | undefined
  for (const line of markdown.split("\n")) {
    if (/^## \d{4}-\d{2}-\d{2}$/.test(line)) {
      date = line.slice(3)
      change = undefined
    } else if (date && line.startsWith("### ")) {
      change = { date, subject: line.slice(4), notes: [] }
      changes.push(change)
    } else if (change && line.startsWith("- ")) {
      change.notes.push(line.slice(2))
    } else if (change && /^\s+\S/.test(line) && change.notes.length) {
      change.notes[change.notes.length - 1] += ` ${line.trim()}`
    } else if (date && line.trim()) {
      throw new Error(`Unsupported changelog line: ${line}`)
    }
  }
  if (!changes.length || changes.some((change) => !change.notes.length))
    throw new Error("Changelog needs dated subjects with release notes")
  return changes
}

export const changeId = ({ date, subject }: Change) =>
  `${date}-${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
