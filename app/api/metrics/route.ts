import { after } from "next/server"
import {
  type BrowserMetric,
  browserMetrics,
  componentNames,
  recordMetric,
} from "@/lib/metrics"

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 })
  if (request.headers.get("content-type") !== "application/json")
    return new Response(null, { status: 415 })
  // Fixed, tiny envelope; no arbitrary metric names, dimensions, identities or values.
  const reader = request.body?.getReader()
  if (!reader) return new Response(null, { status: 400 })
  let body = ""
  let bytes = 0
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > 512) {
      await reader.cancel()
      return new Response(null, { status: 413 })
    }
    body += decoder.decode(value, { stream: true })
  }
  body += decoder.decode()
  try {
    const event = JSON.parse(body)
    if (
      !event ||
      !browserMetrics.includes(event.metric) ||
      !componentNames.has(event.component) ||
      Object.keys(event).some((k) => k !== "metric" && k !== "component")
    )
      return new Response(null, { status: 400 })
    after(() => recordMetric(event.metric as BrowserMetric, event.component))
    return new Response(null, { status: 202 })
  } catch {
    return new Response(null, { status: 400 })
  }
}
