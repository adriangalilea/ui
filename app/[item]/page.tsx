import Link from "next/link"
import { notFound } from "next/navigation"
import { DEMOS } from "../demos"
import { ITEMS, item } from "../registry"

export function generateStaticParams() {
  return ITEMS.map((i) => ({ item: i.name }))
}

export default async function ItemPage({ params }: PageProps<"/[item]">) {
  const { item: name } = await params
  const meta = item(name)
  const Demo = DEMOS[name]
  if (!meta || !Demo) notFound()
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
      </div>
      <p className="mt-2 max-w-prose text-[0.9375rem] text-foreground/70">
        {meta.description}
      </p>
      <pre className="mt-4 w-fit rounded-lg border border-border bg-sidebar px-3 py-2 font-mono text-xs">
        npx shadcn add @ag/{meta.name}
      </pre>
      <div className="mt-16">
        <Demo />
      </div>
    </main>
  )
}
