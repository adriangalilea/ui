"use client"

import { useTheme } from "next-themes"
import { type Theme, ThemeToggle } from "@/registry/base-nova/ui/theme-toggle"

export default function Demo() {
  // next-themes here, but the item does not know that: it takes a value and a setter,
  // so any provider, or none, drives it the same way. `theme` is the CHOICE (system
  // included); `resolvedTheme` is what that currently means.
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div className="space-y-8">
      <ThemeToggle
        value={theme as Theme | undefined}
        onChange={(t) => setTheme(t)}
      />
      <div className="space-y-2 font-mono text-xs text-muted-foreground">
        <div>chosen · {theme ?? "…"}</div>
        <div>resolves to · {resolvedTheme ?? "…"}</div>
      </div>
      <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/70">
        Pick <span className="font-mono text-xs">system</span> and change the
        appearance in macOS System Settings with this page open: it follows,
        live. A toggle that stored a boolean would have stopped listening the
        moment it was first pressed.
      </p>
      <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/70">
        Everything on this site is wired to it. The tokens item carries both
        halves, so an item that reads them has nothing to switch: only the
        handful of components with a palette of their own (the terminal's
        phosphor, Telegram's client colours) ever name a theme at all.
      </p>
    </div>
  )
}
