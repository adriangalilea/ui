"use client"

import { Sample } from "@/app/samples"
import { CardLink } from "@/registry/base-nova/ui/card-link"

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="card"
        label="01 · a card that opens its page · click anywhere; the link inside is its own; select text and nothing opens"
      >
        <CardLink
          href="https://paulgraham.com/ds.html"
          className="mx-auto max-w-md space-y-2 rounded-2xl border border-border p-4 transition-colors hover:bg-foreground/3"
        >
          <div className="font-semibold">Do Things that Don&apos;t Scale</div>
          <p className="text-foreground/70 text-sm">
            One of the most common types of advice we give at Y Combinator is to
            do things that don&apos;t scale. Select this sentence: nothing
            opens.
          </p>
          <a
            href="https://paulgraham.com/ds.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            paulgraham.com
          </a>
        </CardLink>
      </Sample>

      <Sample
        name="nested"
        label="02 · nested · the inner card opens its own place, the outer one everything else"
      >
        <CardLink
          href="https://paulgraham.com/"
          className="mx-auto max-w-md space-y-3 rounded-2xl border border-border p-4 transition-colors hover:bg-foreground/3"
        >
          <div className="font-semibold">paulgraham.com</div>
          <CardLink
            href="https://paulgraham.com/ds.html"
            className="rounded-xl border border-border p-3 text-sm transition-colors hover:bg-foreground/3"
          >
            Do Things that Don&apos;t Scale
          </CardLink>
          <a
            href="https://paulgraham.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            open
          </a>
        </CardLink>
      </Sample>
    </div>
  )
}
