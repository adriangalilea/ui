"use client"

import { Check, CircleAlert, Clipboard } from "lucide-react"
import type { ReactNode } from "react"
import type { BrowserMetric } from "@/lib/metrics"
import { useCopy } from "@/registry/base-nova/ui/copy"

/** Site instrumentation stays outside the installable Code/Copy components. */
export function CommandCopy({
  command,
  component,
  metric,
  children,
}: {
  command: string
  component: string
  metric: BrowserMetric
  children: ReactNode
}) {
  const { copy, copied, error } = useCopy(command)
  return (
    <div
      data-site-command={metric}
      className="relative w-fit max-w-full [&_pre]:pr-12"
    >
      {children}
      <button
        type="button"
        aria-label={
          error ? "Copy failed. Try again" : copied ? "Copied" : "Copy"
        }
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/6 focus-visible:outline-2 focus-visible:outline-ring"
        onClick={async () => {
          if (!(await copy())) return
          void fetch("/api/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metric, component }),
            keepalive: true,
          }).catch(() => {})
        }}
      >
        {error ? (
          <CircleAlert size={14} aria-hidden />
        ) : copied ? (
          <Check size={14} aria-hidden />
        ) : (
          <Clipboard size={14} aria-hidden />
        )}
      </button>
    </div>
  )
}
