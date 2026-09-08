"use client"
import { Sample } from "@/app/samples"
import { type MediaUploader, useMediaUpload } from "./upload"

// #region local
// Demonstrates the UI without a public upload service. Replace this adapter with
// multipartUploader('/api/upload') to use an application-owned, authorized endpoint.
const local: MediaUploader = async (file, { signal, onProgress }) => {
  if (
    !/^image\/(png|jpeg|webp)$/.test(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPEG or WebP under 8 MB")
  signal.throwIfAborted()
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  bitmap.close()
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener("abort", abort, { once: true })
    reader.onloadend = () => signal.removeEventListener("abort", abort)
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.onabort = () => reject(new DOMException("Cancelled", "AbortError"))
    reader.readAsDataURL(file)
  })
  signal.throwIfAborted()
  onProgress?.(1)
  return {
    src,
    width,
    height,
    kind: "image",
    mime: file.type,
    bytes: file.size,
  }
}
// #endregion
export default function Demo() {
  const upload = useMediaUpload(local)
  return (
    <Sample
      name="upload"
      with="local"
      label="local demonstration; no file leaves your browser"
    >
      <div className="space-y-4">
        <input
          aria-label="Choose image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload.start(file)
            e.target.value = ""
          }}
        />
        <p role="status">{upload.error ?? upload.status}</p>
        {(upload.status === "uploading" || upload.status === "processing") && (
          <progress
            value={upload.progress}
            max={1}
            aria-label="Upload progress"
          />
        )}
        {upload.status === "error" && (
          <button type="button" onClick={() => void upload.retry()}>
            retry
          </button>
        )}
        {upload.status !== "idle" && (
          <button type="button" onClick={upload.cancel}>
            clear
          </button>
        )}
        {(upload.asset?.src ?? upload.preview) && (
          // biome-ignore lint/performance/noImgElement: local object/data URL preview, no remote optimizer
          <img
            src={upload.asset?.src ?? upload.preview}
            alt="Your selected file"
            width={upload.asset?.width}
            height={upload.asset?.height}
            className="max-h-80 max-w-full rounded-xl"
          />
        )}
      </div>
    </Sample>
  )
}
