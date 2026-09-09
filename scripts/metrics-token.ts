// The collector's ingestion token, minted from the library's own table list so a
// table added to METRICS_SCHEMA can never be missing from the grant: read, add and
// update on every metrics table, never delete (the store reconciles nothing). The
// value goes straight into Vercel as a sensitive variable and production is
// redeployed so it binds; it is never printed.
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { METRICS_TABLES } from "@adriangalilea/utils/metrics/sqlite"

const DATABASE = "metrics"
const VARIABLE = "METRICS_AUTH_TOKEN"
const SCOPE = "adriangalileas-projects"
const ACTIONS = "data_read,data_add,data_update"

const run = (cmd: string, args: string[], input?: string) => {
  const result = spawnSync(cmd, args, { input, encoding: "utf8" })
  assert.equal(
    result.status,
    0,
    `${cmd} ${args.join(" ")}\n${result.stderr}`.trim(),
  )
  return result.stdout.trim()
}

const token = run("turso", [
  "db",
  "tokens",
  "create",
  DATABASE,
  ...METRICS_TABLES.flatMap((table) => ["-p", `${table}:${ACTIONS}`]),
])
assert.ok(token.length > 100, "turso returned no token")
console.log(`minted for ${METRICS_TABLES.join(", ")}`)

spawnSync(
  "vercel",
  ["env", "rm", VARIABLE, "production", "--scope", SCOPE, "-y"],
  {
    encoding: "utf8",
  },
)
run(
  "vercel",
  ["env", "add", VARIABLE, "production", "--sensitive", "--scope", SCOPE],
  token,
)
console.log(`installed ${VARIABLE} in Vercel production`)

const latest = run("vercel", ["ls", "ui", "--scope", SCOPE])
  .split("\n")
  .find((line) => line.includes("Ready"))
  ?.match(/https:\/\/\S+/)?.[0]
assert.ok(latest, "no Ready production deployment to redeploy")
run("vercel", ["redeploy", latest, "--scope", SCOPE])
console.log("redeployed; run `pnpm kpi` to see the write probe healthy")
