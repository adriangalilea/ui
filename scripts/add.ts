// Resolve the complete local graph before one shadcn invocation. A workspace-wide
// lock covers shared packages even when callers name different apps or symlinks.
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { once } from "node:events"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { registryItemSchema } from "shadcn/schema"

const [item, directory, flag] = process.argv.slice(2)
if (!item || !directory)
  throw new Error("usage: bun scripts/add.ts <item> <consumer dir> [--dry-run]")
const dir = realpathSync(directory)
const config = JSON.parse(readFileSync(join(dir, "components.json"), "utf8"))
// shadcn initialization owns cn. Neither the local sync nor public items replace it.
let utils: string | undefined
try {
  utils = createRequire(join(dir, "package.json")).resolve(config.aliases.utils)
} catch {
  if (config.aliases.utils.startsWith("@/")) {
    const path = `${config.aliases.utils.slice(2)}.ts`
    utils = [join(dir, path), join(dir, "src", path)].find(existsSync)
  }
}
if (!utils)
  throw new Error(
    "Initialize the consumer's shadcn utils alias before installing @ag items",
  )
let owner = dirname(realpathSync(utils))
while (!existsSync(join(owner, "package.json"))) {
  const parent = dirname(owner)
  if (parent === owner) throw new Error("Cannot find the utils package owner")
  owner = parent
}
for (let parent = dir; ; parent = dirname(parent)) {
  if (existsSync(join(parent, "pnpm-workspace.yaml"))) {
    owner = parent
    break
  }
  if (dirname(parent) === parent) break
}
const built = join(import.meta.dirname, "..", "public", "r")
const names: string[] = []
const queue = item.split(",")
const files = new Map<
  string,
  NonNullable<ReturnType<typeof registryItemSchema.parse>["files"]>[number]
>()
const dependencies = new Set<string>()
const devDependencies = new Set<string>()
const external = new Set<string>()
const css: Record<string, unknown> = {}
const cssVars: Record<string, Record<string, string>> = {}
while (queue.length) {
  const name = queue.shift() as string
  if (!/^[a-z0-9-]+$/.test(name))
    throw new Error(`Invalid registry name: ${name}`)
  if (names.includes(name)) continue
  const meta = registryItemSchema.parse(
    JSON.parse(readFileSync(join(built, `${name}.json`), "utf8")),
  )
  names.push(name)
  for (const dep of meta.registryDependencies ?? []) {
    if (dep.startsWith("@ag/")) queue.push(dep.slice(4))
    else if (dep === "utils")
      throw new Error(`${name} must not overwrite consumer utils`)
    else external.add(dep)
  }
  for (const dep of meta.dependencies ?? []) dependencies.add(dep)
  for (const dep of meta.devDependencies ?? []) devDependencies.add(dep)
  for (const file of meta.files ?? []) {
    if (file.content === undefined)
      throw new Error(`Build the registry first: ${file.path}`)
    if (file.type === "registry:file" && file.target) {
      const destination = relative(dir, resolve(dir, file.target))
      if (destination.startsWith("..") || destination.startsWith("/"))
        throw new Error(`Target outside consumer: ${file.target}`)
    }
    const previous = files.get(file.path)
    if (previous && JSON.stringify(previous) !== JSON.stringify(file))
      throw new Error(`Conflicting file: ${file.path}`)
    files.set(file.path, file)
  }
  Object.assign(css, meta.css)
  for (const [mode, vars] of Object.entries(meta.cssVars ?? {}))
    cssVars[mode] = { ...cssVars[mode], ...vars }
}
const plan = registryItemSchema.parse({
  name: item.split(",")[0],
  type: "registry:item",
  files: [...files.values()],
  dependencies: [...dependencies],
  devDependencies: [...devDependencies],
  registryDependencies: [...external],
  css,
  cssVars,
})
console.log(
  `${names.join(", ")} → ${dir} (${files.size} files; lock owner ${owner})`,
)
if (flag === "--dry-run") process.exit(0)
const lock = join(
  tmpdir(),
  `ui-registry-lock-${createHash("sha256").update(owner).digest("hex").slice(0, 16)}`,
)
const pidFile = join(lock, "pid")
try {
  mkdirSync(lock)
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  const pid = existsSync(pidFile) ? Number(readFileSync(pidFile, "utf8")) : NaN
  if (!Number.isInteger(pid) || pid <= 0)
    throw new Error(`Unowned registry lock: ${lock}`)
  try {
    process.kill(pid, 0)
    throw new Error(`Registry sync ${pid} is running for ${owner}`)
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ESRCH") throw cause
    const childFile = join(lock, "child")
    if (existsSync(childFile)) {
      const child = Number(readFileSync(childFile, "utf8"))
      if (!Number.isInteger(child) || child <= 0)
        throw new Error(`Unowned installer process: ${lock}`)
      try {
        process.kill(child, 0)
        throw new Error(
          `Orphaned installer ${child} is still running for ${owner}`,
        )
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
      }
    }
    rmSync(lock, { recursive: true })
    mkdirSync(lock)
  }
}
writeFileSync(pidFile, String(process.pid))
const temporary = mkdtempSync(join(tmpdir(), "ui-registry-"))
const cleanup = () => {
  rmSync(temporary, { recursive: true, force: true })
  if (
    existsSync(pidFile) &&
    readFileSync(pidFile, "utf8") === String(process.pid)
  )
    rmSync(lock, { recursive: true, force: true })
}
process.on("exit", cleanup)
try {
  const path = join(temporary, `${item}.json`)
  writeFileSync(path, JSON.stringify(plan))
  const child = spawn(
    "pnpm",
    ["exec", "shadcn", "add", path, "--cwd", dir, "--overwrite", "--yes"],
    { stdio: "inherit" },
  )
  if (child.pid) writeFileSync(join(lock, "child"), String(child.pid))
  const stop = () => {
    child.kill("SIGTERM")
  }
  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
  let status: number | null
  try {
    ;[status] = await once(child, "exit")
  } finally {
    process.off("SIGINT", stop)
    process.off("SIGTERM", stop)
  }
  if (status !== 0)
    throw new Error(
      "Registry install failed; inspect the consumer diff before retrying. No unrelated edits were rolled back.",
    )
  // shadcn skips existing registry:file targets even with overwrite. Refresh only
  // the explicitly declared files, after the whole CLI operation succeeds.
  for (const file of plan.files ?? [])
    if (
      file.type === "registry:file" &&
      file.target &&
      file.content !== undefined
    ) {
      const target = resolve(dir, file.target)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, file.content)
    }
  console.log(`✓ ${names.join(", ")}`)
} finally {
  cleanup()
  process.off("exit", cleanup)
}
