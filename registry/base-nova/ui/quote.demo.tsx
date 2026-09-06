import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Quote as QuoteData,
  renderQuoteSvg,
} from "@/registry/base-nova/lib/quote-card"
import { Quote } from "@/registry/base-nova/ui/quote"

/** Mark Twain, photographed before 1910 and long in the public domain. A real face,
 *  because the still crops one from the top (`xMidYMin slice`) so a head stays a head:
 *  a landscape in that slot proves the layout runs and nothing about whether it works. */
const TWAIN = "/mark-twain.png"

const LETTER: QuoteData = {
  text: "I didn't have time to write a short letter, so I wrote a long one instead.",
  author: { name: "Mark Twain", href: "#", avatar: TWAIN },
  source: "#",
  date: "1876",
  seed: "quotes/mark-twain/on-brevity",
}

const SYSTEM: QuoteData = {
  text: "The purpose of a system is what it does.",
  author: { name: "Stafford Beer", href: "#" },
  date: "2002",
  seed: "quotes/stafford-beer/posiwid",
}

/** A still cannot fetch, so the face has to arrive as bytes. This is the whole of what
 *  an OG route does with an avatar, and the reason `renderQuoteSvg` takes a data URI
 *  rather than a URL: at the moment the preview is drawn there is no browser, no
 *  network and no origin to resolve `/mark-twain.png` against. */
function dataUri(publicPath: string): string {
  const buf = readFileSync(join(process.cwd(), "public", publicPath))
  const mime = publicPath.endsWith(".png") ? "image/png" : "image/jpeg"
  return `data:${mime};base64,${buf.toString("base64")}`
}

export default function Demo() {
  // The SAME quotes, drawn twice: the cards below in the DOM, and the previews by the
  // renderer in quote-card, which runs without React so a build or an OG route can
  // draw one. The accent, the size ladder and the trim come from there, so a shared
  // link and the page it opens cannot disagree about what somebody said.
  const withFace = renderQuoteSvg(LETTER, { avatar: dataUri(TWAIN) })
  const without = renderQuoteSvg(SYSTEM)
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          display · a quote the page is about
        </div>
        <Quote {...LETTER} display />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          inline · a quote inside prose, at the page's own size
        </div>
        <Quote {...SYSTEM} />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          the social preview · what a shared link looks like
        </div>
        <p className="max-w-prose text-foreground/60 text-sm">
          Not a component and not on any page: this is what an OG route answers
          with, at the 1200×630 every platform crops from. It is drawn by{" "}
          <code className="font-mono text-xs">renderQuoteSvg</code>, which takes
          no React, so a build script can write it to disk or a route can return
          it. Inlined here only so it can be looked at without sharing anything.
        </p>
        <div className="grid gap-4">
          <div
            className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: the renderer escapes every value it interpolates
            dangerouslySetInnerHTML={{ __html: withFace }}
          />
          <div
            className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: as above
            dangerouslySetInnerHTML={{ __html: without }}
          />
        </div>
      </div>
    </div>
  )
}
