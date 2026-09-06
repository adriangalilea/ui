"use client"

// A CLIENT COMPONENT, because it hands the lightbox a `render` element. An element
// created in a server component and passed as a prop across the boundary arrives without
// its props during prerender — `element.props` is undefined and the trigger's own assert
// throws — so the element has to be made on the same side as the trigger that clones it.
//
// A PERSON'S FACE, the same object everywhere it appears: beside a quotation, at the head
// of their page, in a feed card, on a comment. One round crop, sized on the studio's
// scale, positioned on the subject rather than on the middle of the file, ringed in the
// picture's own colour — and, when the full portrait is worth a look, a way to look.
//
// It reads the same two facts the quote card reads from a portrait's sidecar: `focus`,
// where the subject sits across the picture, and the tone the average colour gives. A
// face cropped on the centre of a file that had its subject to one side is how a
// thumbnail ends up showing an ear; `object-position` from the focus is how it does not.
//
// The lightbox is a dependency and that is deliberate: a face that invites a closer look
// and cannot be looked at closer is the failure this exists to remove. Pass `full` and the
// portrait opens ALONE (`LightboxSolo`: its own provider, so three faces on a page are
// three viewers, never a reel with a strip and arrows), with the person's name as the
// caption — the lightbox's figcaption fallback would read the quote's whole attribution.
// Needs nothing above it. Pass nothing and it is a picture.
//
// STYLE IS UTILITIES, the way every shadcn item is, so a consumer overrides with
// `className` and never fights a stylesheet. The two numbers that are not a fixed value —
// the rung and the focus — arrive as custom properties and land through `size-(--…)` and
// `object-(--…)`; the class says which property each one drives.

import { cn } from "@/lib/utils"
import { type Entry, LightboxSolo } from "@/registry/base-nova/ui/lightbox"

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
  /** The original, worth opening. With it the avatar opens the portrait, alone. */
  full?: { src: string; width: number; height: number } | null
  className?: string
}

/** Rungs of the 8·2ⁿ scale, in rem: a comment or a feed line, an attribution, a header. */
export const AVATAR_SIZES: Record<AvatarSize, string> = {
  sm: "1.5rem",
  md: "2.5rem",
  lg: "4rem",
}

/** A HAIRLINE IN THE PICTURE'S OWN COLOUR. On a dark ground a dark portrait has no edge;
 *  the ring gives it one, and taking the colour from the picture keeps it belonging to the
 *  picture rather than to the page. Without a tone it is the page's border. */
const RING = "ring-1 ring-(--ag-avatar-ink)/40"
const RING_PLAIN = "ring-1 ring-border/40"

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
    // The whole object-position, so the class consumes one value.
    "--ag-avatar-focus": `${(focus * 100).toFixed(1)}% 50%`,
    ...(tone ? { "--ag-avatar-ink": tone.accent } : {}),
  } as React.CSSProperties
  const classes = cn(
    "inline-block flex-none size-(--ag-avatar-size) overflow-hidden rounded-full align-middle",
    tone ? RING : RING_PLAIN,
    full && "cursor-zoom-in",
    className,
  )
  // Decorative inside a trigger: the trigger carries the name. Named on its own.
  // POSITIONED ON THE SUBJECT, not on the middle of the file.
  const picture = (
    // biome-ignore lint/performance/noImgElement: an item cannot assume next/image
    <img
      data-slot="avatar-image"
      className="block size-full object-cover object-(--ag-avatar-focus)"
      src={src}
      alt={full ? "" : alt}
      width={64}
      height={64}
      loading="lazy"
    />
  )
  if (!full)
    return (
      <span data-slot="avatar" className={classes} style={style}>
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
    caption: alt,
  }
  return (
    <LightboxSolo
      entry={entry}
      label="portrait"
      render={
        // biome-ignore lint/a11y/useAnchorContent: the trigger clones the picture into this element, and it carries the name
        <a
          data-slot="avatar"
          href={full.src}
          className={classes}
          style={style}
          aria-label={alt}
        />
      }
    >
      {picture}
    </LightboxSolo>
  )
}
