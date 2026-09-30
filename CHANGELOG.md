# Changelog

Registry updates are opt-in source updates. Preview with `shadcn add @ag/<item>
--dry-run` or `--diff`; use `--overwrite` only when replacing your installed copy.

## 2026-09-30

### media-spec

- Fix: the resolution sticker's lower band shows its word ("ULTRA HD", "FULL HD"); it was drawn in the band's own colour and read as an empty panel.
- Fix: gold at `vivid`, and every gold badge at `sm`, draws its metal and letters; both were empty boxes.
- `vivid` keeps the chip in its own ink: the frame goes to the full ink and the glow grows, and the word no longer turns white inside a coloured frame. A consumer that relied on vivid reading white sets the kind's ink to white.
- The poster rung's scrim is a plain fill, no backdrop blur: a grid of posters re-blurred every badge on every animated frame.
- A lockup's word stands at the font's cap height: DOLBY's capitals are TrueHD's beside it, and IMAX and ULTRA HD no longer tower over the row. Each lockup's size comes from its measured `cap` (the manifest, see `MarkArt.cap`), not from its width, and uses the CSS `cap` unit. Breaking: `MarkArt.em` is gone (a symbol stands at 1em, a lockup at `1cap / cap`); `Mark`'s `em` prop still overrides. New: `markArt(id, form)`.
- Fix: the `ultra-hd` mark's "HD" is visible. The source artwork drew it in hairlines under a pixel wide at any chip size; it is redrawn at a light weight in the same place, so ULTRA, the spacing and the mark's size are unchanged.

### agent-session

- New: a coding agent's session as data (`AgentEntry`: a prompt, a reply, a tool call with its result; `AgentWork`: how long the turn and the request in flight have run in the world's seconds, the output tokens so far, and screen time in ms, facts each skin words and animates itself; `AgentFinished`: how long the finished turn took), the props every agent skin takes (`AgentViewProps`), `formatElapsed`, elapsed time the way both CLIs say it, and `entryTokens` / `requestTokens` / `formatTokens`, the output a turn counts up (each reply and tool call its thinking and words, a request nothing until its thinking is over).

### clip

- New: anything drawn from a moment, as the facts a driver moves through it by: `Clip` (its length in ms and its `Chapter`s), `progressAt` and `spans`; `chapterSpan(clip, first, last)` for the stretch an act tells, and `progressWithin(clip, span, local)` for a card scrubbed across only its part of a clip. The content's lib makes the clip, a driver moves through it (the player by the clock, a scroll stage by scroll, a still at one moment), the component draws the frame at a progress. One contract, so any content plays in any driver.

### playhead

