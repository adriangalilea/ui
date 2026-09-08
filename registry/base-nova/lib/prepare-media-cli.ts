import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { mediaAsset, prepareMedia } from "./prepare-media"

// node --experimental-strip-types requires extension-aware imports; use tsx for this copied CLI.
// pnpm exec tsx lib/prepare-media-cli.ts input output-directory /public-url-prefix [--video]
async function main() {
  const [input, directory, prefix, flag] = process.argv.slice(2)
  if (!input || !directory || !prefix || (flag && flag !== "--video"))
    throw new Error(
      "usage: tsx prepare-media-cli.ts <input> <output-directory> <url-prefix> [--video]",
    )
  const prepared = await prepareMedia(await readFile(resolve(input)), {
    video: flag === "--video",
    maxBytes: 256 * 1024 * 1024,
  })
  await mkdir(resolve(directory), { recursive: true })
  for (const file of prepared.files)
    await writeFile(join(resolve(directory), file.name), file.data)
  const asset = mediaAsset(
    prepared,
    (name) => `${prefix.replace(/\/$/, "")}/${name}`,
  )
  await writeFile(
    join(resolve(directory), `${prepared.files[0].name}.json`),
    `${JSON.stringify(asset, null, 2)}\n`,
  )
  console.log(JSON.stringify(asset, null, 2))
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
