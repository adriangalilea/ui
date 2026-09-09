import type { RegistryItem } from "shadcn/schema"
import registry from "@/registry.json"

/** ONE declaration of what a registry item is, for the site and for the scripts that
 *  read `registry.json`. The shape is shadcn's own, because shadcn is what parses the
 *  built file; `title`, `description` and `files` are required on top of it because
 *  `scripts/validate-registry.ts` fails any item missing one, so nothing downstream
 *  carries a branch for an item with no title to show or no source to read. That
 *  validator and `shadcn build` both run in `mise check`, and they are what the cast
 *  below stands on. */
export type Item = RegistryItem &
  Required<Pick<RegistryItem, "title" | "description" | "files">>

export const REPO = "https://github.com/adriangalilea/ui"

/** An item's source on GitHub. The point of a registry is that you own the copy, so
 *  reading the thing BEFORE installing it should not take a clone. */
export const sourceUrl = (i: Item): string =>
  `${REPO}/blob/main/${i.files[0].path}`

export const ITEMS = registry.items as Item[]
export const item = (name: string): Item | undefined =>
  ITEMS.find((i) => i.name === name)

/** The `@ag` items an item pulls in, which `shadcn add` installs for you. Read off
 *  the dependencies rather than kept by hand, so nothing here can drift from what the
 *  CLI actually does. `tokens` is excluded: everything visual wants it, and a line
 *  saying so under every row says nothing. */
const depsOf = (i: Item): Item[] =>
  (i.registryDependencies ?? [])
    .filter((d) => d.startsWith("@ag/") && d !== "@ag/tokens")
    .map((d) => item(d.slice("@ag/".length)))
    .filter((x): x is Item => x !== undefined)

/** A dependency is one of two different things, and the index must not confuse them.
 *  A PART shares the head's name (`quote-card` for `quote`, `lightbox-motion` for
 *  `lightbox`): a lib that exists for its head and stays its own item only because
 *  something installs it alone. Everything else the item USES is a standalone item in
 *  its own right (`quote` uses `avatar`, `avatar` uses `lightbox`): it keeps its own
 *  row, and the relation is shown from BOTH ends. Reading every dependency as a part
 *  nested `avatar` under `quote` and dropped `lightbox` off the index altogether. */
export const isPartOf = (part: Item, head: Item): boolean =>
  part.name.startsWith(`${head.name}-`)
export const partsOf = (i: Item): Item[] =>
  depsOf(i).filter((d) => isPartOf(d, i))
export const usesOf = (i: Item): Item[] =>
  depsOf(i).filter((d) => !isPartOf(d, i))
export const headOf = (i: Item): Item | undefined =>
  ITEMS.find((h) => isPartOf(i, h) && depsOf(h).includes(i))
export const usedBy = (i: Item): Item[] =>
  ITEMS.filter((u) => usesOf(u).includes(i))

/** Every standalone item leads its own row; its parts nest under it. */
export const FAMILIES: { head: Item; parts: Item[] }[] = ITEMS.filter(
  (i) => !headOf(i),
).map((head) => ({ head, parts: partsOf(head) }))
