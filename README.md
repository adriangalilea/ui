# ui

Adrian Galilea's web components, as a [shadcn registry](https://ui.shadcn.com/docs/registry). One source; every site copies what it uses and owns the copy.

```jsonc
// components.json, in the consumer
{ "registries": { "@ag": "https://ui.adriangalilea.com/r/{name}.json" } }
```

```bash
npx shadcn add @ag/scroll-stage
```

Browse the components and their live examples at [ui.adriangalilea.com](https://ui.adriangalilea.com).

### Updating installed components

Installed source belongs to your project. Registry releases never change it automatically.
Read [Updates](https://ui.adriangalilea.com/updates) (also available in
[the changelog](CHANGELOG.md)), preview an update, then decide which changes to adopt:

```bash
pnpm dlx shadcn@latest add @ag/telegram-chat --dry-run
pnpm dlx shadcn@latest add @ag/telegram-chat --diff
# Replace the installed files when you want the registry version:
pnpm dlx shadcn@latest add @ag/telegram-chat --overwrite
```

Review the dependency and CSS changes too. If you customized a component, merge
the relevant changes instead of overwriting your customization. Check the resulting
Git diff and run your application's checks.
The installer can change import ordering; apply your normal formatter before
judging whether an apparent difference is a component change.

| item | what |
|---|---|
| `image` | proportional or cropped images, matched blur previews, and optional native GIF hover covers |
| `video` | native player or poster-first hover/focus preview, with touch and reduced-motion behavior |
| `media-asset` | validated asset metadata shared between preparation, upload and rendering |
| `prepare-media` | Node preparation and a CLI; original images, measured dimensions, previews, posters and opt-in FFmpeg video |
| `upload` | application-owned upload transport and UI state: progress, preparation, cancel and retry |
| `editor` | Wordgard rich text with HTML in/out and an injected media uploader |
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

## Examples and composition

Each component page shows runnable examples and the exact source that rendered
them. Use those examples for props and composition; the README does not maintain
a second copy. Start with [glass](https://ui.adriangalilea.com/liquid-glass),
[Telegram stories](https://ui.adriangalilea.com/telegram-chat), or the
[component index](https://ui.adriangalilea.com).

## Media pipeline

[Preparation](https://ui.adriangalilea.com/prepare-media) runs in Node or a CLI and
returns files plus [asset metadata](https://ui.adriangalilea.com/media-asset).
Your application writes the files to its own storage before publishing the metadata.
[Upload](https://ui.adriangalilea.com/upload) supplies transport and progress state;
[Editor](https://ui.adriangalilea.com/editor) accepts that same uploader.

[Image](https://ui.adriangalilea.com/image) uses Next.js optimization on any Next
host, or your own loader. [Video](https://ui.adriangalilea.com/video) presents native
players and cover previews. GIFs stay intact unless you explicitly request a
boomerang rendition; GIF and video boomerangs both produce a video asset. FFmpeg
preparation belongs in a Node worker or CLI, not an edge request.
