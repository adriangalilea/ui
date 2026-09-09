# Changelog

Registry updates are opt-in source updates. Preview with `shadcn add @ag/<item>
--dry-run` or `--diff`; use `--overwrite` only when replacing your installed copy.

## 2026-09-08

### image

- Standalone `AnimatedImage` previews receive keyboard focus without requiring an
  overlay control.

- Added a Next.js image component with reserved dimensions, prepared blur previews,
  and a short reveal after decoding. It supports self-hosted Next optimization,
  custom loaders, reduced motion, and rendering without JavaScript. `className`
  styles the frame; `imageClassName` styles the pixels.
- Isolated internal pixels from prose typography. Placeholders now receive blur
  and share the final image's fit and position. Use `className="w-full"` for
  full-width articles; dimensions reserve proportions rather than forcing a crop.
- Added `AnimatedImage` in `image-animation`: poster-first native animation on
  hover/focus, visibility on touch, explicit pause, and reduced-motion support.
  Stopping returns to the poster; native GIFs do not offer frame-accurate seeking.
- `AnimatedImage` controls are now opt-in. Add `controls` to retain the play/pause
  button; the default preview has no overlay control.

### video

- Forwards its native video element ref. `sizes` describes responsive poster width
  instead of assuming every video occupies an 800px column.

- Added native playback and silent cover previews with posters, explicit pause,
  visibility handling and race-safe hover changes. `playOn="visible"` supports
  article covers; normal players retain browser controls, sound and caption tracks.
- Cover previews are unadorned by default. Opt into a play/pause button with
  `controls`.
- `playOn="visible-once"` plays a cover once on arrival, holds its final frame,
  and replays on a fresh hover/focus. With `loop`, those later interactions loop
  until the pointer/focus leaves; the initial arrival still plays only once.

### media-asset

- Added a storage-independent metadata contract and response validator.

### liquid-glass

- Removed the unused `glass(shape, tone)` alias. Use
  `glassVariants({ shape, tone })` when applying glass styles without `Glass`.

### prepare-media

- Added shared Node preparation and a CLI. Preserves original image bytes,
  measures orientation, retains transparency in previews, and generates posters.
  Video is opt-in and requires FFmpeg/ffprobe. The caller uploads returned files;
  preparation never writes to a database or chooses a storage provider.
- `playback: "boomerang"` (CLI `--boomerang`) explicitly prepares GIFs or videos
  of 0.1–10 seconds into silent forward/reverse MP4s for the same video component.

### upload

- Added a typed uploader contract, multipart transport, and a React hook with
  cancellation, retries, progress, preparation status and local preview cleanup.

### editor

- Toolbar uploads share paste/drop pending-upload protection, retry and
  cancellation. Publishing cannot race a newly started upload.

- Added a Wordgard editor with scoped styles, HTML in/out and an injected uploader.
  Paste/drop uploads follow document edits, preserve batch order, offer retry/cancel,
  and prevent publishing pending uploads. Set `images={false}` for text-only formats.

### lightbox

- Responsive images now open from their loaded `currentSrc`, avoiding a second
  thumbnail download when the browser selected a different rendition. The photo
  demo uses local originals and the new image loading treatment.
- Dismissal clicks no longer bubble through the portal to a containing card.

### Registry website

- Connected production website visits to Vercel Web Analytics. Installed components
  contain no analytics; registry requests are not reported as completed installs.
- Added an Updates page and component-specific release notes next to installation
  commands. Update instructions and previews are available on every component page.

### telegram-chat

- Playback responds when reduced-motion preferences change while mounted.

- Fixed resize-observer feedback during focus fitting. Viewport scroll animations
  now stop when the chat unmounts, and autoplay pauses while the browser tab is hidden.
  No prop changes are required.
- Breaking: removed the unused `scrub` and numeric `replay` props. Drive animation
  explicitly with `progress` for scroll-linked playback, including reverse movement.
  Omit `progress` for one-shot autoplay. Autoplay now runs at its configured pace;
  page scrolling no longer changes its speed. Remove the old props when updating.
- Fixed focus-fit sizing oscillating between adjacent pixel widths at some viewport
  heights. No API migration is required for this fix.
- Added `fit="focus"` with `viewport="container"` to size a phone around its focused
  exchange and bottom frame. The parent must provide a definite height.

### Installation and updates

- Local contributor installs now use shadcn for the full dependency graph, file
  placement, CSS, and updates. The helper no longer manually copies files afterward.
- Fresh-install and update checks cover standalone and workspace consumers,
  including dependency files, styles, and preservation of the consumer's `cn` utility.
