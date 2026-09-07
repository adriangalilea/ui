// DEV ONLY: a browser's trace, appended to a file a terminal can tail. Sign-off is done
// by a hand in a browser and the browser's console is invisible from a terminal, so a
// demo with `?debug` posts every decision here and `tail -f /tmp/ui-trace.jsonl` reads
// it live. Nothing in production: the route answers 404 there.
import { appendFile } from "node:fs/promises"

const TRACE_FILE = "/tmp/ui-trace.jsonl"

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 })
  const body = await req.text()
  await appendFile(TRACE_FILE, `${new Date().toISOString()} ${body}\n`)
  return new Response(null, { status: 204 })
}
