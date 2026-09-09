// A per-process sliding window over the caller's address, for the two public paths
// that turn a request into a database write. It bounds what one address can make
// the collector write; a Vercel instance keeps its own map, so the bound is per
// instance, which is the honest scope of an in-memory limiter and enough to stop a
// loop from billing the database.
const windows = new Map<string, number[]>()
const WINDOW_MS = 60_000

/** True when this address may make one more write in the current minute. */
export function allowWrite(request: Request, perMinute: number): boolean {
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  const now = Date.now()
  const recent = (windows.get(address) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= perMinute) {
    windows.set(address, recent)
    return false
  }
  recent.push(now)
  windows.set(address, recent)
  if (windows.size > 10_000) {
    for (const [key, times] of windows)
      if (times.every((t) => now - t >= WINDOW_MS)) windows.delete(key)
  }
  return true
}
