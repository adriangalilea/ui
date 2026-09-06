import registry from "@/registry.json"

export interface Item {
  name: string
  type: string
  title: string
  description: string
  registryDependencies?: string[]
  /** The item's own files. The first one locates the demo beside it. */
  files?: { path: string; type: string }[]
}

export const REPO = "https://github.com/adriangalilea/ui"

/** An item's source on GitHub. The point of a registry is that you own the copy, so
 *  reading the thing BEFORE installing it should not take a clone. */
export const sourceUrl = (i: Item): string => {
  const file = i.files?.[0]?.path
  return file ? `${REPO}/blob/main/${file}` : REPO
}

export const ITEMS: Item[] = registry.items
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
