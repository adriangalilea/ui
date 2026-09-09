// A review prompt, never a release-note generator or proof of coverage.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import type { Item } from "../app/registry"
import { parseChanges } from "../app/updates/changes"

/** What a review reads off `registry.json`, at two revisions. The fields come from the
 *  one item declaration, so this cannot drift from what shadcn builds. */
export interface Registry {
  items: Pick<Item, "name" | "files" | "registryDependencies">[]
}

export function affectedItems(
  before: Registry,
  after: Registry,
  paths: string[],
) {
  const changed = new Set(paths)
  const old = new Map(before.items.map((item) => [item.name, item]))
  const current = new Map(after.items.map((item) => [item.name, item]))
  const all = new Map([...old, ...current])
  const direct = new Set<string>()
  for (const [name, item] of all) {
    const previous = old.get(name)
    if (
      JSON.stringify(previous) !== JSON.stringify(current.get(name)) ||
      [...item.files, ...(previous?.files ?? [])].some((f) =>
        changed.has(f.path),
      )
    )
      direct.add(name)
  }
  const affected = new Set(direct)
  // Include consumers of changed dependencies, including dependencies just removed.
  for (let size = -1; size !== affected.size; ) {
    size = affected.size
    for (const item of [...before.items, ...after.items])
      if (
        item.registryDependencies?.some(
          (dep) => dep.startsWith("@ag/") && affected.has(dep.slice(4)),
        )
      )
        affected.add(item.name)
  }
  return {
    direct: [...direct].sort(),
    indirect: [...affected].filter((n) => !direct.has(n)).sort(),
  }
}

export function editedSubjects(before: string, after: string) {
  const old = parseChanges(before)
  return parseChanges(after)
    .filter(
      (note) =>
        !old.some((entry) => JSON.stringify(entry) === JSON.stringify(note)),
    )
    .map((note) => note.subject)
}

export function review(root: string, since?: string) {
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    }).trim()
  const requested =
    since ?? git("log", "-1", "--format=%H", "--", "CHANGELOG.md")
  if (!requested)
    throw new Error("No changelog baseline. Pass --since <commit>.")
  const base = git(
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${requested}^{commit}`,
  )
  const read = (path: string) => readFileSync(join(root, path), "utf8")
  const before: Registry = JSON.parse(git("show", `${base}:registry.json`))
  const after: Registry = JSON.parse(read("registry.json"))
  const paths = git(
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    base,
    "--",
  ).split("\0")
  const { direct, indirect } = affectedItems(before, after, paths)
  const notes = read("CHANGELOG.md")
  const edited = new Set(
    editedSubjects(git("show", `${base}:CHANGELOG.md`), notes),
  )
  const names = new Set(
    [...before.items, ...after.items].map((item) => item.name),
  )
  const general = new Set(["Registry website", "Installation and updates"])
  // Unchanged historical subjects may name retired components. Validate new/edited notes.
  for (const subject of edited)
    if (!names.has(subject) && !general.has(subject))
      throw new Error(
        `Unknown changelog subject: ${subject}. Use the exact registry item name.`,
      )
  const lines = [
    `Release-note review since ${base.slice(0, 8)}${since ? "" : " (last changelog edit)"}; includes working tree.`,
  ]
  if (!direct.length)
    lines.push("No registry source or item-definition changes in this window.")
  for (const name of direct)
    lines.push(
      `- ${name}: ${edited.has(name) ? "note edited; review accuracy" : "no edited note; review whether one is needed"}`,
    )
  if (indirect.length)
    lines.push(
      `Also check dependent consumers: ${indirect.join(", ")}. Notes need not be duplicated.`,
    )
  if (direct.length)
    lines.push(
      "Write one note per meaningful behavior change, including migration steps when needed. Keep internal-only changes out; explain that decision in the commit. This is an advisory prompt, not a coverage guarantee.",
    )
  lines.push(
    "Use --since <commit> for an earlier window. Nothing is generated or marked as reviewed.",
  )
  return lines.join("\n")
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === join(import.meta.dirname, "changes.ts")
) {
  try {
    const { values } = parseArgs({
      options: { since: { type: "string" }, help: { type: "boolean" } },
    })
    console.log(
      values.help
        ? "bun scripts/changes.ts [--since <commit>]\nReview registry changes against handwritten CHANGELOG.md notes."
        : review(join(import.meta.dirname, ".."), values.since),
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
