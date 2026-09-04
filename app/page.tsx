import Link from "next/link"
import { ITEMS } from "./registry"

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-typewriter text-3xl">ui</h1>
      <p className="mt-2 text-[0.9375rem] text-foreground/70">
        web components as a shadcn registry. add one with{" "}
        <code className="font-mono text-xs">
          npx shadcn add @ag/&lt;item&gt;
        </code>
      </p>
      <ul className="mt-16 divide-y divide-border">
        {ITEMS.map((i) => (
          <li key={i.name}>
            <Link
              href={`/${i.name}`}
              className="flex items-baseline gap-4 py-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-40 shrink-0 font-mono text-xs text-muted-foreground">
                {i.type.replace("registry:", "")}
              </span>
              <span className="font-semibold">{i.name}</span>
              <span className="text-sm text-foreground/60">
                {i.description}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/lab" className="flex items-baseline gap-4 py-4">
            <span className="w-40 shrink-0 font-mono text-xs text-muted-foreground">
              page
            </span>
            <span className="font-semibold">lab</span>
            <span className="text-sm text-foreground/60">
              a whole project page on the primitives, where scroll work lands
              first
            </span>
          </Link>
        </li>
      </ul>
    </main>
  )
}
