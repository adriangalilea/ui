import "server-only"
import { defineMetrics } from "@adriangalilea/utils/metrics"
import { libsqlDriver } from "@adriangalilea/utils/metrics/libsql"
import { metricsStore } from "@adriangalilea/utils/metrics/sqlite"
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
function createStore(project: string) {
  const url = process.env.METRICS_DATABASE_URL
  const authToken = process.env.METRICS_AUTH_TOKEN
  if (!url || !authToken) throw new Error("Metrics database is not configured")
  return metricsStore(libsqlDriver(createClient({ url, authToken })), project)
}

/** Strict write probe: errors propagate and synthetic counts never enter UI KPIs. */
export async function probeCollection() {
  if (process.env.VERCEL_ENV !== "production")
    throw new Error("Collector is not a production deployment")
  const checkedAt = new Date().toISOString()
  const store = createStore("ui-health")
  await store.declare({
    metrics: [
      {
        key: "writeProbe",
        kind: "counter",
        label: "collector write probes",
        help: checkedAt,
      },
    ],
    overlaps: [],
  })
  await store.write({
    key: "writeProbe",
    day: checkedAt.slice(0, 10),
    count: 1,
    sum: 0,
    dimensions: {},
  })
  return checkedAt
}

function createMetrics() {
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
    { store: createStore("ui") },
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
