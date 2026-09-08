import { createHash, timingSafeEqual } from "node:crypto"
import { probeCollection } from "@/lib/metrics"

export const maxDuration = 10

export async function POST(request: Request) {
  const token = process.env.METRICS_HEALTH_TOKEN
  if (!token) return Response.json({ status: "unconfigured" }, { status: 503 })
  const digest = (value: string) => createHash("sha256").update(value).digest()
  if (
    !timingSafeEqual(
      digest(request.headers.get("authorization") ?? ""),
      digest(`Bearer ${token}`),
    )
  )
    return new Response(null, { status: 401 })
  try {
    const checkedAt = await probeCollection()
    return Response.json(
      { status: "healthy", checkedAt },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    console.warn("metrics: collection health probe failed")
    return Response.json({ status: "unavailable" }, { status: 503 })
  }
}
