"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { MediaUploader } from "@/registry/base-nova/ui/upload"
import type { EditorJob } from "./editor-engine"
import "./editor.css"

export type EditorProps = {
  /** Initial HTML. The editor is uncontrolled; use key to load another document. */
  defaultValue?: string
  onChange?: (html: string) => void
  placeholder?: string
  label: string
  className?: string
  /** Disable images for formats that cannot represent them, e.g. Telegram messages. */
  images?: boolean
  upload?: MediaUploader
}

export function Editor({
  defaultValue = "<p></p>",
  onChange,
  placeholder,
  label,
  className,
  images = true,
  upload,
}: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onChange, upload })
  callbacks.current = { onChange, upload }
  const [jobs, setJobs] = useState<EditorJob[]>([])
  const pendingJobs = useRef<EditorJob[]>([])
  const [error, setError] = useState("")
  const [submitBlocked, setSubmitBlocked] = useState(false)
  // Initial document/schema are intentionally read once. Changing the key mounts another document.
  // biome-ignore lint/correctness/useExhaustiveDependencies: uncontrolled editor
  useEffect(() => {
    let cancelled = false
    let teardown: (() => void) | undefined
    import("./editor-engine")
      .then(({ mountEditor }) => {
        if (cancelled || !host.current) return
        teardown = mountEditor(host.current, {
          defaultValue,
          placeholder,
          label,
          images,
          // Read once, like the document and the schema: whether the editor offers
          // images at all is a mount-time decision.
          upload: callbacks.current.upload,
          onChange: (html) => callbacks.current.onChange?.(html),
          onJobs: (next) => {
            pendingJobs.current = next
            setJobs(next)
          },
        })
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
      teardown?.()
    }
  }, [])
  useEffect(() => {
    const form = host.current?.closest("form")
    const prevent = (event: Event) => {
      if (pendingJobs.current.length) {
        event.preventDefault()
        event.stopPropagation()
        setSubmitBlocked(true)
      }
    }
    form?.addEventListener("submit", prevent, true)
    return () => form?.removeEventListener("submit", prevent, true)
  }, [])
  return (
    <div data-slot="editor" className={cn("not-prose space-y-2", className)}>
      <div ref={host} />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {submitBlocked && jobs.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Finish or cancel image uploads before publishing.
        </p>
      )}
      {jobs.length > 0 && (
        <ul aria-label="Image uploads" className="space-y-2 text-xs">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center gap-2">
              <span role="status">
                {job.name}:{" "}
                {job.error ??
                  (job.progress >= 1
                    ? "processing"
                    : `${Math.round(job.progress * 100)}%`)}
              </span>
              {!job.error && (
                <progress
                  value={job.progress}
                  max={1}
                  aria-label={`Uploading ${job.name}`}
                />
              )}
              {job.error && (
                <button type="button" onClick={job.retry}>
                  retry
                </button>
              )}
              <button type="button" onClick={job.cancel}>
                cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
