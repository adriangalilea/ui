# Changelog

Registry updates are opt-in source updates. Preview with `shadcn add @ag/<item>
--dry-run` or `--diff`; use `--overwrite` only when replacing your installed copy.

## 2026-09-08

### telegram-chat

- Fixed focus-fit sizing oscillating between adjacent pixel widths at some viewport
  heights. No API migration is required for this fix.
- Added `fit="focus"` with `viewport="container"` to size a phone around its focused
  exchange and bottom frame. The parent must provide a definite height.

### Installation and updates

- Local contributor installs now use shadcn for the full dependency graph, file
  placement, CSS, and updates. The helper no longer manually copies files afterward.
- Fresh-install and update checks cover standalone and workspace consumers,
  including dependency files, styles, and preservation of the consumer's `cn` utility.
