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
      "\nRequests are not installs. Command copies are intent. Known-bot classification is heuristic.",
    )
  }
} finally {
  db.close()
}
