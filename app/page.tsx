import Link from "next/link"
import { FAMILIES, type Item } from "./registry"

const Row = ({ i, part }: { i: Item; part?: boolean }) => (
  <Link
    href={`/${i.name}`}
    className="flex items-baseline gap-4 py-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span
      className={`${part ? "w-24" : "w-40"} shrink-0 font-mono text-xs text-muted-foreground`}
    >
      {part ? "comes with" : i.type.replace("registry:", "")}
    </span>
    <span className={part ? "font-medium text-foreground/80" : "font-semibold"}>
      {i.name}
    </span>
    <span className="text-sm text-foreground/60">{i.description}</span>
  </Link>
)

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
        {FAMILIES.map(({ head, parts }) => (
          <li key={head.name}>
            <Row i={head} />
            {parts.length > 0 && (
              <ul className="mb-2 ml-16 border-l border-border pl-4">
                {parts.map((p) => (
                  <li key={p.name}>
                    <Row i={p} part />
                  </li>
                ))}
              </ul>
            )}
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
