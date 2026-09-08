# ui

@README.md

README.md owns public installation, updates, and usage documentation. Keep internal
workflows, implementation decisions, and measurement notes here; reference the
README instead of maintaining a second copy of public instructions.

A public shadcn registry (`registry.json` at the root, items under `registry/base-nova/`, `shadcn build` → `public/r/*.json`) plus the Next demo site that serves it and is the lab for every primitive. Namespace `@ag`. Consumers copy items and own the copy; this repo is the source. The shape is shadcn's own `registry-template-v4`, on Base UI + Tailwind 4 + `base-nova`.

## Rules

- **Edit files with the `Read`, `Write` and `Edit` tools. Never with a script.** No
  `python3 - <<'PY'`, no `sed -i`, no `perl -pe`, no heredoc rewriting a source file.
  `Bash` is for things that are not edits: `git`, `mise check`, `rsvg-convert`, `open`,
  `curl`. A scripted edit is unreviewable, silently rewrites whole regions (it has
  reformatted `registry.json` and deleted a block of constants in this repo), and its
  diff cannot be read before it lands.
- Every item has a `<name>.demo.tsx` beside its source and an entry in `app/demos.tsx`; `scripts/validate-registry.ts` refuses anything else. `lib/*` files are framework-free (no react, no DOM), asserted.
- **Items meant to be used together share the head item's name**: `terminal` + `terminal-session`, `lightbox` + `lightbox-motion` + `lightbox-actions`, `telegram-chat` + `telegram-summary`. They sort together, they read as one thing, and `registry.json` keeps them adjacent. A part stays its own item only when something installs it ALONE (a build script renders a still with `terminal-session` and no React); otherwise it belongs in the head item's `files`, the way six engine files ship as `lightbox-motion`.
- **Usage is never written by hand.** An item page renders its own `<name>.demo.tsx` verbatim, read at build time, under "the demo above, verbatim". Prose usage beside a demo drifts the first time either is touched; the same file cannot. So a demo is also the documentation: write it as the code you would want copied. **Every example carries its own code**: a demo wraps each example in `<Sample name="…" label="…">` (`app/samples.tsx`); the item page cuts the JSX inside each block out of the demo's source (`app/samples-extract.ts`), renders it through `<Code>` on the server and the Sample shows it under a `code` toggle, the way shadcn's pages do. The snippet IS the code that drew the example, so it cannot drift, and a Sample whose block the page did not find throws. **The data is part of the sample**: `with="people story"` prepends the demo's `// #region people` … `// #endregion` blocks (VS Code's folding markers) to the JSX, because a people section whose code showed two tags and no people was not a code sample. The control is a preview | code segmented switch on the example's frame, the convention every component site trained its readers on. The frame is three surfaces of one colour at alpha tiers (page, frame, head) and has NO `overflow: hidden`: that breaks `position: sticky` for anything inside, and a scrolly's stage stopped pinning in one; the clip is on the code panel only. New demos use it; the older ones move to it when touched.
- **The index is derived, never hand-kept**: `app/registry.ts` reads `registryDependencies` and tells two relations apart. A PART shares the head's name (`quote-card`, `lightbox-motion`) and nests under it ("comes with"); everything else an item depends on is a standalone item it USES (`quote` uses `avatar`, `avatar` uses `lightbox`), which keeps its own row. **Every relation is shown from both ends** on the item pages: "comes with" / "part of", "uses" / "used by", derived from the same list so the two ends cannot disagree. Reading every dependency as a part once nested `avatar` under `quote` and dropped `lightbox` off the index; the validator refuses a name-part its head does not pull in. A demo shows the whole family working together where that is the point (the terminal page draws one script live AND as a still, which is the claim the pair exists to make).
- Imports inside items use `@/registry/base-nova/{ui,lib,hooks,blocks}/...`; the CLI rewrites them to the consumer's aliases.
- **How an item is styled (the pattern; `quote` and `avatar` are the reference).** Three tiers, and which one a value belongs to is decided by one question: is it a fixed value, a computed one, or something CSS alone can express?
  1. **Fixed values are Tailwind utilities in the JSX**, merged with `cn()` from `@/lib/utils`, consumer `className` last. Padding, radius, the step surface (`bg-foreground/4`), gaps, the type voices (`font-serif` / `font-sans` / `font-mono`, theme vars the consumer names), colours at alpha (`text-foreground/75`). Every `@ag` consumer has Tailwind because shadcn is Tailwind; a `.css` of static rules made `className` a fight with a stylesheet. Group the recurring sets as named constants at the top of the file (`STEP`, `WORDS`, `META`) so a rule has one home and a name.
  2. **Computed values are custom properties on `style`, consumed by `-(--…)` utilities.** Everything derived from a module's constants — `cqw` sizes, shares of a frame, a focus gradient, a dissolve mask — is arithmetic in TS and lands as `w-(--ag-quote-column)`, `text-(length:--ag-quote-size)`, `mask-(--ag-quote-dissolve)`, `object-(--ag-avatar-focus)`. The property is the seam between the arithmetic and the CSS; the class says which property each number drives; nothing is typed twice, and nothing is `calc()`'d in CSS that TS could have computed (the feature's half-height mark is `FEATURE_MARK` in TS, not a `calc` on a var). A variable holds the WHOLE value the class consumes (`"35.2% 50%"`, not a number the CSS finishes).
  3. **A `.css` beside an item survives only for what no utility can express**: keyframes, `@property` registration, vendor pseudo-elements with state, a `::before` layer with a computed background. Every rule in it says in a comment why it is not a utility. It is imported relatively (`./x.css`) and ships as a second `registry:ui` file.
  Every part carries `data-slot="<item>-<part>"` (`quote-body`, `avatar-image`), shadcn's convention: the DOM says what a node is, a consumer styles a part from outside without a class name to know, and nothing on the page depends on an `ag-*` class. `@tailwindcss/typography` is not part of any of this: `prose` is for markdown bodies, not for a composition. The older items (`copy`, `code`, `lightbox`, `reveal`, `scrims`, `scroll-stage`, `telegram-chat`, `theme-toggle`) still carry tier-1 rules in their `.css`; they move to the pattern the next time each is touched, not as a sweep.
- Motion is CSS-first: scroll-driven animations drive visual properties. Transcript timelines explicitly opt into frame-coalesced React progress for streamed content. Reduced motion renders the completed state; decorative clocks run only while visible and stop at their scheduled end.
- Brand rules from `untitled/CLAUDE.md` bind: lowercase names, three type voices, 8px doubling rhythm, monochrome alpha ladder, no em dashes, nothing animates forever.
- No Radix. Base UI has no `asChild`; use `render={<a />}`.

## Who judges

**Adrian judges feel. Nothing else does, and no test may stand in for him.** This is a
standing rule, not a phase, and it holds until the tooling and an agent's ability to
SEE a moving interface are both better than they are.

- **Automated checks catch REGRESSIONS, they do not grant sign-off.** `mise check`,
  the runnable examples, and a CDP rig driving a real browser are all worth having and
  worth writing: they prove structural facts a hand cannot measure — a scroller moved,
  a slide landed on a snap point, a dismiss engaged, a curve never reverses. Treat
  every one of them as necessary and never as sufficient. Green means nothing broke
  that was already understood. It never means it feels right.
- **The dev-server session is how a bug is read, not guessed.** `mise dev`, then Adrian
  opens `http://localhost:3100/<item>?debug` (LOCALHOST: Next blocks its own scripts
  for any other origin, and a LAN address gives a page with no JavaScript, dead buttons
  and all) and scrolls; the corner toggle writes the same `?debug`, one flag in the URL
  (`app/debug.tsx`, `useDebug()`). With it on, demos post every decision to
  `/api/trace` (dev-only) and it lands in `/tmp/ui-trace.jsonl`, which the agent
  tails: `trace("cut", …)` from the chat's `debug` function prop, `trace("act", …)`
  from the scrolly. A screen recording on the Desktop plus `ffmpeg -vf fps=3` frames
  read alongside the trace found the coil-spring in one pass; the readout alone had not.
- **Say which kind of claim is being made**, every time. "Verified structurally,
  unverified by hand" is a complete and honest status; "verified" alone, off a passing
  script, is a lie that has been told here before and cost rounds.
- **Ask him.** Starting a dev server and asking how something feels is welcome, not an
  imposition — he has said so explicitly. A question costs one message; guessing at
  feel and shipping it costs a round, and shipping it silently costs trust.
- **NEVER `open` a render for him. Not a PNG, not a sheet, not once.** Preview adds
  banding and artifacts to a dark ground that are not in the file, so it cannot be
  judged there — a "border" was chased for a round that a pixel count proved did not
  exist. Anything to be looked at goes on a page in the browser: a variant sweep is a
  section on the item's demo page (the real component, every case, one variable), a
  still is inlined as SVG beside its card. `mise still` writes files and prints paths;
  it does not open them. A future gallery replaces Preview (untitled TODO); until then
  the browser is the only viewer.
- The failure mode this exists to stop: a script passes, the agent writes "confirmed",
  and the thing is atrocious in the hand. Instrumentation has also been WRONG here —
  reporting a stale build, blaming the wrong gesture, printing 1000 Hz over a stream
  running at thirty. An instrument is a witness, not a judge.

## Distribution

The site deploys on every push to main (Vercel project `ui`, team adriangalileas-projects, git-connected, deployment protection OFF so the registry is public) at `https://ui.adriangalilea.com` (DNS-only CNAME `ui` → cname.vercel-dns.com in the adriangalilea.com Cloudflare zone; `ui-adriangalileas-projects.vercel.app` is the same deployment), and consumers map `@ag` to `https://ui.adriangalilea.com/r/{name}.json`. `public/r/*.json` is COMMITTED as well (`shadcn build` runs inside `mise check` and inside the Vercel build), so `https://raw.githubusercontent.com/adriangalilea/ui/main/public/r/{name}.json` is the same registry before a deploy finishes. A stale build shows up as a diff. Vercel needs `ENABLE_EXPERIMENTAL_COREPACK=1` (set) to honour `packageManager` pnpm 11; without it the build ignores `allowBuilds` and `overrides`.

`registry:file` items (tokens) need an explicit `target`; the consumer imports
`app/tokens.css` from its globals.css once. The current shadcn CLI refreshes these
targets with `--overwrite`, covered by `scripts/check-install.ts`. `scripts/add.ts`
serves the built registry to shadcn; it does not copy or repair files itself.

### Developing against garden

Edit shared components in `registry/base-nova/`; keep garden-specific composition in
garden. Install into the consumer instead of manually patching both copies:

```bash
mise add telegram-chat ../untitled/apps/garden
mise add telegram-chat ../untitled/apps/garden diff
mise add telegram-chat ../untitled/apps/garden overwrite
git -C ../untitled diff
pnpm --dir ../untitled/apps/garden check:ui
```

`mise add` builds and serves this checkout's registry to shadcn. Its dependencies
come from the same checkout; the consumer's registry configuration is unchanged.
The default is a real shadcn dry run. Run installs sequentially for apps sharing a
workspace.

`check:ui` builds garden and checks its production server in Chromium and WebKit.
Before publishing registry changes, run `mise check`; this also exercises fresh
installs and updates in standalone and workspace consumers. Add meaningful fixes
and migration notes to the changelog.
The website reads that file directly: use dated `## YYYY-MM-DD` headings, a `###`
component name or general subject, and bullet paragraphs. Backticks render as inline
code. There is no separate website release-note copy to maintain.

### Reviewing usage

Production website visits are collected in the project's
[Vercel Analytics dashboard](https://vercel.com/adriangalileas-projects/ui/analytics).
The script is excluded from local and preview deployments. It belongs to the
website, never to the registry components installed into other projects.

Review component-page visitors, referrers, and `/updates` visits monthly, comparing
equal periods. These measure discovery and documentation interest, not adoption.
Keep exports outside the public repository if you want a history beyond the
provider's retention window.

Registry delivery is visible separately in Vercel Observability's Edge Requests:
filter production requests to `/r/*.json` and inspect component paths and response
statuses. Count requests, not installs: shadcn previews, dependency resolution,
updates, retries, and bots can all fetch the same file. A popular dependency is not
necessarily a component people deliberately selected. The detailed metrics API
currently requires Observability Plus for this project; no upgrade is enabled by
this repository.

Not yet instrumented: install-command copies, update-command copies, and durable
per-component request history. These need a reporting destination. Successful
installs, distinct consuming projects, and actual update adoption cannot be inferred
from registry HTTP traffic. They would require explicit client reporting; copied
components do not phone home.

**Not published to esm.sh or npm, on purpose (asked for, 2026-09).** "Always the latest automatically" and "the API may change" are the same wish said from two sides, and a CDN import (`esm.sh/<pkg>@latest`) grants the first by breaking on the second: a consumer's page changes under them with no deploy of their own, plus a second React instance unless every peer is pinned external, and CSS + tokens that no ESM import carries. The registry is the opposite contract and the right one while items change weekly (`LightboxSolo` landed a day after `avatar`): the consumer OWNS the copy, refreshes it deliberately (`shadcn add --overwrite`) and reads the diff. The gold standard for "latest automatically" is semver on npm — a consumer pins `^1` and takes patches through their lockfile, majors by choice — and esm.sh mirrors every npm package for free, so publishing there needs nothing extra. Do that when an item's API has stopped moving, not before; a package published at v0 with weekly breaks is worse for the consumer than the registry.

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

The track is a real scroll container, and **the ENGINE drives it, for every input**.
The slot is `touch-action: none` so the browser never claims a pan; the CSS snap
properties (`x mandatory` + `align: center` + `stop: always`) exist to land what the
engine leaves, and `data-stepping` stands them down while it is driving.

**The track has ONE writer and two terms**: `scrollLeft = base + swipeGive(travel)`.
`base` is where the machine has it (a resting slide, or a glide in flight); `travel`
is the hand's live offset from the slide it is anchored to. Splitting them is what
makes a commit seamless: the anchor moves, the glide is aimed from exactly where the
pictures stand, the offset resets, and their sum does not move a pixel.

**One gesture buys ONE slide.** It costs `swipeCommitPx` — Embla's `clamp(18% of the
slide, 50, 225)` px — and once bought the gesture is SPENT: `swipeDone`, and
everything the device is still sending moves nothing at all. Multi-slide skipping was
tried flat-priced and on a doubling ladder and both are a slot machine, because the
boundary between one and two is a number of pixels of finger and no hand can feel
pixels of finger (measured: 0.46 slides of travel took one picture, 0.63 took two).
Every native pager decided it the same way — `isPagingEnabled`, `PagerSnapHelper`,
Embla with `skipSnaps` off. Three pictures is three flicks.

**The pictures LEAN, they do not follow**: `swipeGive` is quadratic in the progress to
the line, reaching `SWIPE_LEAN` (0.85) of it. Squaring is what separates a deliberate
drag from a trackpad's dying TAIL, which emits 1-3 px for half a second after a
gesture is over and is otherwise indistinguishable from a slow hand — same magnitude,
same cadence. They differ only in DISTANCE, so the fraction squares with the lean: a
56 px tail leans 6 px, which is nothing to see and nothing to wind back.

**Nothing detects a release and nothing is projected.** The web exposes no gesture
phase to page JS (macOS reports one to the engine, not to us), so the phase would have
to be inferred from the decay, and that inference lands wherever it lands: measured on
two swipes of the same speed, one was called coasting at 142 ms while its deltas were
still GROWING, the other at 674 ms in a 1 px dribble. Every rule built on it inherited
that jitter and the same motion took one picture or two by luck. So every delta is
travel, the hand's and the device's alike, at full weight. A trackpad's momentum
ARRIVES as deltas; spending it as it comes is exact where projecting it was a guess
with a constant in it, and it pays for itself, since a flick delivers about as much
again as the hand did.

**Two signals about a wheel stream can be read without guessing, and only two.** A
tail only DECAYS, so a delta over `SWIPE_SURGE` (2) times the decaying envelope is a
hand back on the glass; and momentum never REVERSES, so any delta against the
direction just bought is a hand, with certainty. Either opens a new gesture. Silence
(`SWIPE_END`, 110 ms) ends one. A POINTER needs none of this: it says when it let go,
so its release ends the swipe on the event.

A move is `glideTo`: a cubic Hermite, `GLIDE` 165 ms nominal (100-225 bounded, scaled
by the square root of the distance), whose entry tangent is held between
`GLIDE_ENTRY_MIN` (2, quadratic ease-out) and `GLIDE_ENTRY` (3, cubic ease-out and
exactly the monotonicity bound). The floor is why it goes at once: handed a slow
hand's speed the same cubic is a smoothstep, which starts at a standstill.

**Reading `scrollLeft` with the magnets up MOVES the scroller.** `scroll-snap-type:
mandatory` re-snaps at the next layout and a read forces that layout, so any read
taken between `stopGlide` handing the magnets back and the next move setting them down
does not observe the position, it snaps it — mid-flight, half a picture, backwards.
Magnets down before anything reads. For the same family of reasons `slotW()` is
cached: `clientWidth` is a layout read, and asking for it four times per event
interleaved with a `scrollLeft` write is a forced synchronous layout per event, which
measured as the page falling to 30 fps and the browser coalescing four frames of input
into single 189 px deltas.

### The reel is the PROVIDER, and that is the whole grouping model

`<Lightbox>` is a provider and the reel is every `<LightboxTrigger>` under it, in
document order, or the explicit `entries` array. So grouping is neither global nor
per-image: a page chooses it by where it puts the provider. One around a gallery is a
navigable set; one around each standalone figure is a picture that opens alone, and
arrows, swipe, strip and counter all stand down on their own because `count` is 1.
Nothing has to be turned off, and there is no prop for it — which is the point.

In prose, that means a `<Figure>` of one's own that renders a provider and a trigger,
used per image, and a separate provider around anything meant to be browsed. That
per-image composition is exported as `LightboxSolo` (a provider around one trigger):
`avatar` is built on it, so three faces on a page are three viewers, and it nests inside
a page reel without joining it because the nearest provider wins. A face that landed in
the page's reel, with a strip of every other face and arrows between them, is the
failure this exists to prevent. One more thing a solo trigger inside somebody else's
`<figure>` must do: pass `caption`, because the fallback reads that figure's
figcaption, and a quote's is its attribution. The one thing that IS page-wide: entry
`id`s, because `history` writes `#lb=<id>`. Two providers with the same id on one page
fight over the hash.

**Absent is not unavailable.** An action that is a STATE (prev at the first slide, zoom
on a frame) is `unavailable`: its button stays, dimmed and focusable, because it says
where you are and it comes back. An action that cannot happen in this session — a rail
with no `renderRail`, arrows / strip / first / last on a reel of one, fullscreen where
the browser has none — is `absent`: no button, no row in the `?` sheet. The set is
computed once in `Stage` and `Button` returns null for it. A solo portrait that drew two
dead arrows and a dead "i" is what the distinction exists to prevent.

### Leaving

**A relock is a RUN of motion, never one event.** Both axis relocks read consecutive
same-direction travel on a window that restarts when that axis turns. Per event they
are unreachable: at 120 Hz a finger sends 2-4 px per move, so `> 12 px` in one of them
is a jump no hand makes, and swiping sideways then up without lifting simply never
dismissed. The restart matters as much as the accumulation, or the ratio is measured
against a whole swipe's worth of the other axis and cannot be beaten either. A
headless rig stepping 30 px at a time passed both tests happily.

**A trackpad pinch dismisses, on the same rule and the same constants two fingers on
glass use.** Pinching in from fit follows, lights the room and leaves past
`PINCH_CLOSE`; one that opened past the ceiling first is a zoom being undone. It used
to rubber against a floor and spring back, so one gesture meant two different things
on two devices running the same component.

**The exit HANDS the leftover momentum to the page, and the timing is the whole
thing.** Three failures, in order, each fixed by the next:

- Owning the wheel until the flight LANDED: the page sat still, then scrolled on its
  own a beat later. A delay the reader cannot steer.
- Merely releasing the events: nothing moved at all. A scroll stream LATCHES to the
  scroller it started on, so every remaining delta keeps arriving here whatever this
  handler does with it. The dialog has to apply them to the page itself.
- Handing over the instant the exit is DECIDED: too early. A dismiss commits from a
  projection, with the picture barely moved and the backdrop still up, so the page
  scrolled behind a curtain. `EXIT_HANDOFF` on `p` waits until the room is half gone,
  which is when deciding to leave and being able to SEE where you are going become the
  same moment. Both or neither.

**And the exit is a move through the DOCUMENT.** While the page scrolls under it, the
picture and its target shift by the same scroll, so the remaining flight is identical
in shape and in duration. Re-aiming the target alone leaves a critically damped spring
chasing a fleeing point, whose standing error is `v/ω`: it trails further the longer
the reader scrolls and takes longer the further the ground ran. Following also gives
the honest answer when the trigger leaves the screen — the picture goes with it, out
of view, which is where it belongs.

**A wheel pan STOPS at its bound; only a pointer drag rubber-bands.** A band is for
direct manipulation, where the image is under a finger and the give is what says "this
is the end". On a trackpad nothing is under the finger, so all it buys is a picture
frozen at the cap while the reader keeps pushing. The bound is the overflow plus
`PAN_INSET` (64) so an edge can be brought INSIDE the viewport: stopping exactly where
the picture ends gives no sign that it ended, only a picture that will not move.

What else the engine owns: which slide is current (`scrollsnapchange`, Chrome
129+/Safari 18.2+, with `scrollend` and a `scroll` timer as fallbacks), which slides
carry pixels (two either side of where the reader actually is, not of the committed
index, or a fast gesture crosses a slide that is still a grey hole), and the discrete
moves (arrows, thumbnails, steps), which count from where the track is HEADING rather
than from the committed index, or a fast run of presses all asks for the same slide.

Reference implementations, for grounding rather than for copying — note that none of
them uses the magnitude of a throw to decide how far to go, and all of them track the
finger 1:1, the OS having already applied its own acceleration curve:

| | commits when | how far | landing |
|---|---|---|---|
| iOS `UIScrollView` paging | projected destination past the midpoint | one page | spring from the release velocity |
| Android `PagerSnapHelper` | any fling over `minFlingVelocity`; velocity's SIGN only | first page past the centre, so exactly one | `MAX_SCROLL_ON_FLING_DURATION` 100 ms |
| Swiper | ≤ `longSwipesMs` 300 ms → one slide, distance ignored; longer → past `longSwipesRatio` 0.5 | one slide | fixed `speed` 300 ms |
| Embla | `\|force × 400\|` over `clamp(20% of viewport, 50, 225)` px | `byIndex(current ∓ 1)`, exactly one | friction integrator |
| WebKit snap | platform momentum calculator | `scroll-snap-stop` decides | cubic Bézier fitted to the reader's last delta |
| Chromium snap fling | projects `delta / (1 − decay)` once decay < 0.96 | `scroll-snap-stop` decides | per-frame deltas decaying 0.92 |

Never again, each having been tried and shipped and felt: a drag gain; a slide read
off TOTAL travel from a fixed origin (an absolute map wearing a threshold's clothes,
asymmetric in a way a hand feels at once — continuing cost a whole slide of finger
where reversing cost 7 px); a commit counter that resets; more than one slide per
gesture; a `THROW` constant projecting where a release would land; a momentum detector
deciding WHERE the track goes; a rubber band on the wheel pan; a settle watchdog.

**The trace is the instrument, and it has lied more than once.** Its header carries the
health of the input stream itself — the median gap between WHEEL arrivals (a wheel
comes once per display frame, so the median IS the refresh rate: `@33ms 30Hz` is a
screen or a stalling renderer, not a fault in itself), the page's own measured `fps`
against it, and why the gesture opened. Equal-and-low means the renderer is over
budget; frames faster than events means the device. Guessing between those two cost a
round, as did a median that counted glide frames sharing a timestamp with the event
that started them, and an open-reason overwritten by the NEXT gesture's.

## Verbs

`mise dev` (:3100) · `mise check` · `mise build` · `mise add <item> [consumer-dir]` (builds, then `shadcn add` from the local `public/r`). package.json keeps `build` for Vercel only. Runnable examples live in `scripts/examples/` (`bun scripts/examples/session-still.ts`), never inside a lib file.

## Supply chain

pnpm's 7-day quarantine and no-downgrade trust policy apply. `pnpm-workspace.yaml` pins `fastq` to 1.20.1 because 1.20.2 shipped without provenance; drop the override once 1.20.3 clears quarantine (`deps overrides --removable`). The shadcn CLI version is whatever the quarantine admits, not `latest`. shadcn 4.19 wants the npm package `cn` (a name shadcn took over on 2026-09-01); under the quarantine that resolves to the 2013 Chuck Norris jokes CLI, so `lib/utils.ts` is the classic clsx + tailwind-merge `cn` and the package is not a dependency.

## todo

### bidirectional linking — CRITICAL

A relation shown from one end only is a lie by omission: the reader on the other end
never learns it exists. The rule is that every link between two things is rendered at
BOTH of them, derived from ONE declaration so the ends cannot drift. It holds for the
item index today (`comes with` / `part of`, `uses` / `used by`, `app/registry.ts`).
Still one-way, in order of damage:

- **lab ↔ items.** `/lab` is built on `scroll-stage`, `reveal`, `scrims`; the item pages
  do not say so and the lab page does not link back. Declare what the lab uses once and
  render it at both ends, the same code path as the index.
- **items ↔ this file.** A `## Lightbox` section here, no link from `/lightbox`; a
  todo per item, no link from its page. Either the page links the section (anchors in
  the repo's markdown) or the doc moves to the item and the page renders it.
- **consumers.** `used by` stops at this registry. The garden and adriangalilea.com
  install items; nothing here says which, and nothing there points back at the item
  page. Their `components.json` + installed files are the declaration to derive from.
- **demo prose.** A demo that mentions another item in words (`quote` saying "the
  avatar's lightbox") links nothing. Mentions become links or they go.

### quote

The mark ships as an outline (`MARK_PATH`), taken from Instrument Serif under the SIL
OFL. Times New Roman is the shape Adrian actually picked and it CANNOT be shipped:
Monotype's licence forbids redistributing its outlines.

**Pending: Tinos and Liberation Serif.** Both are open (Apache 2.0 and OFL) and both
are drawn to be metrically compatible with Times, so their opening quote should be the
shape he chose, legally. Downloading them failed on the day (`curl` exit 56 on both
GitHub and the Google Fonts mirror, which looks like the Cloudflare range blocking
already diagnosed in `~/Developer/_smarthome/network/`). Retry, extract the glyph the
same way, and put them in the comparison sheet against the current one before
swapping.

**Portraits carry a SIDECAR, and that is where the pixels end.** `avatar.png` has an
`avatar.json` beside it — `{ focus, average }` — written by `mise portrait` when it crops
and by `mise portraits <dir>` for any portrait missing one (`scripts/pixels.ts`). Focus
comes from Vision (a face, else the attention model's subject, else the middle); `average`
is the picture's mean RGB; `size` its natural pixels. The sidecar holds FACTS, never the
derived tone: `toneFrom` is pure arithmetic a consumer runs at build, so a change to the
tone rule re-annotates nothing.

**`avatar` reads the same sidecar.** A person's face is one item everywhere it appears —
quote attribution, page header, feed card, comment: a round crop on the rungs (24/40/64),
`object-position` from `focus` so a subject to one side of the file is not cropped to an
ear, a hairline ring in the tone. With `full` (the portrait and its `size`) it opens the
portrait ALONE (`LightboxSolo`, its own provider, nothing to mount above it), captioned
with the name. `quote` uses `avatar` for its attribution, `avatar` uses `lightbox`; each
is its own item and the index links both ends. The sidecar and the crop are ASSET
PREPARATION, done once on the Mac with
the tools the Mac has; a consumer reads two numbers and never runs sips, sharp or Vision
in its build. A detected focus is a guess that is right often, not always — two people in
a frame, a face in profile at the edge — and the sidecar is the override: edit the number,
and nothing ever overwrites it. `mise still` reads sidecars too and computes in memory
only for portraits that lack one, saying so.

**Next, by leverage: adopt the pair in adriangalilea.com.** Its `components/quote.tsx`
and the quote half of its `lib/og.tsx` are hand-rolled and share nothing with the module
the corpus tooling was tuned against; wiring them onto `quote` + `renderQuoteSvg` is the
payoff of the whole build, and it closes the site's own gap where notes without a quote
ancestor generate no OG image at all.

### lightbox

The engine is extracted: `lightbox.tsx` is the binder (DOM listeners in, effects out, React state at checkpoints), and every rule lives in a lib that runs in bun.

**Signed off by hand on macOS Chrome (trackpad + mouse) and iPhone Safari, and READY
TO ADOPT.** The gestures were settled in the browser over many rounds, by feel, one
change at a time; the traces that settled them are quoted throughout the rules above.

The touch path is also structurally verified: a CDP rig (`/tmp/lb-*.ts` shape,
emulated phone metrics + `Emulation.setTouchEmulationEnabled` with `maxTouchPoints`,
`Input.dispatchTouchEvent`) drove the deployed site and proved a finger moves the
track, it lands exactly one slot, the sideways half is felt, and turning up mid-touch
dismisses. **It also passed the relock while the relock was broken**, by stepping 30 px
where a finger sends 3 — the sharpest example on record of why a rig does not grant
sign-off (see **Who judges**).

Left on the item:

- **Frame rate, DEFERRED as good enough.** Measured healthy at `123fps @8ms 125Hz` on
  mains; a session on battery ran `@33ms 30Hz · 31fps`. Equal-and-low cannot separate
  a 30 Hz screen from a renderer missing every other frame, and no trace was captured
  at a bad moment, so the cause is unproven. If it returns, ONE trace header settles
  it: frames faster than events is delivery, equal-and-low is paint cost.
- A hand on android chrome, macos safari and firefox. Reported as encountered rather
  than chased.
- Safari frame pacing is unmeasured (needs Develop → Allow Remote Automation, then
  WebDriver).

### then: adopt, wave 2, wave 3

1. The garden's feature stills, videoclub. (adriangalilea.com is fully on it: figures, covers, card expand buttons and avatars, its own copy retired.)
2. `scrollspy` (scroll-intent stand-down), `page-exit` / `page-enter` (the faked cross-origin morph: exit animation, Speculation Rules prerender with `Supports-Loading-Mode: credentialed-prerender` on the subdomain, entrance), `keymap` + `cursor-list` / `cursor-grid` (swift-utils Keymap; the lightbox's action table is the first client).
3. `charts` + `chart-frame` (adriangalilea.com's wrappers are the taste anchor), `particle-charts` as the opt-in playful voice, `narrated` (Sonoscript: real times only, click to seek, opt-in follow).
4. A frameless `telegram`, `checklist`, `kanban`, `code-scrolly`.
5. The garden landing (a static grid under a fog that promises content), then later: cover-image with blur and grain, `magic-input`, the media-library kit for videoclub and lore.

### telegram: the phone is a mode

`telegram-chat` has four orthogonal knobs on one script (`/telegram-chat`, sections
02-06). `until` is the autoplay's CEILING (play to the end of message k and wait; raise
it and it resumes): a storyboard paces the chat with it, one act at a time, because a
chat that played whole in act one left acts two and three pointing back at messages
already watched. **An act's story is "message k lands now"**: everything before k is
context and lands whole (`lift`, the start of k's beat), so a reader who skips two acts
or reloads mid-scrolly gets the act's own beat, never a blurred replay at normal speed;
the focus blur waits for the focused message to exist. **People** (`ChatProfile`, `Who`): define a person or a bot once and use the PROFILE
ITSELF wherever a chat names someone, `from: ADRIAN` in a group, `chatName: ADRIAN` for a
private chat with him, the afterlife; label, mini avatar, header, handle all come from
the one definition (a bot's handle is its default sub-line). A script may instead carry
a `people` map and name them by key. **The cut waits for its target**: a phone cropped to
a message that has not landed showed the bottom of a thread with nothing to show, so the
viewport closes down only once the focused message exists; frameless is always cut
because there the viewport is the container. **And the scroll target stays PENDING until
the box can reach it**: the height transitions, so in the frame a crop turns on the
viewport is still full height, a scroll has nowhere to go and is clamped to 0, and a
remembered "already there" left the thread pinned at its top under a closing curtain
(the blurred header region in a crop after scrolling up and down). Every resize tick
re-aims while the box is too tall for the target. `debug` (`?debug` on the demo) prints
the cut's numbers under the chat, story position through scroll asked and got, for
sign-off by hand. In `scroll-stage`, JS and CSS now share
ONE rule for which act is on (past i/acts of the TRAVEL, `--stage-p`'s number): counting
paces in JS while the CSS counted travel lit an act's words before the stage switched
whenever a tail lengthened the track; and the first act is on from the top of the
track. **Reactions are
buttons**: press one and you count, drawn as the client draws your own; the emoji are
Noto Animated Emoji as animated WebP (Google, Apache 2.0, no player, lazy, 150-300 KB
each, so reactions only; Telegram's set is TGS behind its API and its own IP), text
glyph when the set lacks one. **Nothing happens on hover**: Telegram messages do not,
and a bubble that moved under the pointer read as a control. Then `frame="none"` (bubbles on a bare canvas at the container's width; NO header, a
bare canvas has no chrome and a title pinned over floating bubbles, tried sticky on the
page's colour, was the phone's composition forced onto it; the typing status is a line
in the thread; the composer shows only while typing), `focus` (indices that lift, the rest blur and
return on hover, the code item's rule; a phone thread centres the focused message) and
`crop` (a viewport of a given aspect: the device keeps its FULL WIDTH and is cut in
height only, scrolled to the focused message or to the latest; the message's place is
MEASURED in layout coordinates with the thread's scroll subtracted). The cut is a REAL
SCROLLER, not a transform: the reader scrolls it once the story settles, the phone
thread's own rule, and the scroll is smooth so a landing message slides the thread up
and a scrolly glides between messages. Its height is set in px so a change of crop
transitions, which is what lets the effects chain (whole phone → one message lifted →
the viewport cut down onto it). The edge scrims are scroll-driven in CSS on two
registered numbers, so a scrim exists only where something is hidden: at the bottom of
the thread the last message is never blurred by a band with nothing to hide, and a
browser without scroll timelines gets a clean cut rather than a wrong scrim. Frameless
crops to `FRAMELESS_CROP` by default, because a canvas that grew as messages landed
reflowed the page under the reader. **Judged on the demo:** scaling the device into a bubble
cut the width and lost the phone; an unscaled phone panned vertically is what still
reads as Telegram, so there is no scale knob. Bare canvas for copy that must be read,
the cut phone for copy that must still look like a phone.

Left: **Telegram Desktop's layout** (wider column, different bubble geometry, a
sidebar), deferred. **The styling pattern**: this item's 880-line `.css` predates the
utilities rule; the modes were added in it rather than half-converting mid-feature.
The conversion is the next touch on the item, on its own.

### twitter / x

A post as a component, the way `telegram-chat` is a chat: author, handle, verified
mark, body with entities (mentions, links, hashtags), media, quote-post, the metrics
row, the relative time; light and dark, the client's exact geometry. Same doctrine:
data in, what looks clickable is clickable, decorative chrome aria-hidden. Consumers:
the garden's project pages quoting reactions, adriangalilea.com notes embedding a
post without the widget script.

### web-preview: shipped; what is left

`web-preview` draws a link's unfurl from five facts (`Unfurl` in `web-preview-unfurl`:
url, site, title, description, image, icon) in three styles, `card` (ours, default),
`telegram` (the client's tinted card with the rule; `telegram-chat` draws its previews
with it, colouring it through `--wp-ink/text/muted/wash` set on the bubble) and `x`
(the large-image card with the title in a chip). **Where the fetch runs is decided**: at
authoring time, `mise unfurl <url>` prints the facts and they ship as data beside the
link, the sidecar model. A browser cannot unfurl a foreign page (CORS) and a build that
fetches on every deploy makes the site depend on the other site being up. `unfurl()` is
plain fetch and string work, so a server that wants it live imports the same function.
Left: the `og` item pairs with it (one produces facts, this draws them); a `favicon`
for pages that do not name one (Google's s2 service, or none); the x style's small-card
variant (image left, text right) for links whose picture is not 16:9.

### theme

Light, dark and follow-the-system are live: `next-themes` on the site (a blocking
script resolves the class before first paint, so nothing flashes), the `.dark` palette
in the `tokens` item rather than in this site's globals, and `theme-toggle` as an item
that takes a value and a setter so it works under any provider.

Left: the dark half of every item is now visible but only lightly walked. `code` ships
two shiki themes per token and both render; the rest wants a pass with the toggle in
hand.

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

Shape to build: an `og` item with `lib/og.tsx` = card layouts as components for `ImageResponse` (cover card, wordmark-only card, terminal-still card), one font loader (Geist, Geist Mono, Courier Prime from the same next/font sources the site already uses), the safe-area rules per platform baked into the layouts, and the size constants; plus a `registry:file` template `app/opengraph-image.tsx` that reads a page's title, description and cover and picks the layout. A demo page renders every layout at 1200x630 with the crop overlays of each platform drawn on top, so a card is designed once against all of them. Seeds: adriangalilea.com `lib/og.tsx` (cover card with local Geist TTFs), the garden's `app/icon.tsx` (SPROUT_PATHS through `ImageResponse`) and its `app/dev/mock/cover` page (the xtldr phone trio framed for the link preview).

**The QUOTE card is NOT part of this item and must not be rebuilt in it.** `renderQuoteSvg` in `quote-card` already is that layout — framework-free, measure ladder, balanced wrap, tone, focus — and needs no satori at all: an OG route returns the SVG rasterized, or the SVG itself where the unfurler takes one. The og item's quote job is only the route template that CALLS it. A second quote drawing inside `lib/og.tsx` is exactly the duplicate this whole registry exists to prevent.

@AGENTS.md
