// Next runs register() once per server start. The metrics registry declares its schema
// into the collector here, so a deploy's labels and flags are current before the first
// registry request, not because of it. Production only: preview and local never write.
export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.VERCEL_ENV !== "production"
  )
    return
  const { declareMetrics } = await import("@/lib/metrics")
  await declareMetrics()
}
