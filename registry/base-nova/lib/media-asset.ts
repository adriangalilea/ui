/** Portable metadata. Store this beside an asset, never infer dimensions in a renderer. */
export type MediaAsset = {
  src: string
  kind: "image" | "animation" | "video"
  width: number
  height: number
  mime: string
  bytes: number
  blurDataURL?: string
  poster?: string
  duration?: number
}

/** Validate responses at the upload boundary; no framework or storage dependency. */
export function isMediaAsset(value: unknown): value is MediaAsset {
  if (!value || typeof value !== "object") return false
  const a = value as Record<string, unknown>
  return (
    typeof a.src === "string" &&
    a.src.length > 0 &&
    ["image", "animation", "video"].includes(String(a.kind)) &&
    typeof a.mime === "string" &&
    [a.width, a.height].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n > 0,
    ) &&
    typeof a.bytes === "number" &&
    Number.isFinite(a.bytes) &&
    a.bytes > 0 &&
    (a.poster === undefined || typeof a.poster === "string") &&
    (a.blurDataURL === undefined || typeof a.blurDataURL === "string") &&
    (a.duration === undefined ||
      (typeof a.duration === "number" &&
        Number.isFinite(a.duration) &&
        a.duration >= 0))
  )
}
