import { existsSync } from "node:fs"
import { parseArgs } from "node:util"
import { renderMetrics } from "@adriangalilea/utils/metrics/cli"
import { summarizeMetrics } from "@adriangalilea/utils/metrics/report"
import { readMetrics } from "@adriangalilea/utils/metrics/sqlite"
import { createClient } from "@libsql/client"

const { values } = parseArgs({
  options: {
    days: { type: "string", default: "30" },
    project: { type: "string", default: "ui" },
    component: { type: "string" },
    metric: { type: "string" },
    daily: { type: "boolean" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help) {
  console.log(`Usage: pnpm kpi [--days 30] [--project ui] [--component telegram-chat]
                [--metric installCopy] [--daily] [--json]

Reads the dedicated metrics database with METRICS_READ_TOKEN.
Default: 30 UTC days through today (partial). --json includes daily rows and totals.
Metric names and labels come from declarations, not a report-specific list.`)
  process.exit(0)
}
if (existsSync(".env.local")) process.loadEnvFile(".env.local")
const days = Number(values.days)
if (!Number.isInteger(days) || days < 1 || days > 3660)
  throw new Error("--days must be an integer from 1 to 3660")
const url = process.env.METRICS_DATABASE_URL
const authToken = process.env.METRICS_READ_TOKEN
if (!url || !authToken)
  throw new Error(
    "Set METRICS_DATABASE_URL and METRICS_READ_TOKEN (read-only).",
  )
const db = createClient({ url, authToken })
try {
  // This tests the deployed writer separately from the read-only report connection.
  // No token means unknown health, never a false claim of healthy collection.
  const token = process.env.METRICS_HEALTH_TOKEN
  let collection: { status: string; checkedAt?: string } = {
    status: "not-checked",
  }
  if (values.project === "ui") {
    collection = { status: "unconfigured" }
    if (token) {
      try {
        const response = await fetch(
          `${process.env.METRICS_COLLECTOR_URL ?? "https://ui.adriangalilea.com"}/api/metrics/health`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(12000),
            redirect: "error",
          },
        )
        const result = await response.json()
        collection =
          response.ok &&
          result.status === "healthy" &&
          typeof result.checkedAt === "string"
            ? { status: "healthy", checkedAt: result.checkedAt }
            : { status: "unavailable" }
      } catch {
        collection = { status: "unavailable" }
      }
    }
    if (collection.status !== "healthy") process.exitCode = 1
    if (collection.status === "healthy" && collection.checkedAt) {
      const checkedAt = collection.checkedAt
      const day = checkedAt.slice(0, 10)
      const probes = await readMetrics(db, {
        from: day,
        to: day,
        project: "ui-health",
      })
      if (
        !probes.some(
          (r) => r.key === "writeProbe" && r.count > 0 && r.help >= checkedAt,
        )
      ) {
        collection = { status: "unavailable" }
        process.exitCode = 1
      }
    }
  }
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.parse(to) - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10)
  const rows = (
    await readMetrics(db, { from, to, project: values.project })
  ).filter(
    (r) =>
      (!values.component || r.dimensions.component === values.component) &&
      (!values.metric || r.key === values.metric),
  )
  if (values.json)
    console.log(
      JSON.stringify(
        {
          from,
          to,
          project: values.project,
          collection,
          rows,
          totals: summarizeMetrics(rows),
        },
        null,
        2,
      ),
    )
  else {
    console.log(
      `${values.project} metrics · ${from} to ${to} UTC (today is partial)\n`,
    )
    console.log(renderMetrics(rows, { daily: values.daily }))
    console.log(
      `\nDeployed collector write probe: ${collection.status}${collection.checkedAt ? ` (${collection.checkedAt})` : ""}`,
    )
    if (collection.status === "unconfigured")
      console.log(
        "Set METRICS_HEALTH_TOKEN to check collection; zero counts alone do not prove quiet traffic.",
      )
    console.log(
      "\nRequests are not installs. Command copies are intent. Known-bot classification is heuristic.",
    )
  }
} finally {
  db.close()
}
