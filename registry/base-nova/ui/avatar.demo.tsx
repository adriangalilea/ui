import { readFileSync } from "node:fs"
import { join } from "node:path"
import { toneFrom } from "@/registry/base-nova/lib/quote-card"
import { Avatar, type AvatarSize } from "@/registry/base-nova/ui/avatar"

/** The same three portraits the quote demo uses, read the same way: `public/<name>.json`
 *  beside `public/<name>.png`, written once by `mise portrait` on a machine with Vision
 *  and sips. This page decodes no pixel. */
function portrait(png: string, name: string) {
  const json = join(process.cwd(), "public", png.replace(/\.[^.]+$/, ".json"))
  const { focus, average, size } = JSON.parse(readFileSync(json, "utf8")) as {
    focus: number
    average: [number, number, number]
    size: [number, number]
  }
  return {
    src: png,
    alt: name,
    focus,
    tone: toneFrom(...average),
    full: { src: png, width: size[0], height: size[1] },
  }
}

const PEOPLE = [
  portrait("/benjamin-franklin.png", "Benjamin Franklin"),
  portrait("/confucius.png", "Confucius"),
  portrait("/mark-twain.png", "Mark Twain"),
]
const SIZES: readonly [AvatarSize, string][] = [
  ["sm", "a feed line, a comment"],
  ["md", "an attribution"],
  ["lg", "a header"],
]

export default function Demo() {
  return (
    <div className="space-y-12">
      {SIZES.map(([size, where]) => (
        <section key={size} className="space-y-3">
          <div className="font-mono text-muted-foreground text-xs lowercase">
            {size} · {where}
          </div>
          <div className="flex items-center gap-4">
            {PEOPLE.map((p) => (
              <Avatar key={p.src} {...p} size={size} />
            ))}
          </div>
        </section>
      ))}
      <section className="space-y-3">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          without `full` · a picture, not a trigger
        </div>
        <div className="flex items-center gap-4">
          {PEOPLE.map(({ full: _full, ...p }) => (
            <Avatar key={p.src} {...p} size="md" />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="font-mono text-muted-foreground text-xs lowercase">
          without a sidecar · centred, ringed in the page's border
        </div>
        <div className="flex items-center gap-4">
          <Avatar src="/mark-twain.png" alt="Mark Twain" size="md" />
        </div>
      </section>
      <p className="max-w-prose text-foreground/60 text-sm">
        Click any face with a <code className="font-mono text-xs">full</code> to
        open the portrait: it opens alone, one viewer per face, never a reel of
        every face on the page. Every one is positioned on its subject from the
        sidecar&apos;s <code className="font-mono text-xs">focus</code> and
        ringed in its own average colour.
      </p>
    </div>
  )
}
