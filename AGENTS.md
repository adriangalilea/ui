<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Registry changes

Change shared components in `registry/base-nova/`, rebuild the registry, then install
the affected items into consumers through `mise add` (see README). Do not manually
patch the registry and consumer copies independently. Keep app-specific composition
in the consumer. Review installer diffs, run the relevant consumer checks, and add
meaningful public fixes or migration requirements to CHANGELOG.md before shipping.
