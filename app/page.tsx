import Link from "next/link"
import { FAMILIES, type Item, REPO } from "./registry"
import { SourceLink } from "./source-link"

const Row = ({
  name,
  kind,
  description,
  part,
}: {
  name: string
  kind: string
  description: string
  part?: boolean
}) => (
  <Link
    href={`/${name}`}
    className="group grid gap-2 py-5 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
  >
    <span className="flex items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-1">
      <span
        className={`whitespace-nowrap transition-colors group-hover:text-foreground ${part ? "font-medium text-foreground/80" : "font-semibold"}`}
      >
        {name}
      </span>
      <span className="shrink-0 font-mono text-[0.6875rem] text-muted-foreground">
        {kind}
      </span>
    </span>
    <span className="min-w-0 text-sm leading-relaxed text-foreground/60 transition-colors group-hover:text-foreground/80">
      {description}
    </span>
  </Link>
)

const ItemRow = ({ i, part }: { i: Item; part?: boolean }) => (
  <Row
    name={i.name}
    kind={part ? "comes with" : i.type.replace("registry:", "")}
    description={i.description}
    part={part}
  />
)

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-typewriter text-3xl">ui</h1>
        <SourceLink href={REPO} />
      </div>
      <p className="mt-2 text-[0.9375rem] text-foreground/70">
        web components as a shadcn registry. add one with{" "}
        <code className="font-mono text-xs">
          npx shadcn add @ag/&lt;item&gt;
        </code>
      </p>
      <ul className="mt-16 divide-y divide-border">
        {FAMILIES.map(({ head, parts }) => (
          <li key={head.name}>
            <ItemRow i={head} />
            {parts.length > 0 && (
              <ul className="mb-2 ml-4 border-border border-l pl-4 sm:ml-4">
                {parts.map((p) => (
                  <li key={p.name}>
                    <ItemRow i={p} part />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        <li>
          <Row
            name="lab"
            kind="page"
            description="a whole project page on the primitives, where scroll work lands first"
          />
        </li>
      </ul>
    </main>
  )
}
