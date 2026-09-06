# ui

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
- **Usage is never written by hand.** An item page renders its own `<name>.demo.tsx` verbatim, read at build time, under "the demo above, verbatim". Prose usage beside a demo drifts the first time either is touched; the same file cannot. So a demo is also the documentation: write it as the code you would want copied.
- **The index is derived, never hand-kept**: `FAMILIES` in `app/registry.ts` reads `registryDependencies`, leads with the item you would add and nests what comes with it, so the page cannot drift from what `shadcn add` really installs. A demo shows the whole family working together where that is the point (the terminal page draws one script live AND as a still, which is the claim the pair exists to make).
- Imports inside items use `@/registry/base-nova/{ui,lib,hooks,blocks}/...`; the CLI rewrites them to the consumer's aliases. A `.css` beside a component is imported relatively (`./x.css`) and ships as a second `registry:ui` file.
- Motion is CSS-first: scroll-driven animations (`animation-timeline`) drive numbers into custom properties; React state changes on checkpoints, never per frame. Reduced motion renders the completed state.
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
- **Say which kind of claim is being made**, every time. "Verified structurally,
  unverified by hand" is a complete and honest status; "verified" alone, off a passing
  script, is a lie that has been told here before and cost rounds.
- **Ask him.** Starting a dev server and asking how something feels is welcome, not an
  imposition — he has said so explicitly. A question costs one message; guessing at
  feel and shipping it costs a round, and shipping it silently costs trust.
- The failure mode this exists to stop: a script passes, the agent writes "confirmed",
  and the thing is atrocious in the hand. Instrumentation has also been WRONG here —
  reporting a stale build, blaming the wrong gesture, printing 1000 Hz over a stream
  running at thirty. An instrument is a witness, not a judge.

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
used per image, and a separate provider around anything meant to be browsed. The one
thing that IS page-wide: entry `id`s, because `history` writes `#lb=<id>`. Two
providers with the same id on one page fight over the hash.

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

**Pending: a hand-set focus, per picture.** `focus` slides a portrait so its subject
clears the dissolve, and `scripts/portrait.swift` fills it in from Vision — a face, else
the attention model's subject, else the middle. That is right often, not always: two
people in a frame, a face in profile at the edge, a bust whose plinth outweighs its
head. The card already takes the number by hand, so the missing half is on the CONTENT
side — somewhere to pin one per picture, the way `portraits.json` pins a slug to an
article, and the still reading it in preference to the detector. Build it the first time
a card needs it, not before; auto is the default and the override is the exception.

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

1. adriangalilea.com prose figures (retire its `components/lightbox.tsx`), the garden's feature stills, videoclub.
2. `scrollspy` (scroll-intent stand-down), `page-exit` / `page-enter` (the faked cross-origin morph: exit animation, Speculation Rules prerender with `Supports-Loading-Mode: credentialed-prerender` on the subdomain, entrance), `keymap` + `cursor-list` / `cursor-grid` (swift-utils Keymap; the lightbox's action table is the first client).
3. `charts` + `chart-frame` (adriangalilea.com's wrappers are the taste anchor), `particle-charts` as the opt-in playful voice, `narrated` (Sonoscript: real times only, click to seek, opt-in follow).
4. A frameless `telegram`, `checklist`, `kanban`, `code-scrolly`.
5. The garden landing (a static grid under a fog that promises content), then later: cover-image with blur and grain, `magic-input`, the media-library kit for videoclub and lore.

### telegram: the phone is in the way of the words

`telegram-chat` always draws the whole iPhone (notch, status bar, header, composer, home indicator) and there is no way to ask it not to. At the width a feature card gives it, the device eats most of the space and the message text lands too small to read, so a component whose entire job is to show what a bot SAID cannot carry its own copy. Fix in this order:

1. **A frameless mode: the messages, big enough to read.** Same script, same bubbles, no device chrome, so the text can take the width the phone was taking. This is the one that unblocks xtldr's feature media.
2. **Decide what the frameless mode sits on**, which is undecided: bubbles floating on a bare canvas (the wallpaper, or nothing), or a zoomed CROP of the phone with a border, which keeps the client's own framing at a readable size. The first is cleaner, the second is more obviously Telegram. Try both before choosing, because the answer is which one still reads as Telegram once the device is gone.
3. **Telegram Desktop's layout** (wider column, different bubble geometry, a sidebar). Deferred until 1 and 2 land.

The phone is not a wrapper to delete: the status bar and composer are what make a screenshot read as a real chat rather than a mockup. So this is a mode, chosen per use, not a replacement.

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

Shape to build: an `og` item with `lib/og.tsx` = card layouts as components for `ImageResponse` (cover card, quote card, wordmark-only card, terminal-still card), one font loader (Geist, Geist Mono, Courier Prime from the same next/font sources the site already uses), the safe-area rules per platform baked into the layouts, and the size constants; plus a `registry:file` template `app/opengraph-image.tsx` that reads a page's title, description and cover and picks the layout. A demo page renders every layout at 1200x630 with the crop overlays of each platform drawn on top, so a card is designed once against all of them. Seeds: adriangalilea.com `lib/og.tsx` (quote and cover cards with local Geist TTFs), the garden's `app/icon.tsx` (SPROUT_PATHS through `ImageResponse`) and its `app/dev/mock/cover` page (the xtldr phone trio framed for the link preview).

@AGENTS.md
