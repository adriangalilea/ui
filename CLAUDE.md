# ui

A public shadcn registry (`registry.json` at the root, items under `registry/base-nova/`, `shadcn build` → `public/r/*.json`) plus the Next demo site that serves it and is the lab for every primitive. Namespace `@ag`. Consumers copy items and own the copy; this repo is the source. The shape is shadcn's own `registry-template-v4`, on Base UI + Tailwind 4 + `base-nova`.

## Rules

- Every item has a `<name>.demo.tsx` beside its source and an entry in `app/demos.tsx`; `scripts/validate-registry.ts` refuses anything else. `lib/*` files are framework-free (no react, no DOM), asserted.
- **Items meant to be used together share the head item's name**: `terminal` + `terminal-session`, `lightbox` + `lightbox-motion` + `lightbox-actions`, `telegram-chat` + `telegram-summary`. They sort together, they read as one thing, and `registry.json` keeps them adjacent. A part stays its own item only when something installs it ALONE (a build script renders a still with `terminal-session` and no React); otherwise it belongs in the head item's `files`, the way six engine files ship as `lightbox-motion`.
- **Usage is never written by hand.** An item page renders its own `<name>.demo.tsx` verbatim, read at build time, under "the demo above, verbatim". Prose usage beside a demo drifts the first time either is touched; the same file cannot. So a demo is also the documentation: write it as the code you would want copied.
- **The index is derived, never hand-kept**: `FAMILIES` in `app/registry.ts` reads `registryDependencies`, leads with the item you would add and nests what comes with it, so the page cannot drift from what `shadcn add` really installs. A demo shows the whole family working together where that is the point (the terminal page draws one script live AND as a still, which is the claim the pair exists to make).
- Imports inside items use `@/registry/base-nova/{ui,lib,hooks,blocks}/...`; the CLI rewrites them to the consumer's aliases. A `.css` beside a component is imported relatively (`./x.css`) and ships as a second `registry:ui` file.
- Motion is CSS-first: scroll-driven animations (`animation-timeline`) drive numbers into custom properties; React state changes on checkpoints, never per frame. Reduced motion renders the completed state.
- Brand rules from `untitled/CLAUDE.md` bind: lowercase names, three type voices, 8px doubling rhythm, monochrome alpha ladder, no em dashes, nothing animates forever.
- No Radix. Base UI has no `asChild`; use `render={<a />}`.

## Distribution

The site deploys on every push to main (Vercel project `ui`, team adriangalileas-projects, git-connected, deployment protection OFF so the registry is public) at `https://ui.adriangalilea.com` (DNS-only CNAME `ui` → cname.vercel-dns.com in the adriangalilea.com Cloudflare zone; `ui-adriangalileas-projects.vercel.app` is the same deployment), and consumers map `@ag` to `https://ui.adriangalilea.com/r/{name}.json`. `public/r/*.json` is COMMITTED as well (`shadcn build` runs inside `mise check` and inside the Vercel build), so `https://raw.githubusercontent.com/adriangalilea/ui/main/public/r/{name}.json` is the same registry before a deploy finishes. A stale build shows up as a diff. Vercel needs `ENABLE_EXPERIMENTAL_COREPACK=1` (set) to honour `packageManager` pnpm 11; without it the build ignores `allowBuilds` and `overrides`.

`registry:file` items (tokens) need an explicit `target`; the consumer imports `app/tokens.css` from its globals.css once.

## Lightbox

