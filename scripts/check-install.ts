import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const temporary = await mkdtemp(join(tmpdir(), "ag-install-check-"))
const scaffoldUtils = 'export { clsx as cn } from "clsx"\n'
const run = async (cmd: string, args: string[], cwd: string) => {
  const child = spawn(cmd, args, { cwd, stdio: "inherit" })
  const [status] = await once(child, "exit")
  assert.equal(status, 0, `${cmd} ${args.join(" ")}`)
}
const json = async (path: string, value: unknown) =>
  writeFile(path, JSON.stringify(value, null, 2))
const server = createServer(async (request, response) => {
  const name = request.url?.match(/^\/([a-z0-9-]+)\.json$/)?.[1]
  try {
    if (!name) throw new Error("Unknown item")
    response.setHeader("Content-Type", "application/json")
    response.end(await readFile(join(root, "public/r", `${name}.json`)))
  } catch {
    response.writeHead(404).end()
  }
}).listen(0, "127.0.0.1")
await once(server, "listening")
const address = server.address()
assert.ok(address && typeof address !== "string")
const registry = `http://127.0.0.1:${address.port}/{name}.json`
const config = (workspace: boolean) => ({
  $schema: "https://ui.shadcn.com/schema.json",
  style: "base-nova",
  rsc: true,
  tsx: true,
  tailwind: {
    config: "",
    css: "app/globals.css",
    baseColor: "neutral",
    cssVariables: true,
  },
  aliases: workspace
    ? {
        components: "@/components",
        ui: "@workspace/ui/components",
        utils: "@workspace/ui/lib/utils",
        lib: "@workspace/ui/lib",
        hooks: "@workspace/ui/hooks",
      }
    : {
        components: "@/components",
        ui: "@/components/ui",
        utils: "@/lib/utils",
        lib: "@/lib",
        hooks: "@/hooks",
      },
  registries: { "@ag": registry },
})
try {
  for (const workspace of [false, true]) {
    const destination = join(temporary, workspace ? "workspace" : "app")
    const app = workspace ? join(destination, "apps/web") : destination
    await mkdir(join(app, "app"), { recursive: true })
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"))
    const dependencies = {
      ...pkg.dependencies,
      ...(workspace ? { "@workspace/ui": "workspace:*" } : {}),
    }
    await json(join(app, "package.json"), {
      name: "install-check",
      private: true,
      dependencies,
      devDependencies: {
        typescript: pkg.devDependencies.typescript,
        tailwindcss: pkg.devDependencies.tailwindcss,
      },
      packageManager: pkg.packageManager,
    })
    await json(join(app, "components.json"), config(workspace))
    await json(join(app, "tsconfig.json"), {
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
    })
    // Token import is the documented scaffold contract, relative to the app.
    await writeFile(
      join(app, "app/globals.css"),
      '@import "tailwindcss";\n@import "./tokens.css";\n',
    )
    let utils = join(app, "lib/utils.ts")
    if (workspace) {
      await json(join(destination, "package.json"), {
        private: true,
        packageManager: pkg.packageManager,
      })
      await writeFile(
        join(destination, "pnpm-workspace.yaml"),
        'packages:\n  - "apps/*"\n  - "packages/*"\n',
      )
      const shared = join(destination, "packages/ui")
      await mkdir(join(shared, "src/lib"), { recursive: true })
      await mkdir(join(shared, "app"), { recursive: true })
      await json(join(shared, "package.json"), {
        name: "@workspace/ui",
        private: true,
        exports: {
          "./lib/*": "./src/lib/*.ts",
          "./components/*": "./src/components/*.tsx",
          "./hooks/*": "./src/hooks/*.ts",
        },
        dependencies: pkg.dependencies,
      })
      await json(join(shared, "tsconfig.json"), {
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } },
      })
      await json(join(shared, "components.json"), {
        ...config(false),
        aliases: {
          components: "@/components",
          ui: "@/components",
          utils: "@/lib/utils",
          lib: "@workspace/ui/lib",
          hooks: "@workspace/ui/hooks",
        },
      })
      await writeFile(
        join(shared, "app/globals.css"),
        '@import "tailwindcss";\n',
      )
      utils = join(shared, "src/lib/utils.ts")
    }
    await mkdir(resolve(utils, ".."), { recursive: true })
    await writeFile(utils, scaffoldUtils)
    await run("pnpm", ["install", "--ignore-scripts"], destination)
    // Exercise the exact public command, served from the just-built registry.
    const publicInstall = () =>
      run(
        "pnpm",
        [
          "exec",
          "shadcn",
          "add",
          "@ag/telegram-chat",
          "@ag/code",
          "--cwd",
          app,
          "--yes",
          "--overwrite",
        ],
        root,
      )
    await publicInstall()
    assert.equal(
      await readFile(utils, "utf8"),
      scaffoldUtils,
      "Public installation preserves consumer cn",
    )
    const components = workspace
      ? join(destination, "packages/ui/src/components")
      : join(app, "components/ui")
    const installed = [
      join(components, "telegram-chat.tsx"),
      join(components, "device-frame.tsx"),
      join(components, "telegram-chat.css"),
      join(app, "app/tokens.css"),
    ]
    const before = await Promise.all(
      installed.map((path) => readFile(path, "utf8")),
    )
    for (let i = 0; i < installed.length; i++)
      await writeFile(
        installed[i],
        `${before[i]}\n/* install-check: public stale copy */\n`,
      )
    await publicInstall()
    for (let i = 0; i < installed.length; i++)
      assert.equal(
        await readFile(installed[i], "utf8"),
        before[i],
        `Public update refreshes ${installed[i]}`,
      )
    for (let i = 0; i < installed.length; i++)
      await writeFile(
        installed[i],
        `${before[i]}\n/* install-check: stale copy */\n`,
      )
    await run(
      "bun",
      ["scripts/add.ts", "telegram-chat,code", app, "--dry-run"],
      root,
    )
    for (const path of installed)
      assert.match(
        await readFile(path, "utf8"),
        /install-check: stale copy/,
        "Preview must not write files",
      )
    await run(
      "bun",
      ["scripts/add.ts", "telegram-chat,code", app, "--overwrite"],
      root,
    )
    for (let i = 0; i < installed.length; i++)
      assert.equal(
        await readFile(installed[i], "utf8"),
        before[i],
        `Update refreshes ${installed[i]}`,
      )
    assert.equal(
      await readFile(utils, "utf8"),
      scaffoldUtils,
      "Local sync preserves consumer cn",
    )
    assert.match(
      await readFile(join(app, "app/tokens.css"), "utf8"),
      /--alpha-wash/,
    )
    assert.match(
      await readFile(join(components, "telegram-chat.tsx"), "utf8"),
      /useChatAfterlife/,
    )
    assert.match(
      await readFile(join(components, "telegram-chat-playback.tsx"), "utf8"),
      /useChatAfterlife/,
    )
    const lib = workspace
      ? join(destination, "packages/ui/src/lib")
      : join(app, "lib")
    assert.match(
      await readFile(join(lib, "telegram-chat-framing.ts"), "utf8"),
      /frameChat/,
    )
    console.log(
      `${workspace ? "Workspace" : "Standalone"} public install and local sync passed`,
    )
  }
} finally {
  server.close()
  await rm(temporary, { recursive: true, force: true })
}
