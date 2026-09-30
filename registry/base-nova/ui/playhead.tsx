"use client"

// The playhead: how a driver hands its moment to the content it moves. The player
// (by the clock) or a scroll stage (by scroll) provides `Playhead`; a component on
// the clip contract (terminal, macos) reads it with `usePlayhead`. So a page composes
// plain elements, `<Player clip={clip}><Terminal session={s} /></Player>`, and a
// server page can too: no render function crosses into the client.

import * as React from "react"

const Context = React.createContext<number | null>(null)

/** Provides the moment (0..1 of the clip) to the content inside. */
export function Playhead({
  at,
  children,
}: {
  at: number
  children: React.ReactNode
}) {
  return <Context.Provider value={at}>{children}</Context.Provider>
}

/** The moment a component draws: its own `progress` when given (a still), else the
 *  driver's around it. Neither is a component placed where nothing moves it, and
 *  that screams. */
export function usePlayhead(progress: number | undefined): number {
  const driven = React.useContext(Context)
  const p = progress ?? driven
  if (p === null)
    throw new Error(
      "no playhead: pass `progress`, or place the component inside a driver (Player)",
    )
  return Math.min(1, Math.max(0, p))
}