`ui/lightbox.tsx` is the binder. The framework-free libs, each proven by its `scripts/examples/lightbox-*.ts` (run by `mise check`): `lib/lightbox-motion.ts` (fit, source view, zoom, rubber, springs, flight sampling, `frameAt`), `lib/lightbox-flight.ts` (the flight as a table plus a `Clock`: plan, read, landing rule), `lib/lightbox-hold.ts` (held keys to a view per frame), `lib/lightbox-wheel.ts` (the wheel session as a reducer: ticks in, session and effects out; the binder owns the silence timer and the track's own swipe state), `lib/lightbox-gesture.ts` (the pointer state machine as a reducer, plus the tap ladder), `lib/lightbox-actions.ts` (the key table: keys, layers, `resolve`, the escape ladder, `sheet()`). The motion libs ship as one registry item, `lightbox-motion`. Every pose move is a Web Animation sampled from the spring (compositor properties only: transform, and the cover crop as two counter-scaled transforms); a gesture reads the animation's clock and takes over. React state changes on checkpoints.

- **WebKit hands `Animation.currentTime` back a hair under the duration** (seconds in, milliseconds out): a frame table indexed by time treats anything within `TIME_EPS` of the last frame as the last frame, or every flight on iOS fails to land and the frame loop dies. `frameAt` clamps its index and screams on a non-finite time.
- `debug` prop (demo: `?debug`) draws the engine's trace on the stage: pointer, gesture and dispatch decisions with the live pose, the layer's computed matrix, the live animation count, and page errors with a stack. This is how iOS bugs get diagnosed; production source maps are on for the same reason. **Instrumentation must never read the DOM per event.** `getComputedStyle` and `getAnimations` on the layer a gesture is writing to force a style recalc that flushes the write, a hundred times a second on a trackpad, and the trace becomes the thing it is measuring: the screen's truth is read ONCE a frame, in the rAF that batches the lines.
- **The trace format is how to tell which build is being tested.** More than one report has been of a version that was never deployed; a changed line format settles it in a glance.
- iOS selects an image on a double tap unless the stage takes the default on pointerdown and the media carries `user-select: none` and no touch callout.
- Safari's Tab visits only fields: the dialog walks Tab over its own tabbables.
- History is replace-only (`#lb=id`); pushState made the iOS edge swipe double-animate a close. Android Back closes via CloseWatcher.
- Only a HOLD settles the zoom state on keyup (`releasePan` checks the key was held). A tapped + or - lifts while its spring is a few frames in; settling there recorded a mid-flight zoom, so `-` to fit left the chrome in zoomed mode.
- Headless Chrome over CDP (bun scripts, `/tmp/lb-*.ts` shape) is the regression rig: drive the demo with `?debug`, read the trace and the active layer's computed matrix, run the same script against the deployed site to diff behavior. A CDP keyup lands the same ms as the keydown, which is how the settle bug surfaced.
- The architecture debt and the extraction plan are in the todo below; do them before adopting the item in a site.

### The slide track

The track is a real scroll container. **Touch is the browser's** (`touch-action: pan-x`, with `scroll-snap-type: x mandatory` + `scroll-snap-align: center` + `scroll-snap-stop: always` landing it): the platform knows when fingers leave the glass and both engines enforce snap-stop on momentum, on the compositor. **The wheel is the engine's**, because the platform's own settle is ~950 ms across a slide in Chromium (deltas decaying 0.92 a frame until the last is sub-pixel) and no faster on macOS WebKit, which reads as a different, slower app than the arrow keys and parks a slide visibly off centre on the way. `data-stepping` stands the CSS magnets down wherever the engine is driving.

**The rule for a wheel gesture, and the reason it survives where two rewrites did not:** the slide is a FUNCTION of total travel, decided with the hand still on the glass. `swipeSlides` gives one slide as soon as the fingers are `SWIPE_COMMIT` (0.18) of the way, and one more for every whole slide after that, so travel and slides stay one for one at any length. Then `glideTo` at 220 ms nominal (130–300 bounded), leaving at the speed the track already had.

Two failure modes, both from a counter that resets on each commit, both live in the git history and neither is allowed back. Let a reset counter pay repeatedly and every 0.18 of finger buys a whole slide: a **5.5× gain wearing a threshold's clothes**, one motion jumping five. Cap it at one commit instead and a long deliberate drag is worth exactly what a flick is worth.

**Nothing detects a release**, which is the question that made every earlier version a lottery: the web exposes no gesture phase to page JS (macOS reports one to the engine — Chromium reads `is_in_inertial_phase` — but not to us). The phase detector is asked one question, "is this a coast", and the answer only decides when the hand stops paying. Being wrong costs a slide of travel, never a wrong destination. A throw whose hand never travelled far enough is still worth one, by projecting where the momentum was heading (UIKit's rule); the coast itself is never counted, because it carries several slides of deltas and the reader can no longer steer.

**One gesture is one slide unless the hand asks for more.** Every reference implementation caps a *flick* at one, and none uses the magnitude of the throw to decide how far to go:

| | commits when | how far | landing |
|---|---|---|---|
| iOS `UIScrollView` paging | projected destination past the midpoint; project with `v · d/(1−d)`, `d = 0.998` → **`v[px/ms] × 499`** | one page | spring from the release velocity (WWDC18 803: project, snap to nearest, hand velocity to the spring) |
| Android `PagerSnapHelper` | any fling over `minFlingVelocity`; **velocity's sign only, magnitude unused** | first page past the centre, so exactly one | `MAX_SCROLL_ON_FLING_DURATION` = **100 ms** |
| Swiper | ≤ `longSwipesMs` **300 ms** → one slide, distance ignored; longer → past `longSwipesRatio` **0.5** | one slide | fixed `speed` **300 ms** |
| Embla | `|force × 400|` (touch) over `clamp(20% of viewport, 50, 225)` px | `byIndex(current ∓ 1)`, exactly one | friction integrator, `duration` 25, `friction` 0.68 |
| WebKit snap | destination predicted by the platform momentum calculator (fallback: **`16.7 × first momentum delta`**) | `scroll-snap-stop` decides | cubic Bézier whose initial tangent is the reader's own direction, over an exponential progress curve fitted so the first frame matches their last delta, clamped to 10–50% of the remaining distance |
| Chromium snap fling | projects `delta / (1 − decay)` once decay < **0.96**; legacy fallback `delta × 25` | `scroll-snap-stop` decides | per-frame deltas decaying **0.92** each 16 ms frame |

Three things follow, and they settle the questions that used to sit here:

- **The drag is never amplified.** Embla and Swiper both track the finger 1:1 (`touchRatio: 1`); the trackpad's own acceleration curve is already applied by the OS. The `2.6×` gain that was here was a second acceleration on top of one that was already there.
- **A move decays, it does not accelerate into place.** WebKit and Chromium both ease out. "It slows down then snaps" is a handoff that does not match the reader's speed, not evidence that the curve should invert; `GLIDE_ENTRY` is what fixes it, by leaving at the speed the track already had.
- **0.96 is the right threshold for "the hand is gone".** Chromium's `kMaxDecayFactor` and the vendored wheel-gestures detector agree on it independently.

**A wheel pan STOPS at its bound; only a pointer drag rubber-bands.** A band is for direct manipulation, where the image is under a finger and the give is what says "this is the end". On a trackpad nothing is under the finger, so all it buys is a picture frozen at the cap while the reader keeps pushing, and a long way home afterwards. The accumulator is clamped with the pose, or panning back has to unwind the debt before anything moves. The bound is the overflow plus `PAN_INSET` (64) so an edge can be brought INSIDE the viewport: stopping exactly where the picture ends gives no sign that it ended, only a picture that will not move.

What else the engine owns: which slide is current (`scrollsnapchange`, Chrome 129+/Safari 18.2+, with `scrollend` and a `scroll` timer as fallbacks), which slides carry pixels (two either side of where the reader actually is, not of the committed index, or a fast gesture crosses a slide that is still a grey hole), and the discrete moves (arrows, thumbnails, steps), which count from where the track is HEADING rather than from the committed index, or a fast run of presses all asks for the same slide.

Never again, each of these having been tried and shipped and felt: a drag gain; a commit counter that resets; a settle watchdog; a momentum detector deciding WHERE the track goes; a rubber band on the wheel pan. If the track feels wrong, the fix is in `swipeSlides`, in the CSS declarations, or in what the engine reads — reach for a constant last, not first.

## Verbs

`mise dev` (:3100) · `mise check` · `mise build` · `mise add <item> [consumer-dir]` (builds, then `shadcn add` from the local `public/r`). package.json keeps `build` for Vercel only. Runnable examples live in `scripts/examples/` (`bun scripts/examples/session-still.ts`), never inside a lib file.

## Supply chain

pnpm's 7-day quarantine and no-downgrade trust policy apply. `pnpm-workspace.yaml` pins `fastq` to 1.20.1 because 1.20.2 shipped without provenance; drop the override once 1.20.3 clears quarantine (`deps overrides --removable`). The shadcn CLI version is whatever the quarantine admits, not `latest`. shadcn 4.19 wants the npm package `cn` (a name shadcn took over on 2026-09-01); under the quarantine that resolves to the 2013 Chuck Norris jokes CLI, so `lib/utils.ts` is the classic clsx + tailwind-merge `cn` and the package is not a dependency.

## todo

### lightbox

The engine is extracted: `lightbox.tsx` is the binder (DOM listeners in, effects out, React state at checkpoints), and every rule lives in a lib that runs in bun.

**Signed off on macOS Chrome, and wants soak time before it is adopted anywhere.** The gestures were settled by feel, in the browser, over many rounds; live with it for a while before trusting it in a site.

Left on the item: the demo streams a 17.8 MB trailer from blender.org on every open (host a short clip on the site); Safari frame pacing is unmeasured (needs Develop → Allow Remote Automation, then WebDriver); the sign-off list is `unverified` for android chrome and macos safari.

### then: adopt, wave 2, wave 3

1. adriangalilea.com prose figures (retire its `components/lightbox.tsx`), the garden's feature stills, videoclub.
2. `scrollspy` (scroll-intent stand-down), `page-exit` / `page-enter` (the faked cross-origin morph: exit animation, Speculation Rules prerender with `Supports-Loading-Mode: credentialed-prerender` on the subdomain, entrance), `keymap` + `cursor-list` / `cursor-grid` (swift-utils Keymap; the lightbox's action table is the first client).
3. `charts` + `chart-frame` (adriangalilea.com's wrappers are the taste anchor), `particle-charts` as the opt-in playful voice, `narrated` (Sonoscript: real times only, click to seek, opt-in follow).
4. `theme` (dark mode is DEAD today, see below), `checklist`, `kanban`, `code-scrolly`.
5. The garden landing (a static grid under a fog that promises content), then later: cover-image with blur and grain, `magic-input`, the media-library kit for videoclub and lore.

### theme, and the fact that dark mode is currently DEAD

`app/globals.css` carries a full `.dark` palette and `@custom-variant dark (&:is(.dark *))`, and **nothing anywhere adds the `.dark` class**. No provider, no toggle, not even a `prefers-color-scheme` fallback. So every dark rule in this repo has never rendered: `code.css`'s `.dark .ag-code span` means the code block's dark half, one of the two themes shiki bakes into every token, has never been seen. Treat all dark styling as unverified until there is a way to turn it on.

Wanted: dark and light everywhere in the site and the lab, with a toggle, and the toggle offered as an item if nothing off the shelf fits.

- **The flash is the whole problem.** A theme read in an effect paints light first and then corrects, which is the flicker every naive implementation has. It has to be resolved before first paint, from a tiny blocking script in `<head>`, and the server must not render a guess.
- Three states, not two: light, dark, and FOLLOW THE SYSTEM, which is the default and the one most toggles get wrong by collapsing to a boolean. It also has to keep following when the system changes while the page is open.
- `next-themes` is the obvious answer for the site and is worth taking; the question is only whether the toggle itself should be an item. If it is, it cannot depend on next-themes, since a consumer may have any provider: it takes the current theme and a setter.
- The tokens item ships light only today. If a consumer is meant to get dark, the palette belongs in `theme/tokens.css` rather than living in this site's `globals.css`, which is a fork waiting to drift.

### code-scrolly

Scrollytelling over `code`: prose steps on one side, ONE pinned code block on the other, and the lines it marks change as each step arrives. Code Hike's scrollycoding is the reference for the shape.

- **The pieces already exist and must be reused, not rebuilt.** `scroll-stage` is the pinned stage; `code`'s `highlight="2,5-6"` prop was written for exactly this, so a step names its lines from outside and the source stays one unedited file. If a step needs a different file rather than different lines, that is a swap of the whole block, not a second mechanism.
- **The marks move, they do not cut.** Going from one step to the next animates the marked band; a hard swap between two highlighted states reads as a flash and loses which lines were involved. The line geometry is known at build time, so this can be a transform rather than a re-render.
- Long files need the block to SCROLL to the marked lines when they are off screen, or a step silently marks nothing the reader can see.
- Reduced motion, and narrow screens, render it as plain stacked steps with a code block each: no pinning, no travel, the same content in the same order.
- Name follows the family rule so it sorts with `code` and pulls it in.

### checklist

`terminal` + `terminal-session` again, for a list instead of a session: **one source, drawn live and drawn as a still, and the two can never disagree.** A framework-free lib parses a script into items and renders them as SVG; the React component renders the same items in the DOM. That is what lets a feature card's media be a still of the real component (`pnpm media`, the way trash's terminal stills work) while the page shows the live one.

- **SVG, never a raster still.** Text stays selectable and searchable, and it scales without a second export. Selectable in BOTH renderings, live and still: a checklist nobody can copy out of is a picture of a checklist.
- **interactive or frozen.** Frozen is the default for media and for a record of what was done; interactive checks and unchecks. Frozen is not disabled: text stays selectable, links stay clickable, nothing is greyed out. A `disabled` attribute would say "not yours to use" when the truth is "this already happened".
- Item states worth having beyond done/not-done: in progress, blocked, dropped. A struck-through dropped line says more than a missing one.
- Naming follows the family rule: `checklist` for the component, `checklist-<something>` for the lib, so they sort together and `shadcn add` pulls the lib in.

### kanban

A real board: drag a card between columns, reorder within one, with the garden's `apps/garden/components/request-board.tsx` as both the prior art and the first consumer to replace. That board today is READ-ONLY (columns by status, a capped column height, a `parked` drawer) which is exactly the gap.

- **Keyboard first, and this decides the library.** Every app is fully keyboard navigable by decree, so a card must be grabbable, movable and droppable without a pointer, with the move announced. Most drag-and-drop libraries treat that as an afterthought. Evaluate Pragmatic drag and drop (Atlassian, ships keyboard and screen-reader support and is framework-agnostic) against dnd-kit, and against native HTML5 drag events, which are the least code and the worst on touch. Not yet decided.
- The state is the consumer's: the board takes columns and cards and emits a move, it does not own an order. The garden's moves are surface writes through `lib/surface-ops.ts` and have to stay that way.
- Auto-scroll while dragging near an edge, a drop placeholder that shows where it lands, and a cancelled drag that returns the card to where it came from rather than leaving it where the pointer died.

### og and link previews as a registry item

Every site re-solves the same thing by hand and it always eats an afternoon: the `opengraph-image` route, fonts loaded for satori, a card layout that survives the crop every platform applies (Twitter 2:1 vs iMessage vs Telegram vs Slack), the wordmark overlay, the fallback when a page has no cover, and checking the result in each unfurler.

Vehicle: the registry, not ts-utils. The generator is React-shaped (satori renders JSX through `ImageResponse`), so it cannot live in a runtime-agnostic utils package; a shadcn item can ship files at explicit targets (`registry:file` → `app/opengraph-image.tsx`, `lib/og.tsx`), which is exactly a template plus a layout library. ts-utils only ever gets the pure parts if any appear (text fitting, title truncation rules).

Shape to build: an `og` item with `lib/og.tsx` = card layouts as components for `ImageResponse` (cover card, quote card, wordmark-only card, terminal-still card), one font loader (Geist, Geist Mono, Courier Prime from the same next/font sources the site already uses), the safe-area rules per platform baked into the layouts, and the size constants; plus a `registry:file` template `app/opengraph-image.tsx` that reads a page's title, description and cover and picks the layout. A demo page renders every layout at 1200x630 with the crop overlays of each platform drawn on top, so a card is designed once against all of them. Seeds: adriangalilea.com `lib/og.tsx` (quote and cover cards with local Geist TTFs), the garden's `app/icon.tsx` (SPROUT_PATHS through `ImageResponse`) and its `app/dev/mock/cover` page (the xtldr phone trio framed for the link preview).

@AGENTS.md
