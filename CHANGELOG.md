# Changelog

Registry updates are opt-in source updates. Preview with `shadcn add @ag/<item>
--dry-run` or `--diff`; use `--overwrite` only when replacing your installed copy.

## 2026-09-11

### media-spec

- New: the media format vocabulary as typed chips. `PictureChip`, `SoundChip`,
  `TierChip`, `LangChip`, `CutChip` and the composed `MediaSpec` strip take
  values (`resolution`, `range`, `audio`, `tier`, `lang`, `cut`), never label
  strings; the chip owns the words ("4K · Dolby Vision", "TrueHD Atmos 7.1",
  "castellano"). Provenance is a fill ladder, `claim · verified · measured ·
  delivered`, and `delta` adds a ▲ = ▼ glyph for a candidate row. No
  dependencies: with nothing set every chip is monochrome in the surrounding
  text colour; a consumer colours them through `--ag-media-picture`, `-sound`,
  `-tier`, `-lang`, `-cut`, `-better`, `-worse`, `-on-ink` and `-scrim`. The
  label functions (`pictureLabel`, `soundLabel`, `tierLabel`, `langLabel`,
  `cutLabel`, `isLossless`) and the vocabulary tuples are exported.
- New: the chips wear brand marks. The item now ships a second file,
  `media-spec-marks.tsx` (Dolby Vision, Dolby Atmos, TrueHD, Dolby Digital and
  Plus, dts, DTS-HD MA, HDR10, HDR10+, Ultra HD, FLAC, Opus, Blu-ray, Ultra HD
  Blu-ray, DVD, IMAX, the Spain flag), inlined as single-ink SVG. A mark replaces
  the word it stands for and the rest of the label stays text: at `md` the
  lockup ("4K" beside the Dolby Vision logotype, the Dolby Atmos logotype beside
  "TrueHD 7.1", the Blu-ray logotype beside "Remux"), at `sm` the symbol (the
  double-D beside "DV" or "Atmos", the dts mark beside "X", the HDR10+ badge
  alone). `tone="brand"` paints only the mark in its official colour; a filled
  provenance and a near-black brand keep the ink. `TierChip` takes `resolution`
  so a 2160p disc wears the Ultra HD Blu-ray mark; `MediaSpec` passes it. The
  typed label stays the accessible name. `Mark` and `MARKS` are exported for a
  consumer that wants a mark on its own.

## 2026-09-09

### prepare-media

- Breaking: the `prepare-media-cli.ts` file is no longer part of the item; call
  `prepareMedia` from your own script. `tsx` leaves the item's dependencies with it.
- Breaking: `playback` takes only `"boomerang"`. `"forward"` named the default and
  chose nothing; leave the option unset for a video prepared as it plays.

### telegram-chat

- Breaking: the `options` message field and the inline-results popup it drew are
  removed. A choice is shown as sent messages, one per form, the way the language
  gallery does; remove `options` from scripts when updating.
- `frame="none"` no longer carries reset rules for phone chrome. A bare frame draws
  no shell, so there was nothing for them to undo.
- Removed, nothing read them: the `--tg-phone`, `--tg-phone-band`,
  `--tg-phone-chamfer`, `--tg-phone-button`, `--tg-lift`, `--tg-island` and
  `--tg-border` custom properties. `device-frame` draws the phone and owns those
  colours. `--tg-message-gap` is internal now: the gap between messages is the
  client's geometry, not a knob.
- A story scrubbed back below completion rewinds its afterlife with it: reactions
  and late messages land again when it completes again.
- A profile video loops while on screen, as the client does; it had stopped after
  one play.

### scroll-stage

- Once mounted, only the live layout stays mounted: the pinned stage below `lg` or
  under reduced motion, the `stacked` alternative above it, is unmounted instead of
  hidden, so a hidden stage's phones, observers and timers no longer run.
- Removed, nothing set it: the `--stage-align` custom property. A pinned stage
  centres its scene.

### card-gallery

- The bleed fade is as wide as the reserved rail, capped at 2rem, so a rail that
  resolves to zero (a custom property below its breakpoint) fades nothing.

### avatar

- The lightbox trigger carries its anchor-content lint exemption in the source, so
  a consumer's copy no longer diverges to add it.

### editor

- Breaking: the `upload` prop is read once, at mount, alongside the document and the
  schema. Changing it on a mounted editor no longer takes effect; give the editor a
  new `key` to remount it with a different uploader.

### Installation and updates

- Only the items that draw with the studio tokens (`code`, `reveal`, `quote`,
  `lightbox`) depend on `@ag/tokens`. Install it explicitly once; the README's
  first command does.

### Registry website

- Registry requests and command copies are rate limited per address before they
  reach the collector; the lab pages are marked noindex; the home page states that
  visits are counted with Vercel Web Analytics.

### Removed surface nothing used

- `scrims`: the `topProps` and `bottomProps` props. Style the overlays through
  `className` and the `scrim-top` / `scrim-bottom` slots.
- `preview-picker`: `optionClassName`; `theme-toggle`: the `fallback` prop (an
  unresolved control shows `system`) and the `THEMES` export.
- `quote-card`: the `faceShare`, `faceFeather` and `blockAt` still options; the
  fusion and the block position are the module's constants, as the card's own
  geometry requires.
- `lightbox-motion`: the `QUICK` tuning; `lightbox-motion`'s `springStep` and
  `settled` and `lightbox-wheel-phase`'s `released` read are internal now, the
  binder never decides on a release.
- `terminal-session`: `mix`, `BLACK`, `WHITE`, `LAND_MS`, `BLANK_MS` are internal.
- `tokens`: `--dur-4`; three durations remain. `reveal` now declares its
  dependency on `tokens` instead of carrying literal fallbacks.

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

- A file that is not an image is refused before it uploads, as a job error with
  the file's name. A cancelled toolbar upload rejects Wordgard's promise instead
  of handing the dialog an empty URL.

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
