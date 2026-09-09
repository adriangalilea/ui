import { serialize } from "wordgard/doc"
import { menuBar, placeholder, Wordgard } from "wordgard/editor"
import { history } from "wordgard/history"
import {
  blockDoc,
  blockquote,
  bulletList,
  code,
  emphasis,
  heading,
  image,
  lineBreak,
  link,
  orderedList,
  paragraph,
  strong,
} from "wordgard/schema"
import { GardState } from "wordgard/state"
import { Image as ImageNode } from "wordgard/types"
import type { MediaUploader } from "@/registry/base-nova/ui/upload"

export type EditorJob = {
  id: string
  name: string
  progress: number
  error?: string
  retry: () => void
  cancel: () => void
}
type Job = EditorJob & {
  from: number
  to: number
  controller: AbortController
  files: File[]
  /** Toolbar uploads populate its URL field; paste/drop insert mapped nodes. */
  resolve?: (src: string) => void
  onProgress?: (percent: number) => void
}

export function mountEditor(
  host: HTMLElement,
  opts: {
    defaultValue: string
    label: string
    placeholder?: string
    images: boolean
    upload?: MediaUploader
    onChange: (html: string) => void
    onJobs: (jobs: EditorJob[]) => void
  },
) {
  const jobs = new Map<string, Job>()
  let alive = true
  const notify = () => {
    if (alive) opts.onJobs([...jobs.values()])
  }
  const run = async (job: Job, wg: Wordgard) => {
    const handler = opts.upload
    if (!handler) return
    job.controller.abort()
    const controller = new AbortController()
    job.controller = controller
    job.error = undefined
    job.progress = 0
    notify()
    try {
      const progress = job.files.map(() => 0)
      const assets = await Promise.all(
        job.files.map((file, index) =>
          handler(file, {
            signal: controller.signal,
            onProgress: (value) => {
              if (
                alive &&
                !controller.signal.aborted &&
                job.controller === controller
              ) {
                progress[index] = value
                job.progress =
                  progress.reduce((a, b) => a + b, 0) / progress.length
                // Wordgard creates its progress element after invoking the uploader.
                const percent = job.progress * 100
                queueMicrotask(() => {
                  if (alive && !controller.signal.aborted)
                    job.onProgress?.(percent)
                })
                notify()
              }
            },
          }),
        ),
      )
      if (!alive || controller.signal.aborted || !jobs.has(job.id)) return
      if (assets.some((asset) => asset.kind === "video"))
        throw new Error("Image uploads must return an image or animation")
      const first = assets[0]
      if (!first) throw new Error("No image was uploaded")
      jobs.delete(job.id)
      if (job.resolve) job.resolve(first.src)
      else
        wg.dispatch({
          changes: {
            from: job.from,
            to: job.to,
            insert: assets.map((asset) => ImageNode.of(asset.src)),
            fit: true,
          },
          userEvent: "input.image",
        })
      notify()
    } catch (error) {
      if (!alive || controller.signal.aborted) return
      controller.abort()
      job.error = error instanceof Error ? error.message : "Upload failed"
      notify()
    }
  }
  const enqueue = (
    files: File[],
    wg: Wordgard,
    from: number,
    to = from,
    toolbar?: {
      resolve: (src: string) => void
      progress: (percent: number) => void
    },
  ) => {
    const id = crypto.randomUUID()
    const job: Job = {
      id,
      files,
      resolve: toolbar?.resolve,
      onProgress: toolbar?.progress,
      name: files.map((file) => file.name).join(", "),
      from,
      to,
      progress: 0,
      controller: new AbortController(),
      retry: () => void run(job, wg),
      cancel: () => {
        job.controller.abort()
        jobs.delete(id)
        job.resolve?.("")
        notify()
      },
    }
    jobs.set(id, job)
    void run(job, wg)
  }
  const paste = Wordgard.domEventHandler("paste", (event, wg) => {
    if (!opts.upload || !opts.images || !event.clipboardData) return false
    const files = [...event.clipboardData.files].filter((f) =>
      f.type.startsWith("image/"),
    )
    if (!files.length) return false
    event.preventDefault()
    const { anchor, head } = wg.state.selection
    enqueue(files, wg, Math.min(anchor, head), Math.max(anchor, head))
    return true
  })
  // Capture the drop position now, then map through edits. Upstream resolves screen coordinates
  // only after upload, which can point at different text after scrolling or typing.
  const drop = Wordgard.domEventHandler("drop", (event, wg) => {
    if (!opts.upload || !opts.images || !event.dataTransfer) return false
    const files = [...event.dataTransfer.files].filter((f) =>
      f.type.startsWith("image/"),
    )
    if (!files.length) return false
    event.preventDefault()
    enqueue(
      files,
      wg,
      wg.posAtCoords({ x: event.clientX, y: event.clientY }).pos,
    )
    return true
  })
  const editor = Wordgard.create({
    doc: opts.defaultValue,
    parent: host,
    config: [
      blockDoc(),
      paragraph(),
      heading(),
      lineBreak(),
      strong(),
      emphasis(),
      code(),
      link(),
      bulletList({ blockItems: false }),
      orderedList({ blockItems: false }),
      blockquote(),
      history(),
      menuBar(),
      Wordgard.colorScheme.of(host.closest(".dark") ? "dark" : "light"),
      ...(opts.placeholder ? [placeholder(opts.placeholder)] : []),
      ...(opts.images ? [image()] : []),
      ...(opts.images && opts.upload
        ? [
            GardState.prec.highest([paste, drop]),
            image.uploader.of(
              (file, wg, progress) =>
                new Promise<string>((resolve) => {
                  enqueue([file], wg, 0, 0, { resolve, progress })
                }),
            ),
          ]
        : []),
      Wordgard.updateListener.of((update) => {
        for (const job of jobs.values()) {
          if (job.resolve) continue
          const collapsed = job.from === job.to
          job.from = update.changes.mapPos(job.from, collapsed ? -1 : 1)
          job.to = collapsed
            ? job.from
            : Math.max(job.from, update.changes.mapPos(job.to, -1))
        }
        if (update.docChanged)
          opts.onChange(serialize(update.state.doc).toHTML())
      }),
    ],
  })
  host
    .querySelector("[contenteditable]")
    ?.setAttribute("aria-label", opts.label)
  return () => {
    alive = false
    for (const job of jobs.values()) {
      job.controller.abort()
      job.resolve?.("")
    }
    jobs.clear()
    editor.dom.remove()
  }
}
