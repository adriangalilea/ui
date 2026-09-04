# ui

A public shadcn registry (`registry.json` at the root, items under `registry/base-nova/`, `shadcn build` → `public/r/*.json`) plus the Next demo site that serves it and is the lab for every primitive. Namespace `@ag`. Consumers copy items and own the copy; this repo is the source. The shape is shadcn's own `registry-template-v4`, on Base UI + Tailwind 4 + `base-nova`.

## Rules

- Every item has a `<name>.demo.tsx` beside its source and an entry in `app/demos.tsx`; `scripts/validate-registry.ts` refuses anything else. `lib/*` files are framework-free (no react, no DOM), asserted.
- Imports inside items use `@/registry/base-nova/{ui,lib,hooks,blocks}/...`; the CLI rewrites them to the consumer's aliases. A `.css` beside a component is imported relatively (`./x.css`) and ships as a second `registry:ui` file.
- Motion is CSS-first: scroll-driven animations (`animation-timeline`) drive numbers into custom properties; React state changes on checkpoints, never per frame. Reduced motion renders the completed state.
- Brand rules from `untitled/CLAUDE.md` bind: lowercase names, three type voices, 8px doubling rhythm, monochrome alpha ladder, no em dashes, nothing animates forever.
- No Radix. Base UI has no `asChild`; use `render={<a />}`.

## Distribution

The site deploys on every push to main (Vercel project `ui`, team adriangalileas-projects, git-connected, deployment protection OFF so the registry is public) at `https://ui.adriangalilea.com` (DNS-only CNAME `ui` → cname.vercel-dns.com in the adriangalilea.com Cloudflare zone; `ui-adriangalileas-projects.vercel.app` is the same deployment), and consumers map `@ag` to `https://ui.adriangalilea.com/r/{name}.json`. `public/r/*.json` is COMMITTED as well (`shadcn build` runs inside `mise check` and inside the Vercel build), so `https://raw.githubusercontent.com/adriangalilea/ui/main/public/r/{name}.json` is the same registry before a deploy finishes. A stale build shows up as a diff. Vercel needs `ENABLE_EXPERIMENTAL_COREPACK=1` (set) to honour `packageManager` pnpm 11; without it the build ignores `allowBuilds` and `overrides`.

`registry:file` items (tokens) need an explicit `target`; the consumer imports `app/tokens.css` from its globals.css once.

## Lightbox

`ui/lightbox.tsx` is the binder. The framework-free libs, each proven by its `scripts/examples/lightbox-*.ts` (run by `mise check`): `lib/lightbox-motion.ts` (fit, source view, zoom, rubber, springs, flight sampling, `frameAt`), `lib/lightbox-flight.ts` (the flight as a table plus a `Clock`: plan, read, landing rule), `lib/lightbox-hold.ts` (held keys to a view per frame), `lib/lightbox-wheel.ts` (the wheel session as a reducer: ticks in, session and effects out; the binder owns the silence timer), `lib/lightbox-gesture.ts` (the pointer state machine as a reducer, plus the tap ladder), `lib/lightbox-actions.ts` (the key table: keys, layers, `resolve`, the escape ladder, `sheet()`). The motion libs ship as one registry item, `lightbox-motion`. Every pose move is a Web Animation sampled from the spring (compositor properties only: transform, and the cover crop as two counter-scaled transforms); a gesture reads the animation's clock and takes over. React state changes on checkpoints.

