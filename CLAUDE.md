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

### The trackpad swipe is BAD. Do not iterate on it again.

Read this before touching the track. It is the honest state, not a caveat.

Swiping between slides on a trackpad is bad UX. Not rough, not nearly there: bad. It overshoots, it oscillates, one swipe covers one slide or two depending on nothing the reader can perceive, and a run of them reads as fighting the thing rather than using it. `released 5→3.27 v -12.14 sum -2.23 far → 3` next to `released 3→4.32 v 9.25 sum 1.82 → 4` is a reader trying to go one slide back and being thrown two, then overcorrecting. Everything else in this component is good; this one gesture is not, and it is the gesture a reader uses most.

**It got worse through iteration, and that is the lesson.** It was rebuilt from a JS-driven track (tag `lightbox-js-track`) onto a real scroll container, which was right. Then roughly a dozen rounds followed, each one changing a constant or a rule in response to one report of how it felt: the commit threshold, the momentum cap, the axis lock, the landing curve, the drag gain. Every round fixed the thing that was named and moved the problem somewhere else, because there was no model of what correct is to check against. Tuning by a single reader's reaction, one round at a time, converges on nothing. The commit log from `2c73650` to `845c463` is that process; read it as a record of how not to do this.

**Before any further work, research.** Not another constant. The questions that were never answered:

- What do the good ones actually do, in numbers? iOS `UIScrollView` paging and `targetContentOffset(forProposedContentOffset:withScrollingVelocity:)`, Android `ViewPager2` and `PagerSnapHelper`, Embla, Swiper, Flicking, Motion's carousel. Their commit thresholds, their velocity thresholds, their durations and curves, and how they weigh distance against speed.
- Whether the drag should be amplified at all, and if so by how much and with what curve. This has 2.6x easing to 1:1 across a slide and it is too much; nobody checked what a trackpad's own acceleration already contributes before adding to it.
- What one gesture is allowed to move. One slide, or as many as it was thrown? Both were asked for here at different times and they are not compatible without a rule that distinguishes them, which nothing here has.
- What macOS momentum actually looks like per device, measured. The detector is inherited from wheel-gestures and its latency is felt directly, but nobody has logged real streams and looked at them.
- Whether the wheel's vertical dismiss should exist at all. It competes with the swipe for the same gesture and the axis lock is a guess arbitrating between them.

Then decide on paper, write the rule down with the numbers in it, and only then change the code. Rollback points: `lightbox-js-track` for the whole pre-scroll-container engine, `19df088` for the last state that was called "99% right".

## Verbs

`mise dev` (:3100) · `mise check` · `mise build` · `mise add <item> [consumer-dir]` (builds, then `shadcn add` from the local `public/r`). package.json keeps `build` for Vercel only. Runnable examples live in `scripts/examples/` (`bun scripts/examples/session-still.ts`), never inside a lib file.

## Supply chain

pnpm's 7-day quarantine and no-downgrade trust policy apply. `pnpm-workspace.yaml` pins `fastq` to 1.20.1 because 1.20.2 shipped without provenance; drop the override once 1.20.3 clears quarantine (`deps overrides --removable`). The shadcn CLI version is whatever the quarantine admits, not `latest`. shadcn 4.19 wants the npm package `cn` (a name shadcn took over on 2026-09-01); under the quarantine that resolves to the 2013 Chuck Norris jokes CLI, so `lib/utils.ts` is the classic clsx + tailwind-merge `cn` and the package is not a dependency.

## todo

### lightbox

The engine is extracted: `lightbox.tsx` is the binder (DOM listeners in, effects out, React state at checkpoints), and every rule lives in a lib that runs in bun. Adrian re-verifies the extraction in the browser and on the iPhone with `?debug` before the item is adopted anywhere.

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
