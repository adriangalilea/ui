import registry from "@/registry.json"

export interface Item {
  name: string
  type: string
  title: string
  description: string
  registryDependencies?: string[]
}

export const ITEMS: Item[] = registry.items
export const item = (name: string): Item | undefined =>
  ITEMS.find((i) => i.name === name)

/** The `@ag` items an item brings with it, which `shadcn add` installs for you. Read
 *  off the dependencies rather than kept by hand, so the index cannot drift from what
 *  the CLI actually does. `tokens` is excluded: everything visual wants it, and a
 *  line saying so under every row says nothing. */
export const partsOf = (i: Item): Item[] =>
  (i.registryDependencies ?? [])
    .filter((d) => d.startsWith("@ag/") && d !== "@ag/tokens")
    .map((d) => item(d.slice("@ag/".length)))
    .filter((x): x is Item => x !== undefined)

/** An item nothing else pulls in is one you would add on its own; the rest arrive
 *  with it. The index leads with the first and nests the second under it, so which
 *  ones are meant to be used together is visible instead of implied by a name. */
export const FAMILIES: { head: Item; parts: Item[] }[] = (() => {
  const part = new Set(ITEMS.flatMap((i) => partsOf(i)).map((i) => i.name))
  return ITEMS.filter((i) => !part.has(i.name)).map((head) => ({
    head,
    parts: partsOf(head),
  }))
})()
