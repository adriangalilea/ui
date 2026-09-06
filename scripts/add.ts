// Copy one item and EVERYTHING it depends on into a consumer, all from THIS checkout.
//
// `shadcn add <local json>` copies the item itself from disk but resolves its `@ag/...`
// dependencies against the REMOTE registry, which lags a push by minutes. Adding
// `avatar` locally therefore overwrote the consumer's fresh `lightbox` with the deployed
// one, and refreshing `avatar` + `lightbox` but not `quote` left a `quote.tsx` that
// still drew a plain <img> where the source had used <Avatar> for a day. Remembering an
// order is not a fix. This adds the item, then re-adds every transitive local
// dependency after it, so the last write for every file is the local one.
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const [item, dir] = process.argv.slice(2)
if (!item || !dir) {
  console.error("usage: bun scripts/add.ts <item> <consumer dir>")
  process.exit(2)
}
const built = join(import.meta.dirname, "..", "public", "r")
const jsonOf = (name: string) => join(built, `${name}.json`)
if (!existsSync(jsonOf(item))) {
  console.error(`no built item "${item}" (run: pnpm shadcn build)`)
  process.exit(1)
}

// The item first, then its dependencies breadth-first: a file two items share ends up
// as the local copy either way, and the order only decides which copy is written last.
const order: string[] = []
const queue = [item]
while (queue.length > 0) {
  const name = queue.shift() as string
  if (order.includes(name)) continue
  order.push(name)
  const meta = JSON.parse(readFileSync(jsonOf(name), "utf8")) as {
    registryDependencies?: string[]
  }
  for (const dep of meta.registryDependencies ?? [])
    if (dep.startsWith("@ag/")) queue.push(dep.slice("@ag/".length))
}

for (const name of order) {
  console.log(`→ ${name}`)
  const proc = spawnSync(
    "pnpm",
    ["shadcn", "add", jsonOf(name), "--cwd", dir, "--overwrite", "--yes"],
    { stdio: "inherit" },
  )
  if (proc.status !== 0) process.exit(proc.status ?? 1)
}
console.log(`✓ ${order.join(", ")} → ${dir}`)
