// The registry's own gate. Every assumption the site and the consumers make about
// registry.json is asserted here; a broken item fails `mise check`, never a consumer.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")
const registry = JSON.parse(
  readFileSync(join(root, "registry.json"), "utf8"),
) as {
  name: string
  items: {
    name: string
    type: string
    files: { path: string; type: string; target?: string }[]
    registryDependencies?: string[]
  }[]
}
const names = new Set(registry.items.map((i) => i.name))
const demos = readFileSync(join(root, "app/demos.tsx"), "utf8")
const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

for (const item of registry.items) {
  if (item.name !== item.name.toLowerCase())
    fail(`${item.name}: names are lowercase`)
  if (item.files.length === 0) fail(`${item.name}: no files`)
  for (const f of item.files) {
    const abs = join(root, f.path)
    if (!existsSync(abs)) fail(`${item.name}: missing file ${f.path}`)
    if (f.type === "registry:file" && !f.target)
      fail(`${item.name}: registry:file needs a target (${f.path})`)
    if (f.path.includes("/lib/") && f.path.endsWith(".ts")) {
      // The rule is about what the CODE reaches for, so comments are stripped
      // first: a lib is free to explain the DOM it deliberately never touches.
      const src = readFileSync(abs, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
      if (
        /from ["']react["']/.test(src) ||
        /\bdocument\b/.test(src) ||
        /\bwindow\b/.test(src)
      )
        fail(
          `${item.name}: lib files are framework-free, ${f.path} touches react or the DOM`,
        )
    }
  }
  const main = item.files[0] as { path: string }
  const demo = main.path.replace(/\.(tsx?|css)$/, ".demo.tsx")
  if (!existsSync(join(root, demo)))
    fail(`${item.name}: no demo beside the source (${demo})`)
  if (!new RegExp(`(^|[\\s{,])["']?${item.name}["']?\\s*:`, "m").test(demos))
    fail(`${item.name}: not listed in app/demos.tsx`)
  for (const dep of item.registryDependencies ?? []) {
    if (dep.startsWith("@ag/") && !names.has(dep.slice(4)))
      fail(`${item.name}: unknown dependency ${dep}`)
  }
}

const built = join(root, "public/r")
if (existsSync(built)) {
  const jsons = readdirSync(built).filter(
    (f) => f.endsWith(".json") && f !== "registry.json",
  )
  if (jsons.length !== registry.items.length)
    fail(
      `public/r has ${jsons.length} items, registry.json has ${registry.items.length}: run shadcn build`,
    )
}

if (failures.length > 0) {
  for (const f of failures) console.error(`✗ ${f}`)
  process.exit(1)
}
console.log(`✓ ${registry.items.length} registry items`)
