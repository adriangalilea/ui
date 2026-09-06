import {
  type Quote as QuoteData,
  renderQuoteSvg,
} from "@/registry/base-nova/lib/quote-card"
import { Quote } from "@/registry/base-nova/ui/quote"

const SHORT: QuoteData = {
  text: "The purpose of a system is what it does.",
  author: { name: "Stafford Beer", href: "#" },
  date: "2002",
  seed: "beer/posiwid",
}

const LONG: QuoteData = {
  text: "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  author: { name: "Antoine de Saint-Exupéry", href: "#" },
  source: "#",
  date: "1939",
  seed: "saint-exupery/wind-sand-and-stars",
}

export default function Demo() {
  // The SAME quote, drawn twice: the card in the DOM, and the social preview by the
  // renderer in quote-card, which runs without React so a build can rasterize it. One
  // set of rules — the accent, the size ladder, the trim — so a shared link and the
  // page it opens cannot disagree about what somebody said.
  const still = renderQuoteSvg(LONG, { width: 1200, height: 630 })
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          display · a quote the page is about
        </div>
        <Quote {...LONG} display />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          inline · a quote inside prose, at the page's own size
        </div>
        <Quote {...SHORT} />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          still · quote-card, no react · 1200×630
        </div>
        {/* The still is a string of SVG, which is what a build script writes to disk
            and what an OG route can answer with. Shown here at the size a timeline
            crops it to. */}
        <div
          className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: as above
          dangerouslySetInnerHTML={{ __html: still }}
        />
      </div>
    </div>
  )
}
