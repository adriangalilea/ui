import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server"
import { componentNames, recordMetric } from "@/lib/metrics"
import { allowWrite } from "@/lib/ratelimit"

// An install pulls an item and its dependency tree in one burst, a few dozen files
// at most; beyond that per minute is a loop, served but not counted.
const REGISTRY_WRITES_PER_MINUTE = 60

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const component = /^\/r\/([a-z0-9-]+)\.json$/.exec(
    request.nextUrl.pathname,
  )?.[1]
  if (
    request.method === "GET" &&
    component &&
    componentNames.has(component) &&
    allowWrite(request, REGISTRY_WRITES_PER_MINUTE)
  ) {
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
