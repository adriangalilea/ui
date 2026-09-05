import { Code } from "@/registry/base-nova/ui/code"

const TSX = `import { Scrims } from "@/components/ui/scrims"

export default function Page() {
  return (
    <div className="px-6">
      {/* fixed to the viewport, so it lives outside the flow */}
      <Scrims top={false} />
      <article>…</article>
    </div>
  )
}`

const SH = `npx shadcn add @ag/code
# the copy control comes with it`

export default function Demo() {
  return (
    <div className="space-y-10">
      <Code lang="tsx" filename="app/page.tsx">
        {TSX}
      </Code>
      <div className="space-y-3">
        <div className="font-mono text-xs text-muted-foreground">
          a shell block, and no filename: the tab falls back to the language
        </div>
        <Code lang="bash">{SH}</Code>
      </div>
      <div className="space-y-3">
        <div className="font-mono text-xs text-muted-foreground">
          long lines scroll inside the frame, which keeps its corners
        </div>
        <Code lang="ts" filename="one-liner.ts">
          {`export const projected = (v: number) => v * (0.998 / (1 - 0.998)) // UIKit's projection: velocity in px/ms out to where it comes to rest`}
        </Code>
      </div>
    </div>
  )
}
