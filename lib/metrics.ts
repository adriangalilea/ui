import "server-only"
import { defineMetrics } from "@adriangalilea/utils/metrics"
import { sqliteMetricsWriter } from "@adriangalilea/utils/metrics/sqlite"
import { createClient } from "@libsql/client"
import registry from "@/registry.json"

export const componentNames = new Set(registry.items.map((item) => item.name))
const dimensions = { component: [...componentNames] }
export const browserMetrics = [
  "installCopy",
  "updatePreviewCopy",
  "updateApplyCopy",
] as const
export type BrowserMetric = (typeof browserMetrics)[number]

let instance: ReturnType<typeof createMetrics> | undefined
function createMetrics() {
  const url = process.env.METRICS_DATABASE_URL
  const authToken = process.env.METRICS_AUTH_TOKEN
  if (!url || !authToken) throw new Error("Metrics database is not configured")
  return defineMetrics(
    {
      installCopy: {
        kind: "counter",
        label: "install command copies",
        dimensions,
      },
      updatePreviewCopy: {
        kind: "counter",
        label: "update preview command copies",
        dimensions,
      },
      updateApplyCopy: {
        kind: "counter",
        label: "update apply command copies",
        dimensions,
      },
      registryRequest: {
        kind: "counter",
        label: "registry JSON requests",
        help: "Requests can be previews, dependencies, updates or retries; not completed installs.",
        dimensions: { ...dimensions, traffic: ["known-bot", "other"] },
      },
    },
    { write: sqliteMetricsWriter(createClient({ url, authToken }), "ui") },
  )
}

export async function recordMetric(
  key: BrowserMetric | "registryRequest",
  component: string,
  traffic?: string,
) {
  // Local and preview sessions never contribute to production counts.
  if (process.env.VERCEL_ENV !== "production") return
  try {
    instance ??= createMetrics()
    await instance[key].bump({
      dimensions: { component, ...(traffic ? { traffic } : {}) },
    })
  } catch {
    console.warn("metrics: registry collection unavailable")
  }
}
