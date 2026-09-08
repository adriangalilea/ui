import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server"
import { componentNames, recordMetric } from "@/lib/metrics"

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const component = /^\/r\/([a-z0-9-]+)\.json$/.exec(
    request.nextUrl.pathname,
  )?.[1]
  if (request.method === "GET" && component && componentNames.has(component)) {
    const traffic = /bot|crawler|spider|slurp/i.test(
      request.headers.get("user-agent") ?? "",
    )
      ? "known-bot"
      : "other"
    event.waitUntil(recordMetric("registryRequest", component, traffic))
  }
  return NextResponse.next()
}

export const config = { matcher: "/r/:path*" }
