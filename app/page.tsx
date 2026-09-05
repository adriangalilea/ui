import Link from "next/link"
import { FAMILIES, type Item, REPO } from "./registry"

/** One entry. Three columns on a wide screen; on a narrow one the kind is a label
 *  beside the name and the description gets the whole width, because the columns do
 *  not shrink and a phone was giving the description about ten characters.
 *  `sm:contents` dissolves the mobile-only pairing at the breakpoint, so there is one
 *  set of markup and no duplicated row. */
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
    className="flex flex-col gap-1 py-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-baseline sm:gap-4"
  >
    <span className="flex items-baseline justify-between gap-4 sm:contents">
      {/* DOM order is the wide layout's; the narrow one moves the kind to the end of
          its line, so there is one order utility rather than two fighting. */}
      <span
        className={`shrink-0 font-mono text-xs text-muted-foreground max-sm:order-last ${part ? "sm:w-24" : "sm:w-40"}`}
      >
        {kind}
      </span>
      <span
        className={part ? "font-medium text-foreground/80" : "font-semibold"}
      >
        {name}
      </span>
    </span>
    <span className="text-sm text-foreground/60">{description}</span>
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
        <a
          href={REPO}
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          source ↗
        </a>
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
              <ul className="mb-2 ml-4 border-border border-l pl-4 sm:ml-16">
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
