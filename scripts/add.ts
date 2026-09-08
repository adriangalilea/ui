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
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const [item, dir] = process.argv.slice(2)
if (!item || !dir) {
  console.error("usage: bun scripts/add.ts <item> <consumer dir>")
  process.exit(2)
}
const built = join(import.meta.dirname, "..", "public", "r")
// A consumer owns its existing cn helper. Registry installation must not replace
// it with a different implementation (or install an unrelated package named cn).
const config = JSON.parse(readFileSync(join(dir, "components.json"), "utf8"))
let utilsPath: string | undefined
try {
  utilsPath = createRequire(join(dir, "package.json")).resolve(
    config.aliases.utils,
  )
} catch {
  if (config.aliases.utils.startsWith("@/")) {
    const relative = `${config.aliases.utils.slice(2)}.ts`
    utilsPath = [join(dir, relative), join(dir, "src", relative)].find(
      existsSync,
    )
  }
}
const originalUtils = utilsPath ? readFileSync(utilsPath, "utf8") : undefined
let utilsOwner = utilsPath ? dirname(utilsPath) : undefined
while (utilsOwner && !existsSync(join(utilsOwner, "package.json"))) {
  const parent = dirname(utilsOwner)
  utilsOwner = parent === utilsOwner ? undefined : parent
}
const hadCn = utilsOwner
  ? Boolean(
      JSON.parse(readFileSync(join(utilsOwner, "package.json"), "utf8"))
        .dependencies?.cn,
    )
  : false
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

const localItems = mkdtempSync(join(tmpdir(), "ui-registry-"))
for (const name of order) {
  // Local dependencies are traversed below; asking shadcn to resolve them would
  // fetch stale remote copies, and fails entirely for unpublished new components.
  const localMeta = JSON.parse(readFileSync(jsonOf(name), "utf8"))
  localMeta.registryDependencies = (
    localMeta.registryDependencies ?? []
  ).filter((dep: string) => !dep.startsWith("@ag/"))
  const localItem = join(localItems, `${name}.json`)
  writeFileSync(localItem, JSON.stringify(localMeta))
  console.log(`→ ${name}`)
  const proc = spawnSync(
    "pnpm",
    ["shadcn", "add", localItem, "--cwd", dir, "--overwrite", "--yes"],
    { stdio: "inherit" },
  )
  if (utilsPath && originalUtils !== undefined)
    writeFileSync(utilsPath, originalUtils)
  if (
    utilsOwner &&
    !hadCn &&
    JSON.parse(readFileSync(join(utilsOwner, "package.json"), "utf8"))
      .dependencies?.cn
  ) {
    const cleanup = spawnSync("pnpm", ["--dir", utilsOwner, "remove", "cn"], {
      stdio: "inherit",
    })
    if (cleanup.status !== 0) process.exit(cleanup.status ?? 1)
  }
  if (proc.status !== 0) process.exit(proc.status ?? 1)
  // `--overwrite` does not rewrite a `registry:file` whose target already exists: the
  // consumer's app/tokens.css sat a version behind while every component around it
  // refreshed, and nothing said so. The built item carries the content; write it.
  const meta = JSON.parse(readFileSync(jsonOf(name), "utf8")) as {
    files?: { type: string; target?: string; content?: string }[]
  }
  for (const f of meta.files ?? []) {
    if (f.type !== "registry:file" || !f.target || f.content === undefined)
      continue
    const dest = join(dir, f.target)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, f.content)
    console.log(`  ${f.target} written`)
  }
}
console.log(`✓ ${order.join(", ")} → ${dir}`)
