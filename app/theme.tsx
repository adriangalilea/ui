"use client"

import { Bug, BugOff } from "lucide-react"
import { ThemeProvider, useTheme } from "next-themes"
import type * as React from "react"
import { type Theme, ThemeToggle } from "@/registry/base-nova/ui/theme-toggle"
import { useDebug } from "./debug"

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
  // The flag lives in the URL (`?debug`), one hook for the toggle and every demo: a link
  // carries it, a reload keeps it, nothing is plumbed through props.
  const [debug, setDebug] = useDebug()
  const toggleDebug = () => setDebug(!debug)
  return (
    <div className="fixed right-4 bottom-4 z-40 flex items-center gap-2">
      {/* The theme toggle's own track and option, not a lookalike. Two controls
          sitting together in a design system have to be the same object at the same
          size, and the only way that survives a change to either is for them to be
          the same CSS. A crossed-out bug is off, a bug is on. */}
      <div className="ag-theme-toggle">
        <button
          type="button"
          onClick={toggleDebug}
          aria-pressed={debug}
          data-on={debug ? "" : undefined}
          title="Engine trace on the stage"
          className="ag-theme-toggle-option"
        >
          {debug ? (
            <Bug size={14} aria-hidden />
          ) : (
            <BugOff size={14} aria-hidden />
          )}
          <span className="ag-sr-only">Debug trace</span>
        </button>
      </div>
      <ThemeToggle
        value={theme as Theme | undefined}
        onChange={(t) => setTheme(t)}
      />
    </div>
  )
}
