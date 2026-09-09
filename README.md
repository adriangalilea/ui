# ui

Adrian Galilea's web components, as a [shadcn registry](https://ui.shadcn.com/docs/registry). One source; every site copies what it uses and owns the copy.

```jsonc
// components.json, in the consumer
{ "registries": { "@ag": "https://ui.adriangalilea.com/r/{name}.json" } }
```

```bash
npx shadcn add @ag/tokens @ag/scroll-stage
```

`@ag/tokens` is the studio's theme over shadcn's neutral one, installed once and
imported from your globals.css; items that draw with those tokens (`code`, `reveal`,
`quote`, `lightbox`) pull it in themselves, the rest render on shadcn's own variables.

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

The [component index](https://ui.adriangalilea.com) is the list of items, derived
from `registry.json` at build time; this README keeps no copy of it.

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
