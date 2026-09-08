"use client"

import { useEffect, useRef, useState } from "react"
import {
  isMediaAsset,
  type MediaAsset,
} from "@/registry/base-nova/lib/media-asset"

export type UploadOptions = {
  signal: AbortSignal
  onProgress?: (fraction: number) => void
}
export type MediaUploader = (
  file: File,
  options: UploadOptions,
) => Promise<MediaAsset>

/** Transport for an application-owned multipart endpoint returning MediaAsset JSON.
 * Other providers implement MediaUploader; neither the UI nor editor knows the store. */
export function multipartUploader(endpoint: string): MediaUploader {
  return (file, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      signal.throwIfAborted()
      const xhr = new XMLHttpRequest()
      const abort = () => xhr.abort()
      const finish = () => signal.removeEventListener("abort", abort)
      xhr.open("POST", endpoint)
      xhr.responseType = "json"
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total)
      }
      xhr.onload = () => {
        finish()
        if (xhr.status >= 200 && xhr.status < 300 && isMediaAsset(xhr.response))
          resolve(xhr.response)
        else
          reject(
            new Error(xhr.response?.error ?? `Upload failed (${xhr.status})`),
          )
      }
      xhr.onerror = () => {
        finish()
        reject(new Error("Upload failed: network unavailable"))
      }
      xhr.onabort = () => {
        finish()
        reject(new DOMException("Upload cancelled", "AbortError"))
      }
      signal.addEventListener("abort", abort, { once: true })
      const body = new FormData()
      body.append("file", file)
      xhr.send(body)
    })
}

/** One selected asset, with local preview, progress, cancellation and explicit retry.
 * A completed transfer can still be processing; only the resolved asset is publishable. */
export function useMediaUpload(upload: MediaUploader) {
  const controller = useRef<AbortController | null>(null)
  const file = useRef<File | null>(null)
  const previewRef = useRef<string | null>(null)
  const [state, setState] = useState<{
    status: "idle" | "uploading" | "processing" | "ready" | "error"
    progress: number
    preview?: string
    asset?: MediaAsset
    error?: string
  }>({ status: "idle", progress: 0 })
  const clear = () => {
    controller.current?.abort()
    controller.current = null
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
  }
  useEffect(
    () => () => {
      controller.current?.abort()
      controller.current = null
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )
  async function start(next: File) {
    clear()
    file.current = next
    const active = new AbortController()
    controller.current = active
    const preview = URL.createObjectURL(next)
    previewRef.current = preview
    setState({ status: "uploading", progress: 0, preview })
    try {
      const asset = await upload(next, {
        signal: active.signal,
        onProgress: (progress) => {
          if (controller.current === active)
            setState({
              status: progress >= 1 ? "processing" : "uploading",
              progress,
              preview,
            })
        },
      })
      if (controller.current !== active) return
      URL.revokeObjectURL(preview)
      previewRef.current = null
      setState({ status: "ready", progress: 1, asset })
      return asset
    } catch (error) {
      if (controller.current === active)
        setState({
          status: "error",
          progress: 0,
          preview,
          error: error instanceof Error ? error.message : "Upload failed",
        })
    }
  }
  return {
    ...state,
    start,
    retry: () => file.current && start(file.current),
    cancel: () => {
      clear()
      file.current = null
      setState({ status: "idle", progress: 0 })
    },
  }
}
