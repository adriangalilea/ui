import type { Metadata } from "next"
import Link from "next/link"
import { item } from "../registry"
import { ChangeNotes } from "./change-notes"
import { changeId, readChanges } from "./changes"
import { UpdateCommand } from "./update-command"

export const metadata: Metadata = {
  title: "Updates · ui",
  description:
    "Component changes and how to update your installed registry source.",
}

export default async function UpdatesPage() {
  const changes = await readChanges()
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        ← ui
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Updates</h1>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-foreground/70">
        You own the source you install. These changes reach your project when
        you choose to update.
      </p>
      <details className="mt-6 border-b border-border pb-6">
        <summary className="cursor-pointer text-sm font-medium">
          How to update a component
        </summary>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Preview the files and dependencies that would change. Replace the
            item name with the component you use.
          </p>
          <UpdateCommand item="telegram-chat" />
          <p>
            Use <code>--diff</code> to inspect changes. If you customized the
            source, merge the changes you want. To replace your installed copy,
            use:
          </p>
          <UpdateCommand item="telegram-chat" overwrite />
          <p>
            Review changes to shared dependencies and styles, then run your
            project’s checks.
          </p>
        </div>
      </details>
      <div className="mt-12 divide-y divide-border">
        {changes.map((change) => (
          <section
            key={changeId(change)}
            id={changeId(change)}
            className="scroll-mt-8 space-y-4 py-8 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-semibold">
                {item(change.subject) ? (
                  <Link
                    href={`/${change.subject}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {change.subject}
                  </Link>
                ) : (
                  change.subject
                )}
              </h2>
              <a
                href={`#${changeId(change)}`}
                className="font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                <time dateTime={change.date}>{change.date}</time>
              </a>
            </div>
            <ChangeNotes notes={change.notes} />
          </section>
        ))}
      </div>
    </main>
  )
}
