// Serve the checkout through shadcn's public HTTP registry path. Only dependency
// addresses change; shadcn owns file placement, aliases, CSS and package updates.
import { spawn } from "node:child_process"
import { once } from "node:events"
import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { registryItemSchema } from "shadcn/schema"

const [items, directory, mode = "--dry-run", file] = process.argv.slice(2)
if (
  !items ||
  !directory ||
  !["--dry-run", "--diff", "--overwrite"].includes(mode) ||
  (file && mode !== "--diff")
)
  throw new Error(
    "usage: bun scripts/add.ts <item[,item]> <consumer dir> [--dry-run|--diff [file]|--overwrite]",
  )
const names = items.split(",")
if (names.some((name) => !/^[a-z0-9-]+$/.test(name)))
  throw new Error("Expected comma-separated registry item names")
const built = resolve(import.meta.dirname, "../public/r")
// Fail before starting the installer if a requested item has not been built.
for (const name of names)
  registryItemSchema.parse(
    JSON.parse(await readFile(join(built, `${name}.json`), "utf8")),
  )
let origin = ""
const server = createServer(async (request, response) => {
  const name = request.url?.match(/^\/([a-z0-9-]+)\.json$/)?.[1]
  try {
    if (!name) throw new Error("Unknown item")
    const item = registryItemSchema.parse(
      JSON.parse(await readFile(join(built, `${name}.json`), "utf8")),
    )
    item.registryDependencies = item.registryDependencies?.map((dependency) =>
      dependency.startsWith("@ag/")
        ? `${origin}/${dependency.slice(4)}.json`
        : dependency,
    )
    response.setHeader("Content-Type", "application/json")
    response.end(JSON.stringify(item))
  } catch {
    response.writeHead(404).end()
  }
}).listen(0, "127.0.0.1")
await once(server, "listening")
const address = server.address()
if (!address || typeof address === "string")
  throw new Error("Missing registry address")
origin = `http://127.0.0.1:${address.port}`
try {
  const child = spawn(
    "pnpm",
    [
      "exec",
      "shadcn",
      "add",
      ...names.map((name) => `${origin}/${name}.json`),
      "--cwd",
      resolve(directory),
      mode,
      ...(file ? [file] : []),
      "--yes",
    ],
    { cwd: resolve(import.meta.dirname, ".."), stdio: "inherit" },
  )
  const stop = () => child.kill("SIGTERM")
  process.once("SIGINT", stop)
  process.once("SIGTERM", stop)
  try {
    const [status] = await once(child, "exit")
    if (status !== 0)
      throw new Error(
        "shadcn failed; inspect the consumer diff before retrying",
      )
  } finally {
    process.off("SIGINT", stop)
    process.off("SIGTERM", stop)
  }
} finally {
  server.close()
}
