import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Quote as QuoteData,
  type QuoteTone,
  renderQuoteSvg,
} from "@/registry/base-nova/lib/quote-card"
import { Quote } from "@/registry/base-nova/ui/quote"

/** Mark Twain, photographed before 1910 and long in the public domain. A real face,
 *  because the card slides a portrait so its subject clears the dissolve: a landscape in
 *  that slot proves the layout runs and nothing about whether it works. */
const TWAIN = "/mark-twain.png"

/** What THIS page has: `app/layout.tsx` loads Geist through next/font, so the browser
 *  resolves it for an inlined still too. A consumer names their own, and a still that
 *  is rasterized offline needs the face where its rasterizer looks — fontconfig for
 *  librsvg, a font buffer for next/og. Naming one that is not there is the bug this
 *  demo exists to not repeat: it does not fail, it substitutes. */
const FACE = "Geist"

const LETTER: QuoteData = {
  text: "I didn't have time to write a short letter, so I wrote a long one instead.",
  author: { name: "Mark Twain", href: "#", avatar: TWAIN },
  source: "#",
  date: "1876",
}

/** THE PICTURE'S OWN COLOUR, and the card takes it as an argument because it cannot go
 *  and find it: `toneFrom` turns an average pixel into a ground and an ink, and getting
 *  that average means decoding a PNG, which is the consumer's job. `mise portrait` and
 *  `mise still` do it with `sips`; an OG route does it wherever it already holds the
 *  bytes. Twain is a monochrome photograph, so his ground stays grey — a hue taken on
 *  faith would have put a colour behind him that nobody chose. */
const TWAIN_TONE: QuoteTone = {
  ground: "hsl(0, 0%, 9%)",
  accent: "hsl(0, 0%, 65%)",
}

const SYSTEM: QuoteData = {
  text: "The purpose of a system is what it does.",
  author: { name: "Stafford Beer", href: "#" },
  date: "2002",
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
  // The page really loads Geist, so the still is told it can name it — and told so
  // EXPLICITLY, because a face that is merely hoped for is substituted in silence.
  const faces = { fontFamily: FACE, nameFamily: FACE, fonts: [FACE] }
  const withFace = renderQuoteSvg(LETTER, {
    ...faces,
    avatar: dataUri(TWAIN),
  })
  const without = renderQuoteSvg(SYSTEM, faces)
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          display · the card, in the DOM
        </div>
        <Quote {...LETTER} tone={TWAIN_TONE} display />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          inline · a quote inside prose, at the page's own size
        </div>
        <Quote {...SYSTEM} />
      </div>
      <div className="space-y-2">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          the same card, drawn as a still · what a shared link looks like
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
