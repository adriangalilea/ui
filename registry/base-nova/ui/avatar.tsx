"use client"

// A CLIENT COMPONENT, because it hands `LightboxTrigger` a `render` element. An element
// created in a server component and passed as a prop across the boundary arrives without
// its props during prerender — `element.props` is undefined and the trigger's own assert
// throws — so the element has to be made on the same side as the trigger that clones it.
//
// A PERSON'S FACE, the same object everywhere it appears: beside a quotation, at the head
// of their page, in a feed card, on a comment. One round crop, sized on the studio's
// scale, positioned on the subject rather than on the middle of the file, ringed in the
// picture's own colour — and, when the full portrait is worth a look, a lightbox trigger
// rather than a dead thumbnail.
//
// It reads the same two facts the quote card reads from a portrait's sidecar: `focus`,
// where the subject sits across the picture, and the tone the average colour gives. A
// face cropped on the centre of a file that had its subject to one side is how a
// thumbnail ends up showing an ear; `object-position` from the focus is how it does not.
//
// The lightbox is a dependency and that is deliberate: a face that invites a closer look
// and cannot be looked at closer is the failure this exists to remove. Pass `full` and the
// avatar is a trigger, which needs a `<Lightbox>` provider above it — one per page, the
// way the lightbox is meant to be mounted. Pass nothing and it is a picture.

import { type Entry, LightboxTrigger } from "@/registry/base-nova/ui/lightbox"
import "./avatar.css"

export type AvatarSize = "sm" | "md" | "lg"

export interface AvatarProps {
  /** The rendition the page paints. */
  src: string
  /** The person's name: the accessible name of the picture and of the trigger. */
  alt: string
  /** On the studio's rungs: 24, 40, 64 px. */
  size?: AvatarSize
  /** Where the subject sits across the picture, 0 to 1 — the sidecar's number. */
  focus?: number
  /** The picture's own colour, for the hairline ring. */
  tone?: { accent: string } | null
  /** The original, worth opening. With it the avatar is a lightbox trigger. */
  full?: { src: string; width: number; height: number } | null
  className?: string
}

/** Rungs of the 8·2ⁿ scale, in rem: a comment or a feed line, an attribution, a header. */
export const AVATAR_SIZES: Record<AvatarSize, string> = {
  sm: "1.5rem",
  md: "2.5rem",
  lg: "4rem",
}

export function Avatar({
  src,
  alt,
  size = "md",
  focus = 0.5,
  tone,
  full,
  className,
}: AvatarProps) {
  const style = {
    "--ag-avatar-size": AVATAR_SIZES[size],
    "--ag-avatar-focus": `${(focus * 100).toFixed(1)}%`,
    ...(tone ? { "--ag-avatar-ink": tone.accent } : {}),
  } as React.CSSProperties
  const classes = `ag-avatar${className ? ` ${className}` : ""}`
  // Decorative inside a trigger: the trigger carries the name. Named on its own.
  const picture = (
    // biome-ignore lint/performance/noImgElement: an item cannot assume next/image
    <img
      className="ag-avatar-img"
      src={src}
      alt={full ? "" : alt}
      width={64}
      height={64}
      loading="lazy"
    />
  )
  if (!full)
    return (
      <span className={classes} style={style}>
        {picture}
      </span>
    )
  const entry: Entry = {
    id: `avatar:${full.src}`,
    media: {
      kind: "image",
      source: {
        src,
        full: full.src,
        width: full.width,
        height: full.height,
      },
      alt,
    },
  }
  return (
    <LightboxTrigger
      entry={entry}
      render={
        <a href={full.src} className={classes} style={style} aria-label={alt} />
      }
    >
      {picture}
    </LightboxTrigger>
  )
}
