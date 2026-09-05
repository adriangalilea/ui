"use client"

import { ThemeProvider, useTheme } from "next-themes"
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

/** The site's own control, floating in the corner of every page. */
export function SiteTheme() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="fixed right-4 bottom-4 z-40">
      <ThemeToggle
        value={theme as Theme | undefined}
        onChange={(t) => setTheme(t)}
      />
    </div>
  )
}
