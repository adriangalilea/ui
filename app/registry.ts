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