- New: where a clip is and where it is going, with one clock walking the first to the second while the content is on screen and the tab is visible. Every driver sets the target: `Playback` plays a clip once in view with no controls (`start` where it stands first, `delay` before it plays), the player's bar aims and seeks, and a scroll stage's `cue` (a span to be in, heading to its end, from `chapterSpan`) aims it act by act, so scroll and a bar move one playhead and whichever moved last wins. An aim travels (forward at the clip's pace, backward at 3x, so scrolling back an act unwinds it) and a seek jumps; reduced motion lands every aim at once. `usePlayback(clip, options)` is the clock for a driver of your own. `Playhead` provides the moment and `usePlayhead(progress)` reads it as `{ at, driven }`: an explicit `progress` wins (a still, `driven: false`), else the driver's (`driven: true`, it can change at any moment), and a component placed where nothing moves it throws. So a page composes plain elements, `<Playback clip={clip}><Terminal session={s} /></Playback>`, from a server component too.

### terminal

- Breaking: the terminal draws and no longer plays itself. The in-view autoplay and `duration` are gone: place it inside `<Player clip={sessionTimeline(parseSession(session)).clip}>`, or pass a fixed `progress` for a still.

### terminal-session

- `sessionTimeline(…).clip`: the session as a clip, one chapter per command titled with it.

### scroll-stage

- A scroll stage drives any clip a player plays: an act cues the playhead (`<Player cue={chapterSpan(clip, k)}>`, so scroll and the bar share one story), and a beat's progress scrubs a card directly (`progressWithin`). `clipBeats` and `clipProgress`, shipped earlier today, are gone with that.

### telegram-chat

- Breaking: the chat draws and no longer plays itself. `from`, `until`, `duration` and `afterlifeDelay` are gone, each a driver's job now: wrap it in `<Playback clip={chatClip(script)}>` (with `start={clip.chapters[k].start}` for a story that opens at message k, `delay` for a phone that waits its turn), in a `Player`, or cue it from a scroll stage (`cue={chapterSpan(clip, k)}` is the old `until`); a fixed `progress` is a still. `frozen` stays, for captures with nothing decorative moving.
- `chatClip(script)`: the chat as a clip, one chapter per message at its natural pace titled who and what ("Melon: you have to watch this"), then the afterlife (reactions, late messages) as a last chapter, `later`: it scrubs and replays like the story, and a still at 1 shows it whole. `storyEnd(script)` is where the story ends in it.

### telegram-summary

- Breaking: `from="conversation"` is gone with the chat's own clock. `summaryClip(script)` is the summary's clip and `conversationStart(script)` now returns where the conversation starts in it (ms): `<Playback clip={summaryClip(s)} start={conversationStart(s)}><TelegramSummary script={s} /></Playback>`.

### player

- New: a player for any clip (`<Player clip label><Terminal session={s} /></Player>`: a macos stage, a terminal, a chat; it moves the content's playhead). It is `Playback` with a bar and takes the same `start`, `delay` and `cue`, so a scroll stage and the bar drive one story. The chapter on screen is named beside the time; `captioned` leaves that to content that captions itself (a macos scene). It plays once in view; a thick timeline under the content, cut into its chapters, fills in the accent. Hovering the bar shows that exact frame, with the chapter and the time above the pointer, and a pointer near a chapter's start is pulled onto it (a marker stands at the boundary, the tooltip says so). A click or a drag seeks without losing the play state, a horizontal swipe scrubs, and the bar is a slider: space plays and pauses, ← and → move between chapters, Home and End go to the ends.

### keys

- New: keyboard shortcuts as data. `keys("⌃⌥⌘A")`, `keys("ctrl+alt+cmd+a")` and `keys("← →")` split any notation into the keys pressed, in the Mac's glyphs and order; anything that is not keys (`awake hotkey`, `2h`) is `null`, so a renderer can tell a shortcut from a command. `withKeys(text)` finds the shortcuts inside a sentence.

### kbd

- New: keyboard shortcuts drawn as keys. `<Kbd keys="⌃⌥⌘A" />` in any notation (it throws on a string that is not keys), `<KeysText>` for a sentence with its shortcuts drawn as keys, and `isKeys` for a renderer choosing between keys and code. Nested `<kbd>`, as HTML defines a key combination.

### claude-code

- New: Claude Code's terminal UI drawn from an agent-session: the welcome box, your prompts as full-width grey bars (the only tinted lines, as in the real CLI), `⏺` replies and tool calls with their `⎿` results, the working line as the CLI draws it (`✢ Shimmying… (1s)`, then `(5s · thinking)`, `(14s · still thinking)`, `(25s · thinking more)`, the stage in the verb's colour, and `↓ 2.9k tokens` once the turn has output: the spinner breathing through `· ✢ ✳ ✶ ✻ ✽`, a light band sweeping the verb, a new verb from Claude Code's own list on every request, all a pure function of time), the grey line a finished turn leaves (`✻ Sautéed for 8m 37s`), the prompt box. Reads like a terminal: from the top while it fits, the oldest lines scrolled away once it does not.

### codex

- New: OpenAI Codex CLI's terminal UI drawn from an agent-session: the header box, `›` prompts, `•` replies and `Ran` commands with their `└` output, the working line, the `─ Worked for 2h 14m` rule a finished turn leaves, the composer. Same terminal reading as claude-code.

### macos

- New: a menu bar app performed on a Mac screen. `<Macos timeline art alt />` draws the menu bar with the app's own glyph, the macOS 26 capsule battery (no percentage) and the clock, each item in the system's own padded box so the icons sit evenly apart, the app's real menu (check column, key equivalents, submenus opening to the side with room), a terminal driving it, notification banners, the keyboard shortcut as keycaps, a pointer that travels to whatever the story clicks with the pressed mouse button shown beside the keycaps, and captions, with any shortcut in them drawn as keys (`@ag/kbd`). A story can open a coding agent in the terminal (`agents={{ claude: ClaudeCode, codex: Codex }}`: the page supplies the skins, so this item depends on none of them), and the camera closes in on a glyph before the chord or right-click that flips it. `device="macbook"` puts it on device-frame's MacBook and closes the lid for real when the scene does, and while it is shut the dark panel shows the time passing, large; `device="display"` puts the panel to sleep instead. A camera closes in on the menu bar corner while a menu or banner is up or the glyph has just changed, as far as the measured thing allows. It draws the frame at a moment and nothing moves it on its own: place it inside `<Player clip={sceneClock(timeline).clip}>` to play it, or pass a fixed `progress` for a still. The height never changes while it plays: the caption line reserves the story's tallest caption. The screen is scaled by CSS, not a measure, so the server's HTML is already the opening frame: no blank panel before hydration. `accent` colours the menu highlight and the terminal.
- New: the lock screen. A world with `locked` fades macOS's lock screen in over everything: the wallpaper dimmed, the date and a large rounded clock, the user and a glass password field with Touch ID's hint, Wi-Fi and the battery at the top right. Locking closes an open menu or surface, as macOS does, and the camera never closes in on a glyph behind it.
- New: the app's surface. A `surface` step hangs the app's own rendered popover (a clip in `art.surfaces`: its video, poster, size in points and background) from its glyph at true size, slid inside the screen's edge with its arrow still on the glyph, and plays it in step with the story: forward with the playhead, seeked on a scrub or a still. Opened by the author it is a click on the glyph; the status item stays pressed while it is open, and the camera stays wide.
- New: a desktop picture of its own, an original in the spirit of macOS 26's (Apple's are theirs), on the desktop and the lock screen.
- The time and the date are the viewer's own unless the story sets them: the menu bar and the lock screen read the viewer's clock (English macOS: "9:41 AM", "Tuesday, September 30"). The server's frame shows no time rather than a wrong one, the slot keeps its width so nothing it measures moves, and the browser fills it in at hydration.
- The terminal is as wide as the story's widest line (in the font's own `ch`), between the classic window and the screen's margins, so no line wraps; a story that types nothing shows no terminal, and Finder leads the menu bar.

