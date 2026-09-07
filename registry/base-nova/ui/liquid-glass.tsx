import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

/** CSS glass: a translucent body, inset reflections, and a directional rim.
 * Keep the center clear enough for the backdrop to show through. The decorative
 * pseudo-element follows the radius without clipping content or focus rings.
 * Use mask longhands: Tailwind emits the mask shorthand after mask-composite,
 * which resets exclude to add and paints the highlight over the entire surface.
 */
export const glassVariants = cva(
  [
    "relative isolate bg-clip-padding",
    "backdrop-blur-[var(--glass-blur,6px)] backdrop-saturate-125",
    "shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28),inset_1px_2px_4px_-2px_rgb(255_255_255/0.22),inset_-1px_-2px_4px_-2px_rgb(255_255_255/0.11)]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-[0.5px] before:content-['']",
    "before:bg-[linear-gradient(135deg,rgb(255_255_255/0.26),transparent_28%,transparent_72%,rgb(255_255_255/0.14))]",
    "before:[mask-image:linear-gradient(#000_0_0),linear-gradient(#000_0_0)] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]",
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:[&>svg]:opacity-40",
    "forced-colors:border forced-colors:before:hidden",
  ],
  {
    variants: {
      tone: {
        auto: "bg-[var(--glass-tint,rgb(238_241_245/0.64))] text-foreground backdrop-saturate-100 backdrop-blur-[var(--glass-blur,5px)] shadow-[0_0_0_0.5px_rgb(24_32_44/0.08),0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22),inset_0_1px_0_rgb(255_255_255/0.7),inset_0_-0.5px_0_rgb(24_32_44/0.2)] dark:bg-[var(--glass-tint,rgb(16_16_18/0.6))] dark:backdrop-saturate-125 dark:backdrop-blur-[var(--glass-blur,6px)] dark:shadow-[0_4px_16px_-6px_rgb(0_0_0/0.28),inset_1px_2px_4px_-2px_rgb(255_255_255/0.22),inset_-1px_-2px_4px_-2px_rgb(255_255_255/0.11)] supports-[not(backdrop-filter:blur(1px))]:bg-background/95",
        light:
          "bg-[var(--glass-tint,rgb(238_241_245/0.64))] text-zinc-950 backdrop-saturate-100 backdrop-blur-[var(--glass-blur,5px)] shadow-[0_0_0_0.5px_rgb(24_32_44/0.08),0_2px_5px_-2px_rgb(24_32_44/0.24),0_8px_20px_-8px_rgb(24_32_44/0.22),inset_0_1px_0_rgb(255_255_255/0.7),inset_0_-0.5px_0_rgb(24_32_44/0.2)] supports-[not(backdrop-filter:blur(1px))]:bg-zinc-100/95",
        dark: "bg-[var(--glass-tint,rgb(16_16_18/0.6))] text-zinc-50 supports-[not(backdrop-filter:blur(1px))]:bg-zinc-950/95",
      },
      shape: {
        surface: "",
        circle: "inline-grid size-10 shrink-0 place-items-center rounded-full",
        pill: "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2",
        bar: "inline-flex items-center gap-1 rounded-full p-1.5",
        card: "rounded-3xl p-5",
      },
    },
    defaultVariants: { tone: "auto", shape: "card" },
  },
)

export type GlassTone = NonNullable<VariantProps<typeof glassVariants>["tone"]>
export type GlassShape = NonNullable<
  VariantProps<typeof glassVariants>["shape"]
>

/** Apply the material to an existing element. Merge overrides with cn(). */
export function glass(shape: GlassShape = "card", tone: GlassTone = "auto") {
  return cn(glassVariants({ shape, tone }))
}

/** Optional CSS controls; they can also be inherited from a parent or set in Tailwind. */
export type GlassStyle = React.CSSProperties & {
  "--glass-blur"?: string
  "--glass-tint"?: string
}

export type GlassProps<T extends React.ElementType = "div"> = {
  /** Render a native element or a component that forwards className and ref. */
  as?: T
  shape?: GlassShape
  tone?: GlassTone
  className?: string
  style?: GlassStyle
} & Omit<
  React.ComponentPropsWithRef<T>,
  "as" | "shape" | "tone" | "className" | "style"
>

/** Style with Tailwind, compose with `as`, and pass native props/ref directly. */
export function Glass<T extends React.ElementType = "div">({
  as,
  shape = "card",
  tone = "auto",
  className,
  ...props
}: GlassProps<T>) {
  return React.createElement(as ?? "div", {
    "data-slot": "glass",
    "data-shape": shape,
    "data-tone": tone,
    ...(as === "button" ? { type: "button" } : {}),
    ...props,
    className: cn(glassVariants({ shape, tone }), className),
  })
}
