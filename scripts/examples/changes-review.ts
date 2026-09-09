import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  affectedItems,
  editedSubjects,
  type Registry,
  review,
} from "../changes"

const file = (path: string) => [{ path, type: "registry:lib" as const }]
const registry: Registry = {
  items: [
    { name: "part", files: file("part.ts") },
    {
      name: "parent",
      files: file("parent.ts"),
      registryDependencies: ["@ag/part"],
    },
    {
      name: "consumer",
      files: file("consumer.ts"),
      registryDependencies: ["@ag/parent"],
    },
  ],
}
assert.deepEqual(affectedItems(registry, registry, ["part.ts"]), {
  direct: ["part"],
  indirect: ["consumer", "parent"],
})
assert.deepEqual(
  affectedItems(registry, registry, ["part.demo.tsx", "public/r/part.json"]),
  {
    direct: [],
    indirect: [],
  },
)
const removed = { items: registry.items.slice(1) }
assert.deepEqual(affectedItems(registry, removed, []), {
  direct: ["part"],
  indirect: ["consumer", "parent"],
})
const moved = structuredClone(registry)
const movedFile = moved.items[0]?.files[0]
assert.ok(movedFile)
movedFile.path = "moved.ts"
assert.deepEqual(affectedItems(registry, moved, []).direct, ["part"])
const note =
  "# Changelog\n\n## 2026-09-08\n\n### part\n\n- Original behavior.\n"
assert.deepEqual(editedSubjects(note, note), [])
assert.deepEqual(editedSubjects(note, note.replace("Original", "New")), [
  "part",
])

// Exercise the actual Git window, including staged and unstaged changes. Old notes
// and unrelated newly edited notes must not be reported as coverage for this change.
const root = mkdtempSync(join(tmpdir(), "ui-changes-"))
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" })
const write = (path: string, value: string) =>
  writeFileSync(join(root, path), value)
try {
  git("init", "-q")
  write("registry.json", JSON.stringify(registry))
  write("CHANGELOG.md", note)
  write("part.ts", "original")
  git("add", ".")
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "Baseline",
  )
  const baseline = git("rev-parse", "HEAD").trim()
  assert.match(review(root), /No registry source/)
  write("part.ts", "changed")
  assert.match(review(root), /part: no edited note/)
  git("add", "part.ts")
  assert.match(review(root), /part: no edited note/)
  write("CHANGELOG.md", `${note}\n### Registry website\n\n- A site change.\n`)
  assert.match(review(root), /part: no edited note/)
  write("CHANGELOG.md", note.replace("Original", "New"))
  assert.match(review(root), /part: note edited; review accuracy/)
  write("CHANGELOG.md", note.replace("### part", "### prat"))
  assert.throws(() => review(root), /Unknown changelog subject: prat/)
  write("CHANGELOG.md", note)
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-qm",
    "Change without notes",
  )
  assert.match(review(root), /part: no edited note/)
  assert.match(review(root, baseline), /part: no edited note/)
  assert.match(review(root, "HEAD"), /No registry source/)
  assert.throws(() => review(root, "missing-commit"))
} finally {
  rmSync(root, { recursive: true, force: true })
}
console.log(
  "✓ Release-note review: Git windows, dependency impact, and note matching",
)
