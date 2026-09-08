"use client"

// A three-state theme control: light, dark, and FOLLOW THE SYSTEM. Most toggles
// collapse that to a boolean, which quietly throws away the only setting a reader
// actually chose, and stops tracking when they change it at the OS.
//
// It is deliberately provider-agnostic: it takes the value and a setter, so it works
// with next-themes, with a hand-rolled context, or with nothing at all. Depending on
// a provider would make the item unusable to anyone who already has one.

import { Monitor, Moon, Sun } from "lucide-react"
import { PreviewPicker } from "@/registry/base-nova/ui/preview-picker"

export type Theme = "light" | "dark" | "system"

export const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "light", Icon: Sun },
  { value: "system", label: "system", Icon: Monitor },
  { value: "dark", label: "dark", Icon: Moon },
]

export interface ThemeToggleProps {
  /** The chosen theme, `system` included. NOT the resolved one: a control that shows
   *  `dark` when the reader picked `system` at night is reporting a fact they did not
   *  choose, and the next press then reads as a no-op.
   *
   *  Undefined while a provider is still resolving, which is a real render on every
   *  load: it falls back to `fallback` rather than showing nothing, because a
   *  three-way control with no option marked reads as broken, and a reader cannot
   *  tell it apart from one whose selected state is invisible. */
  value: Theme | undefined
  /** What an unresolved control shows. The provider's own default. */
  fallback?: Theme
  onChange: (theme: Theme) => void
  className?: string
}

export function ThemeToggle({
  value,
  fallback = "system",
  onChange,
  className,
}: ThemeToggleProps) {
  return (
    <PreviewPicker
      label="Theme"
      value={value ?? fallback}
      onChange={onChange}
      options={THEMES.map(({ value, label, Icon }) => ({
        value,
        label,
        icon: <Icon aria-hidden />,
      }))}
      size="compact"
      iconsOnly
      className={className}
    />
  )
}
