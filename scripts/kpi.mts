import { existsSync } from "node:fs"
import { parseArgs } from "node:util"
import {
  renderMetricComparison,
  renderMetrics,
} from "@adriangalilea/utils/metrics/cli"
import {
  compareMetrics,
  metricWindows,
  summarizeMetrics,
} from "@adriangalilea/utils/metrics/report"
import { readMetrics } from "@adriangalilea/utils/metrics/sqlite"
import { createClient } from "@libsql/client"

const { values } = parseArgs({
  options: {
    days: { type: "string", default: "30" },
    project: { type: "string", default: "ui" },
    component: { type: "string" },
    metric: { type: "string" },
    daily: { type: "boolean" },
    "include-today": { type: "boolean" },
    json: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
})
if (values.help) {
  console.log(`Usage: pnpm kpi [--days 30] [--project ui] [--component telegram-chat]
                [--metric installCopy] [--daily] [--include-today] [--json]

Reads the dedicated metrics database with METRICS_READ_TOKEN.
Default: 30 completed UTC days versus the preceding 30 days.
--include-today includes today's partial counts; comparison is provisional.
--daily adds current-window daily rows. --json includes both windows and comparisons.
METRICS_HEALTH_TOKEN enables the deployed UI write/read probe; unhealthy exits nonzero.
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
  const windows = metricWindows(days, { includeToday: values["include-today"] })
  const { from, to } = windows.current
  const observations = (
    await readMetrics(db, {
      from: windows.previous.from,
      to,
      project: values.project,
    })
  ).filter(
    (r) =>
      (!values.component || r.dimensions.component === values.component) &&
      (!values.metric || r.key === values.metric),
  )
  const rows = observations.filter((r) => r.day >= from)
  const previousRows = observations.filter((r) => r.day < from)
  const comparison = compareMetrics(rows, previousRows)
  if (values.json)
    console.log(
      JSON.stringify(
        {
          from,
          to,
          project: values.project,
          collection,
          windows,
          rows,
          totals: summarizeMetrics(rows),
          previous: {
            rows: previousRows,
            totals: summarizeMetrics(previousRows),
          },
          comparison,
        },
        null,
        2,
      ),
    )
  else {
    console.log(
      `${values.project} metrics · ${from} to ${to} UTC\nPrevious: ${windows.previous.from} to ${windows.previous.to} UTC\n${windows.partial ? "PROVISIONAL: current window includes today; previous window is complete." : "Equal windows of completed days; today is excluded."}\n`,
    )
    console.log(renderMetricComparison(comparison))
    if (values.daily) {
      console.log("\nCurrent window · daily observations\n")
      console.log(renderMetrics(rows, { daily: true }))
    }
    console.log(
      `\nDeployed collector write probe: ${collection.status}${collection.checkedAt ? ` (${collection.checkedAt})` : ""}`,
    )
    if (collection.status === "unconfigured")
      console.log(
        "Set METRICS_HEALTH_TOKEN to check collection; zero counts alone do not prove quiet traffic.",
      )
    console.log(
      "\nChanges compare recorded observations only; no baseline means no prior count to divide by.\nRequests are not installs. Command copies are intent. Known-bot classification is heuristic.",
    )
  }
} finally {
  db.close()
}
