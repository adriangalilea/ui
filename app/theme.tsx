"use client"

import { ThemeProvider, useTheme } from "next-themes"
import * as React from "react"
import { type Theme, ThemeToggle } from "@/registry/base-nova/ui/theme-toggle"

/** next-themes writes the class onto <html> from a blocking script it injects, so the
 *  first paint is already the right theme. Resolving it in an effect instead paints
 *  light and then corrects, which is the flash every naive version has. */
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // The colour transition would otherwise run on every variable on the page at
      // once, which reads as a wash rather than a switch.
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

/** The site's own controls, floating in the corner of every page. Debug sits beside
 *  the theme because it is the same kind of thing: a setting the reader chooses that
 *  has to SURVIVE a reload. A bug on a phone is reported after several attempts, and
 *  re-typing `?debug` each time is how a stale trace ends up being copied. */
export function SiteTheme() {
  const { theme, setTheme } = useTheme()
  const [debug, setDebug] = React.useState(false)
  React.useEffect(() => {
    setDebug(localStorage.getItem("ag-debug") === "1")
  }, [])
  const toggleDebug = () => {
    const next = !debug
    setDebug(next)
    localStorage.setItem("ag-debug", next ? "1" : "0")
    // Components read the flag on this event rather than being wired through props:
    // a debug switch that needs plumbing to every consumer never gets turned on.
    window.dispatchEvent(new Event("ag-debug"))
  }
  return (
    <div className="fixed right-4 bottom-4 z-40 flex items-center gap-2">
      <button
        type="button"
        onClick={toggleDebug}
        aria-pressed={debug}
        title="Engine trace on the stage"
        className={`rounded-full border border-border px-3 py-1.5 font-mono text-xs transition-colors ${
          debug
            ? "bg-foreground text-background"
            : "bg-sidebar text-muted-foreground hover:text-foreground"
        }`}
      >
        debug
      </button>
      <ThemeToggle
        value={theme as Theme | undefined}
        onChange={(t) => setTheme(t)}
      />
    </div>
  )
}