- **WebKit hands `Animation.currentTime` back a hair under the duration** (seconds in, milliseconds out): a frame table indexed by time treats anything within `TIME_EPS` of the last frame as the last frame, or every flight on iOS fails to land and the frame loop dies. `frameAt` clamps its index and screams on a non-finite time.
- `debug` prop (demo: `?debug`) draws the engine's trace on the stage: pointer, gesture and dispatch decisions with the live pose, the layer's computed matrix, the live animation count, and page errors with a stack. This is how iOS bugs get diagnosed; production source maps are on for the same reason.
- iOS selects an image on a double tap unless the stage takes the default on pointerdown and the media carries `user-select: none` and no touch callout.
- Safari's Tab visits only fields: the dialog walks Tab over its own tabbables.
- History is replace-only (`#lb=id`); pushState made the iOS edge swipe double-animate a close. Android Back closes via CloseWatcher.
- Only a HOLD settles the zoom state on keyup (`releasePan` checks the key was held). A tapped + or - lifts while its spring is a few frames in; settling there recorded a mid-flight zoom, so `-` to fit left the chrome in zoomed mode.
- Headless Chrome over CDP (bun scripts, `/tmp/lb-*.ts` shape) is the regression rig: drive the demo with `?debug`, read the trace and the active layer's computed matrix, run the same script against the deployed site to diff behavior. A CDP keyup lands the same ms as the keydown, which is how the settle bug surfaced.
- The architecture debt and the extraction plan are in the todo below; do them before adopting the item in a site.

### The slide track: the browser owns the gesture, end to end

The track is a real scroll container, and the drag, the momentum, the rubber band, the choice of where it lands AND the animation that lands it are all the browser's. The engine only reads where it went. **Do not move any part of that into JavaScript.** It has been tried twice and lost twice: once as a spring-driven transform (tag `lightbox-js-track`), once as a scroll container with a JS landing (`e3b5663`..`845c463`, thirteen commits of tuning that ended worse than it started).

Three declarations are the whole policy, and they are load-bearing:

- **`scroll-snap-type: x mandatory`** on the track. It may only ever come to rest on a slide. Remove it and a gesture can park an image between two locks, which is not fixable with a JS watchdog because there is no event that reliably means "the reader is done".
- **`scroll-snap-align: center`** on every slot.
- **`scroll-snap-stop: always`** on every slot. **One gesture moves at most one slide, however hard it is thrown.** Both engines enforce this on trackpad momentum, on the compositor. WebKit returns the `Always` offset nearest the origin before it considers anything else (`searchForPotentialSnapPoints` → `if (searchResult.snapStop) return *(searchResult.snapStop)`, `ScrollSnapOffsetsInfo.cpp`). Chromium re-runs the search with `SnapStopAlwaysFilter::kRequire` and keeps whichever candidate is closer to where the gesture began (`SnapContainerData::FindClosestValidArea`); the fling path builds a `DirectionStrategy`, whose `ShouldRespectSnapStop()` is unconditionally `true`.

Only the browser knows when the fingers left the trackpad. macOS reports gesture and momentum phases to the engine (Chromium reads them as `is_in_inertial_phase`, and only starts a snap fling inside one); the web platform exposes no equivalent to page JS. A JS landing therefore has to infer the release from wheel deltas, and that inference is exactly what a reader feels as a lottery.

**One gesture is one slide. That is the canon, not a limitation.** Every reference implementation caps it, and none of them uses the magnitude of the throw to decide how far to go:

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
- **The landing decays, it does not accelerate into place.** WebKit and Chromium both ease out. "It slows down then snaps" is a handoff that does not match the reader's speed, not evidence that the curve should invert.
- **0.96 is the right threshold for "the hand is gone".** Chromium's `kMaxDecayFactor` and the vendored wheel-gestures detector agree on it independently. Kept only because `lightbox-wheel-phase.ts` still arbitrates the vertical dismiss; it decides nothing about the track.

What the engine still owns: which slide is current (`scrollsnapchange`, Chrome 129+/Safari 18.2+, with `scrollend` as the fallback), which is pending so the thumbnail highlights before the slide arrives (`scrollsnapchanging`), which slides carry pixels (two either side of where the reader actually is, not of the committed index, or a fast gesture crosses a slide that is still a grey hole), and the discrete moves (arrows, thumbnails, steps) which have no gesture to hand off from.

