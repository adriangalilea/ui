# ui

Adrian Galilea's web components, as a [shadcn registry](https://ui.shadcn.com/docs/registry). One source; every site copies what it uses and owns the copy.

```jsonc
// components.json, in the consumer
{ "registries": { "@ag": "https://ui.adriangalilea.com/r/{name}.json" } }
```

```bash
npx shadcn add @ag/scroll-stage
```

Items live in `registry/base-nova/`, a demo beside each one, played at `/<item>` on the site (`mise dev`). `mise check` asserts the registry; `mise build` emits `public/r/*.json`.

| item | what |
|---|---|
| `tokens` | the studio's voice over shadcn's neutral theme: type voices, tones, the alpha ladder, motion |
| `scroll-stage` | the pinned stage: a tall track, a sticky stage, `--stage-p` from a CSS scroll-driven animation, acts as checkpoints |
| `reveal` | content that arrives as it enters the viewport |
| `scrims` | viewport fogs, scroll-linked or static inside a positioned container |
| `liquid-glass` | translucent surfaces with typed shapes, tones, native elements, and Tailwind overrides |
| `terminal-session` | the terminal-session script: parse, palette, timeline, SVG still |
| `terminal` | a phosphor terminal playing a session live |
| `telegram-chat` | a Telegram chat on an iPhone as a pure function of `{messages, progress}` |
| `telegram-summary` | a link-summary bot's conversation on top of `telegram-chat` |
| `lightbox` | one interruptible spring over a view: the image leaves the page under its chrome, gestures, every key in a table, deep links; `lightbox-motion` (the math) and `lightbox-actions` (the key table) beneath it |

Base UI + Tailwind 4 + Next 16. MIT.

### Glass

```tsx
import { Glass } from "@/components/ui/liquid-glass"

<Glass as="button" shape="pill" tone="dark" onClick={openPanel}>
  Open panel
</Glass>

<Glass
  tone="light"
  className="max-w-sm rounded-2xl p-6"
  style={{ "--glass-blur": "8px" }}
>
  Panel content
</Glass>
```

`as` accepts native elements or a component that forwards `className` and `ref`.
Native props and refs pass through; buttons default to `type="button"`.
Shapes are `circle`, `pill`, `bar`, `card`, and `surface` (material with no sizing).
Tones are `auto` (the page theme), `light`, and `dark`.
`--glass-blur` and `--glass-tint` can be inherited, set with Tailwind, or passed
through the typed `style` prop. `glassVariants({ shape, tone })` and `glass()`
provide the classes for existing elements; merge overrides with `cn()`.

The `/liquid-glass` showcase uses the lightbox demo's photograph IDs, served locally.
It glides horizontally between photos, snaps during manual navigation, and pauses
offscreen. Reduced-motion users start with a still gallery.

## Telegram storyboard

```tsx
import { TelegramChat, type ChatScript } from "@/components/ui/telegram-chat"

const adrian = { name: "Adrian", handle: "@adriangalilea" }
const script = {
  kind: "peer",
  chatName: adrian,
  chatTag: "online",
  alt: "Adrian and me planning a keyboard meetup.",
  messages: [
    { from: adrian, text: "Come over and try it." },
    { from: adrian, text: "Bring your old keyboard too." },
    { from: "me", text: "Saturday?" },
  ],
} satisfies ChatScript

<TelegramChat script={script} theme="page" />
```

Reuse a profile object, or put profiles in `script.people` and use their keys.
`"me"` means outgoing. Consecutive messages from the same account use half the
normal gap; only the last visible message gets a tail. Display names alone do not
merge different profiles.

Omit `progress` for autoplay when visible; use `progress={1}` for a finished still,
or pass a value from 0 to 1 to scrub. `frame="none"` presents the conversation
without a phone. This is a storyboard, not a messaging client: header and composer
chrome are decorative; links, scrolling, and reactions are interactive.

`theme` accepts `page`, `light`, or `dark`. The `wallpaper` prop is a doodle **mask
URL**, not a photograph. Tailwind classes on the root can override inherited CSS
variables, for example `className="[--tg-message-gap:4cqw]"`. The grouped gap stays
half that value. Light mode uses a colored wallpaper beneath translucent controls;
`--tg-wallpaper` controls that CSS background and `--tg-screen` its scrim tint.
