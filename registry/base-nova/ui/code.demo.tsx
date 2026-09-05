import { Code } from "@/registry/base-nova/ui/code"

const PLAIN = `import { Scrims } from "@/components/ui/scrims"

export default function Page() {
  return (
    <div className="px-6">
      {/* fixed to the viewport, so it lives outside the flow */}
      <Scrims top={false} />
      <article>…</article>
    </div>
  )
}`

// The notations live in the source, so they move with the line they mark when the
// code is edited. Shiki strips them from the render; the clipboard keeps the source.
const MARKED = `const b = panBounds(view, fitted, band)
// [!code highlight]
return { x: clamp(view.x, -b.x, b.x), y: clamp(view.y, -b.y, b.y), s: view.s }`

const DIFF = `.ag-scrim {
  position: fixed;
  right: 0;
  left: 0;
  margin: 0; // [!code ++]
  pointer-events: none;
}`

const FOCUS = `function swipeSlides(travel, slideW) {
  assert(slideW > 0, "a slide has no width")
  return Math.floor(Math.abs(travel) / slideW + 1 - SWIPE_COMMIT + 1e-9) // [!code focus]
}`

const WORDS = `// [!code word:momentum]
// The momentum is the platform's; only the momentum knows when fingers left.`

const SH = `npx shadcn add @ag/code
# the copy control comes with it`

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-prose text-[0.9375rem] leading-relaxed text-foreground/70">
    {children}
  </p>
)

export default function Demo() {
  return (
    <div className="space-y-12">
      <Code lang="tsx" filename="app/page.tsx">
        {PLAIN}
      </Code>

      <div className="space-y-3">
        <Note>
          A line is marked with a{" "}
          <code className="font-mono text-xs">[!code highlight]</code> comment
          on the line before it. The mark runs the full width and keeps a bar in
          the gutter, which is the part that survives scrolling a long line
          sideways.
        </Note>
        <Code lang="ts" filename="clampPan.ts">
          {MARKED}
        </Code>
      </div>

      <div className="space-y-3">
        <Note>
          A diff is <code className="font-mono text-xs">[!code ++]</code> and{" "}
          <code className="font-mono text-xs">[!code --]</code>. The sign is a
          real character in the gutter, not just a colour: colour alone is
          invisible to a reader who cannot separate red from green.
        </Note>
        <Code lang="css" filename="scrims.css">
          {DIFF}
        </Code>
      </div>

      <div className="space-y-3">
        <Note>
          <code className="font-mono text-xs">[!code focus]</code> steps the
          rest of the block back. Hover to bring it all forward: a reader who
          wants the surrounding lines should not have to leave the page for
          them.
        </Note>
        <Code lang="js" filename="swipe.js">
          {FOCUS}
        </Code>
      </div>

      <div className="space-y-3">
        <Note>
          <code className="font-mono text-xs">[!code word:momentum]</code> marks
          a word wherever it appears on the lines below.
        </Note>
        <Code lang="ts">{WORDS}</Code>
      </div>

      <div className="space-y-3">
        <Note>
          For source you do not own, and so cannot write a comment into,{" "}
          <code className="font-mono text-xs">highlight="2,5-6"</code> takes the
          lines from outside. This page uses it: an item page renders its demo
          file verbatim and must not edit it to document it.
        </Note>
        <Code lang="tsx" filename="app/page.tsx" highlight="2,5-6" lines>
          {PLAIN}
        </Code>
      </div>

      <div className="space-y-3">
        <Note>
          A shell block, with no filename: the tab falls back to the language.
        </Note>
        <Code lang="bash">{SH}</Code>
      </div>
    </div>
  )
}
