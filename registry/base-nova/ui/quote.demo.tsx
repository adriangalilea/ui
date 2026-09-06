import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type Quote as QuoteData,
  type QuoteTone,
  renderQuoteSvg,
  toneFrom,
} from "@/registry/base-nova/lib/quote-card"
import { Lightbox } from "@/registry/base-nova/ui/lightbox"
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

/** WHAT THE CARD NEEDS FROM A PORTRAIT'S PIXELS ARRIVES AS A SIDECAR, and this page
 *  consumes it exactly the way a site would: `public/<name>.json` beside
 *  `public/<name>.png`, two numbers — where the subject sits and the picture's tone —
 *  written once by `mise portrait` on the machine that has Vision and sips. Nothing here
 *  decodes a pixel. Twain is a monochrome photograph, so his ground stays grey; Franklin
 *  (the Duplessis oil) comes out warm and Confucius (the Wu Daozi rubbing) rosy, because
 *  a monochrome portrait proves the tone rule does nothing and a rule that does nothing
 *  cannot be judged. */
type Look = {
  tone?: QuoteTone
  focus?: number
  full?: { src: string; width: number; height: number }
}
function sidecar(publicPng: string): Look {
  const json = join(
    process.cwd(),
    "public",
    publicPng.replace(/\.[^.]+$/, ".json"),
  )
  // The sidecar holds the FACTS - where the subject is, the average colour, the natural
  // size - and the tone is derived here by the rule, so a change to the rule needs no
  // re-annotation. The size is what the avatar's lightbox needs to fly the portrait home.
  const { focus, average, size } = JSON.parse(readFileSync(json, "utf8")) as {
    focus: number
    average: [number, number, number]
    size: [number, number]
  }
  return {
    focus,
    tone: toneFrom(...average),
    full: { src: publicPng, width: size[0], height: size[1] },
  }
}

/** EVERY CASE A CONSUMER WILL HIT, not the three that flatter the layout. Short and long,
 *  a face and no face, colour and monochrome, a date, a source, an author with neither,
 *  and no author at all. Each row is rendered at every weight below, so what a weight
 *  does with a missing part is visible next to what it does with the part present. */
const CASES: readonly [string, QuoteData, Look][] = [
  [
    "long · warm portrait · date",
    {
      text: "Those who would give up essential Liberty, to purchase a little temporary Safety, deserve neither Liberty nor Safety.",
      author: {
        name: "Benjamin Franklin",
        href: "#",
        avatar: "/benjamin-franklin.png",
        full: sidecar("/benjamin-franklin.png").full,
      },
      date: "1755",
    },
    sidecar("/benjamin-franklin.png"),
  ],
  [
    "short · rosy drawing · no date",
    {
      text: "The man who chases two rabbits, catches neither.",
      author: {
        name: "Confucius",
        href: "#",
        avatar: "/confucius.png",
        full: sidecar("/confucius.png").full,
      },
    },
    sidecar("/confucius.png"),
  ],
  [
    "medium · monochrome · date · source",
    {
      text: "I didn't have time to write a short letter, so I wrote a long one instead.",
      author: {
        name: "Mark Twain",
        href: "#",
        avatar: TWAIN,
        full: sidecar(TWAIN).full,
      },
      source: "#",
      date: "1876",
    },
    sidecar(TWAIN),
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
      background: x.tone?.ground,
      accent: x.tone?.accent,
      focus: x.focus,
      avatar: q.author?.avatar ? dataUri(q.author.avatar) : undefined,
    }),
  ])
  // ONE lightbox provider for the page, the way the lightbox is meant to be mounted: every
  // avatar below is a trigger into it, so a face that invites a closer look can be looked
  // at closer.
  return (
    <Lightbox>
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
                <Quote {...q} tone={x.tone} focus={x.focus} variant={variant} />
              </div>
            ))}
          </section>
        ))}
        <section className="space-y-6">
          <div className="font-mono text-muted-foreground text-xs lowercase">
            the still · the same cases, drawn without React
          </div>
          <p className="max-w-prose text-foreground/60 text-sm">
            Not a component and not on any page: this is what an OG route
            answers with, at the 1200×630 every platform crops from. It is drawn
            by <code className="font-mono text-xs">renderQuoteSvg</code>, which
            takes no React, so a build script can write it to disk or a route
            can return it. Inlined here only so it can be looked at without
            sharing anything — and next to the card above it, so a drift between
            them would be visible on this page before it was visible on a shared
            link.
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
    </Lightbox>
  )
}
