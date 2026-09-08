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
      <div className="rounded-full bg-foreground/5 p-1">
        <button
          type="button"
          onClick={toggleDebug}
          aria-pressed={debug}
          title="Engine trace on the stage"
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-foreground/10 aria-pressed:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {debug ? (
            <Bug size={14} aria-hidden />
          ) : (
            <BugOff size={14} aria-hidden />
          )}
          <span className="sr-only">Debug trace</span>
        </button>
      </div>
      <ThemeToggle
        value={theme as Theme | undefined}
        onChange={(t) => setTheme(t)}
      />
    </div>
  )
}
