/** Device-local pixels in, viewport geometry out. No DOM or playback state. */
export function frameChat({
  deviceHeight,
  finalDeviceHeight = deviceHeight,
  baseHeight,
  focus,
  grow = true,
  preserveFrame = true,
}: {
  deviceHeight: number
  finalDeviceHeight?: number
  baseHeight: number
  focus?: { y: number; height: number; finalHeight: number } | null
  grow?: boolean
  preserveFrame?: boolean
}) {
  const padding = baseHeight * 0.06
  const height = Math.min(
    finalDeviceHeight,
    grow && focus
      ? Math.min(
          Math.max(baseHeight, focus.finalHeight + 2 * padding),
          baseHeight * 1.5,
        )
      : baseHeight,
  )
  const end = Math.max(0, deviceHeight - height)
  const fits = !!focus && focus.finalHeight + 2 * padding <= height
  let top = Math.max(
    0,
    Math.min(
      end,
      focus
        ? fits
          ? focus.y + focus.height / 2 - height / 2
          : focus.y - padding
        : end,
    ),
  )
  if (preserveFrame && focus && fits) {
    const bottom = focus.y + Math.max(focus.height, focus.finalHeight)
    const fitsTop = focus.y >= padding && bottom <= height - padding
    const fitsBottom =
      focus.y >= end + padding && bottom <= deviceHeight - padding
    if (fitsTop && (!fitsBottom || top < end - top)) top = 0
    else if (fitsBottom) top = end
  }
  return { height, top, padding, clippedTop: top > 0, clippedBottom: top < end }
}
