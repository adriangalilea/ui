"use client"

// A three-state theme control: light, dark, and FOLLOW THE SYSTEM. Most toggles
// collapse that to a boolean, which quietly throws away the only setting a reader
// actually chose, and stops tracking when they change it at the OS.
//
// It is deliberately provider-agnostic: it takes the value and a setter, so it works
// with next-themes, with a hand-rolled context, or with nothing at all. Depending on
// a provider would make the item unusable to anyone who already has one.

import { Monitor, Moon, Sun } from "lucide-react"
import * as React from "react"
import "./theme-toggle.css"

export type Theme = "light" | "dark" | "system"

export const THEMES: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "light", Icon: Sun },
  { value: "system", label: "system", Icon: Monitor },
  { value: "dark", label: "dark", Icon: Moon },
]

export interface ThemeToggleProps {
  /** The chosen theme, `system` included. NOT the resolved one: a control that shows
   *  `dark` when the reader picked `system` at night is reporting a fact they did not
   *  choose, and the next press then reads as a no-op. */
  value: Theme | undefined
  onChange: (theme: Theme) => void
  className?: string
}

export function ThemeToggle({ value, onChange, className }: ThemeToggleProps) {
  // Real radios in a real fieldset, not three buttons wearing radio roles. One
  // setting with three values IS a radio group, and the browser then gives arrow-key
  // movement, the roving tab stop and the grouped announcement for free, correctly,
  // on every assistive technology rather than only the ones the ARIA was tested on.
  const name = React.useId()
  return (
    <fieldset className={`ag-theme-toggle${className ? ` ${className}` : ""}`}>
      <legend className="ag-sr-only">Theme</legend>
      {THEMES.map(({ value: v, label, Icon }) => (
        <label
          key={v}
          // Undefined until the provider resolves, so nothing is marked and the
          // control cannot claim a value the page has not settled on yet.
          data-on={value === v ? "" : undefined}
          title={label}
          className="ag-theme-toggle-option"
        >
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className="ag-sr-only"
          />
          <Icon size={14} aria-hidden />
          <span className="ag-sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}
