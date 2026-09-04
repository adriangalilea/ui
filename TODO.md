# TODO

## og and link previews as a registry item

Every site re-solves the same thing by hand and it always eats an afternoon: the
`opengraph-image` route, fonts loaded for satori, a card layout that survives the
crop every platform applies (Twitter 2:1 vs iMessage vs Telegram vs Slack), the
wordmark overlay, the fallback when a page has no cover, and checking the result
in each unfurler.

Vehicle: the registry, not ts-utils. The generator is React-shaped (satori renders
JSX through `ImageResponse`), so it cannot live in a runtime-agnostic utils
package; a shadcn item can ship files at explicit targets
(`registry:file` → `app/opengraph-image.tsx`, `lib/og.tsx`), which is exactly a
template plus a layout library. ts-utils only ever gets the pure parts if any
appear (text fitting, title truncation rules).

Shape to build:

- `og` item: `lib/og.tsx` = card layouts as components for `ImageResponse`
  (cover card, quote card, wordmark-only card, terminal-still card), one font
  loader (Geist, Geist Mono, Courier Prime from the same next/font sources the
  site already uses), the safe-area rules per platform baked into the layouts,
  and the size constants. Plus a `registry:file` template
  `app/opengraph-image.tsx` that reads a page's title, description and cover and
  picks the layout.
- A demo page that renders every layout at 1200x630 with the crop overlays of each
  platform drawn on top, so a card is designed once against all of them.
- Seeds: adriangalilea.com `lib/og.tsx` (quote and cover cards with local Geist
  TTFs), the garden's `app/icon.tsx` (SPROUT_PATHS through `ImageResponse`) and
  its `app/dev/mock/cover` page (the xtldr phone trio framed for the link
  preview).