Never again, each of these having been tried: a JS spring or curve landing the track; a drag gain; a momentum detector deciding where the track goes; a settle watchdog; a `swipe`/`decided` arbiter. If the track feels wrong, the fix is in those three CSS declarations or in what the engine reads, never in a constant.

## Verbs

`mise dev` (:3100) · `mise check` · `mise build` · `mise add <item> [consumer-dir]` (builds, then `shadcn add` from the local `public/r`). package.json keeps `build` for Vercel only. Runnable examples live in `scripts/examples/` (`bun scripts/examples/session-still.ts`), never inside a lib file.

## Supply chain

pnpm's 7-day quarantine and no-downgrade trust policy apply. `pnpm-workspace.yaml` pins `fastq` to 1.20.1 because 1.20.2 shipped without provenance; drop the override once 1.20.3 clears quarantine (`deps overrides --removable`). The shadcn CLI version is whatever the quarantine admits, not `latest`. shadcn 4.19 wants the npm package `cn` (a name shadcn took over on 2026-09-01); under the quarantine that resolves to the 2013 Chuck Norris jokes CLI, so `lib/utils.ts` is the classic clsx + tailwind-merge `cn` and the package is not a dependency.

## todo

### lightbox

The engine is extracted: `lightbox.tsx` is the binder (DOM listeners in, effects out, React state at checkpoints), and every rule lives in a lib that runs in bun.

Left on the item: the demo streams a 17.8 MB trailer from blender.org on every open (host a short clip on the site); Safari frame pacing is unmeasured (needs Develop → Allow Remote Automation, then WebDriver); the sign-off list is `unverified` for Android.

### then: adopt, wave 2, wave 3

1. adriangalilea.com prose figures (retire its `components/lightbox.tsx`), the garden's feature stills, videoclub.
2. `scrollspy` (scroll-intent stand-down), `page-exit` / `page-enter` (the faked cross-origin morph: exit animation, Speculation Rules prerender with `Supports-Loading-Mode: credentialed-prerender` on the subdomain, entrance), `keymap` + `cursor-list` / `cursor-grid` (swift-utils Keymap; the lightbox's action table is the first client).
3. `charts` + `chart-frame` (adriangalilea.com's wrappers are the taste anchor), `particle-charts` as the opt-in playful voice, `narrated` (Sonoscript: real times only, click to seek, opt-in follow).
4. The garden landing (a static grid under a fog that promises content), then later: cover-image with blur and grain, `magic-input`, the media-library kit for videoclub and lore.

### og and link previews as a registry item

Every site re-solves the same thing by hand and it always eats an afternoon: the `opengraph-image` route, fonts loaded for satori, a card layout that survives the crop every platform applies (Twitter 2:1 vs iMessage vs Telegram vs Slack), the wordmark overlay, the fallback when a page has no cover, and checking the result in each unfurler.

Vehicle: the registry, not ts-utils. The generator is React-shaped (satori renders JSX through `ImageResponse`), so it cannot live in a runtime-agnostic utils package; a shadcn item can ship files at explicit targets (`registry:file` → `app/opengraph-image.tsx`, `lib/og.tsx`), which is exactly a template plus a layout library. ts-utils only ever gets the pure parts if any appear (text fitting, title truncation rules).

Shape to build: an `og` item with `lib/og.tsx` = card layouts as components for `ImageResponse` (cover card, quote card, wordmark-only card, terminal-still card), one font loader (Geist, Geist Mono, Courier Prime from the same next/font sources the site already uses), the safe-area rules per platform baked into the layouts, and the size constants; plus a `registry:file` template `app/opengraph-image.tsx` that reads a page's title, description and cover and picks the layout. A demo page renders every layout at 1200x630 with the crop overlays of each platform drawn on top, so a card is designed once against all of them. Seeds: adriangalilea.com `lib/og.tsx` (quote and cover cards with local Geist TTFs), the garden's `app/icon.tsx` (SPROUT_PATHS through `ImageResponse`) and its `app/dev/mock/cover` page (the xtldr phone trio framed for the link preview).

@AGENTS.md
