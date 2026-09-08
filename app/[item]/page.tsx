import { readFile } from "node:fs/promises"
import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Code } from "@/registry/base-nova/ui/code"
import { DEMOS } from "../demos"
import {
  headOf,
  ITEMS,
  type Item,
  item,
  partsOf,
  sourceUrl,
  usedBy,
  usesOf,
} from "../registry"
import { SamplesProvider } from "../samples"
import { extractSamples } from "../samples-extract"
import { SourceLink } from "../source-link"

export function generateStaticParams() {
  return ITEMS.map((i) => ({ item: i.name }))
}

/** The demo's OWN source, read at build time. Usage written by hand beside a demo
 *  drifts from it the first time either is touched; this cannot, because it is the
 *  same file that rendered the thing above it.
 *
 *  The path is DERIVED from the item's own first file, never guessed from a list of
 *  likely folders: `blocks/telegram-summary/` and `theme/` are both nested, so
 *  guessing silently dropped the code block from those pages. The validator
 *  guarantees a `<name>.demo.tsx` sits beside the source, which is the whole rule. */
async function demoSource(meta: Item) {
  const source = meta.files?.[0]?.path
  if (!source) return null
  const name = `${meta.name}.demo.tsx`
  const file = path.join(process.cwd(), path.dirname(source), name)
  return { code: await readFile(file, "utf8"), file: name }
}

export default async function ItemPage({ params }: PageProps<"/[item]">) {
  const { item: name } = await params
  const meta = item(name)
  const Demo = DEMOS[name]
  if (!meta || !Demo) notFound()
  const src = await demoSource(meta)
  const install = `npx shadcn add @ag/${meta.name}`
  // Every relation an item has, from THIS end. The other end says the reverse: what
  // `quote` lists under "uses", `avatar` lists under "used by". Derived, so the two
  // ends cannot disagree.
  const head = headOf(meta)
  const relations: [string, Item[]][] = [
    ["comes with", partsOf(meta)],
    ["part of", head ? [head] : []],
    ["uses", usesOf(meta)],
    ["used by", usedBy(meta)],
  ]
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link
        href="/"
        className="font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        ← ui
      </Link>
      <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{meta.name}</h1>
        <span className="font-mono text-xs text-muted-foreground">
          {meta.type.replace("registry:", "")}
        </span>
        <SourceLink href={sourceUrl(meta)} />
      </div>
      <p className="mt-2 max-w-prose text-[0.9375rem] text-foreground/70">
        {meta.description}
      </p>
      <div className="mt-4">
        <Code compact lang="sh" className="w-fit max-w-full">
          {install}
        </Code>
      </div>
      {relations
        .filter(([, items]) => items.length > 0)
        .map(([kind, items], n) => (
          <p
            key={kind}
            className={`${n === 0 ? "mt-3" : "mt-1"} font-mono text-xs text-muted-foreground`}
          >
            {kind}{" "}
            {items.map((p, i) => (
              <span key={p.name}>
                {i > 0 && ", "}
                <Link
                  href={`/${p.name}`}
                  className="underline-offset-4 hover:underline"
                >
                  {p.name}
                </Link>
              </span>
            ))}
          </p>
        ))}

      {/* Each example's own code, cut from the demo source it was drawn by and
          rendered here on the server; the demo's <Sample> blocks pick theirs up. */}
      <div className="mt-16">
        <SamplesProvider
          samples={Object.fromEntries(
            Object.entries(src ? extractSamples(src.code) : {}).map(
              ([name, code]) => [
                name,
                <Code key={name} lang="tsx" notations={false}>
                  {code}
                </Code>,
              ],
            ),
          )}
        >
          <Demo />
        </SamplesProvider>
      </div>

      {src && (
        <section className="mt-24 space-y-4">
          <h2 className="font-mono text-xs text-muted-foreground">
            the demo above, verbatim
          </h2>
          {/* notations OFF: this file is being shown as itself, and a demo that
              writes `[!code ...]` inside a string would have it eaten out of its own
              listing, which is the one thing "verbatim" may not do. */}
          <Code lang="tsx" filename={src.file} notations={false}>
            {src.code}
          </Code>
        </section>
      )}
    </main>
  )
}