### device-frame

- New: `MacbookFrame` has a hinge. `lid="open"` or `lid="closed"` and the frame moves the lid itself, on its own curve, whenever the value changes; a number (0 open .. 1 shut) puts it exactly there with no motion, for a caller that owns time (a scrubbed or filmed timeline). The lid's face turns in true perspective (the eye at the hinge, at the distance where a shut lid spans exactly the base's width) and its thickness is painted where that same camera puts it: the lid's own outline raised by the projected thickness, so it follows the rounded corners, is nothing when open, grows as the lid comes down, and shut is the closed laptop's front resting on the base. All of it is `sin()`/`cos()` of one number, so a transition, a scrub and a filmed frame are the same geometry. Without `lid` the frame renders as before, flat.

### macos-session

- New: the timeline a `macos` stage plays, written by the app itself: a scene script played through the app's real engine compiles to steps (world, glyph, command, output, menu, hover, press, key, banner, caption), so every word and pixel on stage is the app's. awake's `awake-scene` is the first compiler. The lib owns pacing and nothing else, and paces for reading: every step says what it asks of the viewer (a line to read, a menu to scan, the lid to watch close), and before the script's next act the player waits until all of it has been taken in, while the app's reactions follow their cause at once. An agent's prompt sets it working, as the CLIs do, until the story says it is done. What happens behind a shut lid takes no screen time: the world's clock jump plays as a time-lapse (`lapseAt`: the clock and battery run from before to after, the time gained counts up), and when the lid opens the viewer is given time to read what the agent did while it was shut, then the banners posted meanwhile. `sceneClock(…).clip` is the story as a clip, its chapters, one per caption, starting where the thing each tells begins; the caption line shows the chapter from that moment, so a player's timeline and the stage always name the same chapter. `sceneClock` lays the steps out in milliseconds, and `frameAt(timeline, clock, ms)` is a pure fold to the whole stage at one instant, so scrubbing, stills and autoplay are one function.
- New: `WorldState.locked` (the lock screen; `LOCK_MS`), `WorldState.date`, the `surface` step and `Art.surfaces` (`Surface`); `Frame.surface` and `Frame.lockSince`. chill's `chill --demo scene` is the second compiler, the first to hang its own rendered popover.
- Breaking: `WorldState.clock` is optional. A story that sets it in every world step keeps its story time (time-lapses, an agent's hours); one that never sets it has no time passing and shows the viewer's; setting it in some steps and not others throws.

## 2026-09-11

### media-spec

- New: the media format vocabulary as typed chips wearing the real marks.
  `PictureChip`, `SoundChip`, `TierChip`, `LangChip`, `CutChip` and the composed
  `MediaSpec` strip take values (`resolution`, `range`, `audio`, `tier`,
  `lang`, `cut`), never label strings. The item ships two files: the chips and
  `media-spec-marks.tsx`, the artwork inlined as single-ink SVG (Dolby Vision,
  Dolby Atmos, TrueHD, Dolby Digital and Plus, dts, DTS-HD MA, FLAC, Opus,
  Blu-ray, Ultra HD Blu-ray, DVD, IMAX, the Spain flag, plus HDR10 / HDR10+ and
  tabler's 4K / 8K / HD / SD badges kept as references). A chip is ONE mark
  standing frameless; a drawn badge (a rounded box with the word, to the HDR10
  badge's proportions) stands in for every value with no artwork (a resolution
  as the disc-case badge, "4K" over "ULTRA HD"; HDR10, HDR10+, HLG, channels,
  Remux, WEB-DL, DTS:X, AAC, a language, a cut). Each axis is a group of one to
  three chips ([resolution] [range], [object] [codec] [channels], [disc]
  [Remux], [flag] [name]); at `md` the lockups, at `sm` the brand symbols and
  the small badges. `emphasis` is a
  ladder of light named for its look (`ghost · plain · lit · vivid`: opacity,
  resting, a soft glow in the badge ink, a stronger glow at full brightness; a
  step never adds a shape),
  `trailing` is a slot after an axis and `adornments` fills it per axis on the
  strip; what either means is the consumer's. `langLabel(tag, locale)` names a
  language: a small variety table first (`es-ES` Castilian, `es-419` Latin
  American Spanish), else the language subtag's display name through
  `Intl.DisplayNames` with the region left to the flag, else the tag; `LangChip`
  takes a `label` override. `tone="brand"` paints only marks, in their official
  colour; a near-black brand keeps the ink. `tone="gold"` is the disc-case
  sticker: near-black boxes with a metallic gradient on stroke and letters and
  the brand marks in ink beside them (flat mid gold at `sm`); the metal is
  retuned through `--ag-media-gold-hi`, `-mid`, `-lo` and `-glint`. `Mark` takes
  a `paint` (any CSS background, applied through a mask). `TierChip` takes
  `resolution` so a 2160p disc
  wears the Ultra HD Blu-ray mark. No dependencies: with nothing set every chip
  is monochrome in the surrounding text colour; a consumer colours it through
  `--ag-media-picture`, `-sound`, `-tier`, `-lang`, `-cut` and `-scrim`. Every
  chip carries `data-kind`, `data-facet`, `data-emphasis`, `data-size` and
  `data-mark`. `Mark`, `MARKS`, the label functions and the vocabulary tuples
  are exported.

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
