import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Quote as QuoteData,
  type QuoteTone,
  renderQuoteSvg,
} from "@/registry/base-nova/lib/quote-card"
import { Quote, type QuoteVariant } from "@/registry/base-nova/ui/quote"

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

const twain = { name: "Mark Twain", href: "#", avatar: TWAIN }

/** EVERY CASE A CONSUMER WILL HIT, not the three that flatter the layout. Short and long,
 *  a face and no face, a date, a source, an author with neither, and no author at all.
 *  Each row is rendered at every weight below, so what a weight does with a missing part
 *  is visible next to what it does with the part present. */
const CASES: readonly [string, QuoteData, { tone?: QuoteTone }][] = [
  [
    "medium · face · date · source",
    {
      text: "I didn't have time to write a short letter, so I wrote a long one instead.",
      author: twain,
      source: "#",
      date: "1876",
    },
    { tone: TWAIN_TONE },
  ],
  [
    "short · no face · date",
    {
      text: "The purpose of a system is what it does.",
      author: { name: "Stafford Beer", href: "#" },
      date: "2002",
    },
    {},
  ],
  [
    "long · face · no date",
    {
      text: "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena.",
      author: { ...twain, name: "Theodore Roosevelt" },
      source: "#",
    },
    { tone: TWAIN_TONE },
  ],
  ["no author at all", { text: "Less, but better." }, {}],
]

/** A still cannot fetch, so the face has to arrive as bytes. This is the whole of what
 *  an OG route does with an avatar, and the reason `renderQuoteSvg` takes a data URI
 *  rather than a URL: at the moment the preview is drawn there is no browser, no
 *  network and no origin to resolve `/mark-twain.png` against. */
function dataUri(publicPath: string): string {
  const buf = readFileSync(join(process.cwd(), "public", publicPath))
  const mime = publicPath.endsWith(".png") ? "image/png" : "image/jpeg"
  return `data:${mime};base64,${buf.toString("base64")}`
}

const WEIGHTS: readonly [QuoteVariant, string][] = [
  ["feature", "what a quote's own page opens with"],
  ["card", "the link preview, drawn in the DOM"],
  ["prose", "a quotation inside an article, one step up from the page"],
]

export default function Demo() {
  // The SAME quotes, drawn by both emitters: the weights below in the DOM, and the
  // previews by the renderer in quote-card, which runs without React so a build or an
  // OG route can draw one. Only the NAME names a face — the words stay on the serif slot
  // both surfaces default to; naming Geist here once drew the still in a sans under a
  // card in a serif, which is the drift this page exists to show is absent.
  const faces = { nameFamily: FACE, fonts: [FACE] }
  const stills = CASES.map(([label, q, x]) => [
    label,
    renderQuoteSvg(q, {
      ...faces,
      ...x,
      background: x.tone?.ground,
      accent: x.tone?.accent,
      avatar: q.author?.avatar ? dataUri(q.author.avatar) : undefined,
    }),
  ])
  return (
    <div className="space-y-16">
      {WEIGHTS.map(([variant, what]) => (
        <section key={variant} className="space-y-6">
          <div className="font-mono text-muted-foreground text-xs lowercase">
            {variant} · {what}
          </div>
          {CASES.map(([label, q, x]) => (
            <div key={label} className="space-y-2">
              <div className="font-mono text-muted-foreground/60 text-xs lowercase">
                {label}
              </div>
              <Quote {...q} tone={x.tone} variant={variant} />
            </div>
          ))}
        </section>
      ))}
      <section className="space-y-6">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          the still · the same cases, drawn without React
        </div>
        <p className="max-w-prose text-foreground/60 text-sm">
          Not a component and not on any page: this is what an OG route answers
          with, at the 1200×630 every platform crops from. It is drawn by{" "}
          <code className="font-mono text-xs">renderQuoteSvg</code>, which takes
          no React, so a build script can write it to disk or a route can return
          it. Inlined here only so it can be looked at without sharing anything
          — and next to the card above it, so a drift between them would be
          visible on this page before it was visible on a shared link.
        </p>
        <div className="grid gap-4">
          {stills.map(([label, svg]) => (
            <div key={label} className="space-y-2">
              <div className="font-mono text-muted-foreground/60 text-xs lowercase">
                {label}
              </div>
              <div
                className="overflow-hidden rounded-lg border border-border [&>svg]:h-auto [&>svg]:w-full"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: the renderer escapes every value it interpolates
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
