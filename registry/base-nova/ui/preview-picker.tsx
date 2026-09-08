"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface PreviewPickerProps<T extends string | number> {
  label: string
  value: T
  options: readonly {
    value: T
    label: string
    icon?: ReactNode
    disabled?: boolean
  }[]
  onChange: (value: T) => void
  className?: string
}

/** A controlled, wrapping selector for examples, languages and other previews. */
export function PreviewPicker<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: PreviewPickerProps<T>) {
  return (
    <fieldset
      data-slot="preview-picker"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-wrap gap-1 rounded-full bg-foreground/5 p-1",
        className,
      )}
    >
      {options.map((option) => (
        <button
          data-slot="preview-picker-option"
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className="flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-foreground/10 aria-pressed:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          {option.icon != null && (
            <span
              data-slot="preview-picker-icon"
              aria-hidden
              className="grid size-5 place-items-center text-xl leading-none [&>svg]:size-4"
            >
              {option.icon}
            </span>
          )}
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
