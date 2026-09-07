"use client"

// ONE DEBUG FLAG, IN THE URL. The corner toggle writes `?debug` and every demo reads it
// through this hook, so a link carries the state (a bug report is a URL), a reload keeps
// it, and no component is wired through props to a switch. `location.search` rather than
// `useSearchParams`: that one demands a Suspense boundary on every static page it is
// read from, for one boolean.
//
// `trace()` is the channel OUT of the browser: with the flag on, in development, a demo
// posts what its components decided to `/api/trace`, which appends to a file a terminal
// tails while a hand scrolls the page. Sign-off is done in a browser, and a browser's
// console is invisible from a terminal.

import * as React from "react"

const EVENT = "ag-debug"

function read(): boolean {
  return new URLSearchParams(window.location.search).has("debug")
}

export function useDebug(): [boolean, (on: boolean) => void] {
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    const sync = () => setOn(read())
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener("popstate", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("popstate", sync)
    }
  }, [])
  const set = React.useCallback((next: boolean) => {
    const url = new URL(window.location.href)
    if (next) url.searchParams.set("debug", "")
    else url.searchParams.delete("debug")
    window.history.replaceState(window.history.state, "", url)
    window.dispatchEvent(new Event(EVENT))
  }, [])
  return [on, set]
}

/** Ship one decision to the terminal. A no-op in production, where the route is gone. */
export function trace(tag: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return
  void fetch("/api/trace", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({ tag, ...data }),
  })
}
