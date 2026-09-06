import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Quote as QuoteData,
  renderQuoteSvg,
} from "@/registry/base-nova/lib/quote-card"
import { Quote } from "@/registry/base-nova/ui/quote"

const AVATAR = "/adriangalilea.jpg"

const SHORT: QuoteData = {
  text: "The purpose of a system is what it does.",
  author: { name: "Stafford Beer", href: "#" },
  date: "2002",
  seed: "beer/posiwid",
}

const LONG: QuoteData = {
  text: "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  author: { name: "Adrian Galilea", href: "#", avatar: AVATAR },
  source: "#",
  date: "1939",
  seed: "saint-exupery/wind-sand-and-stars",
}

/** A still cannot fetch, so the face has to arrive as bytes. This is the whole of what
 *  an OG route does with an avatar, and the reason `renderQuoteSvg` takes a data URI
 *  rather than a URL: at the moment the preview is drawn there is no browser, no
 *  network and no origin to resolve `/adriangalilea.jpg` against. */
function dataUri(publicPath: string): string {
  const buf = readFileSync(join(process.cwd(), "public", publicPath))
  const mime = publicPath.endsWith(".png") ? "image/png" : "image/jpeg"
  return `data:${mime};base64,${buf.toString("base64")}`
}

export default function Demo() {
  // The SAME quote, drawn twice: the card in the DOM, and the social preview by the
  // renderer in quote-card, which runs without React so a build can rasterize it. One
  // set of rules — the accent, the size ladder, the trim — so a shared link and the
  // page it opens cannot disagree about what somebody said.
  const still = renderQuoteSvg(LONG, { avatar: dataUri(AVATAR) })
  const plain = renderQuoteSvg(SHORT)
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
          still · quote-card, no react · 1200×630, the size every platform crops
        </div>
        {/* A string of SVG: what a build script writes to disk, and what an OG route
            answers with. With a face it bleeds into the right edge under a gradient;
            without one the words take the whole frame. */}
        <div className="grid gap-4">
          <div
            className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: the renderer escapes every value it interpolates
            dangerouslySetInnerHTML={{ __html: still }}
          />
          <div
            className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: as above
            dangerouslySetInnerHTML={{ __html: plain }}
          />
        </div>
      </div>
    </div>
  )
}
