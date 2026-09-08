import { Sample } from "@/app/samples"
import { Code } from "@/registry/base-nova/ui/code"
import { Copy } from "@/registry/base-nova/ui/copy"
import { CopyLiveExample } from "@/registry/base-nova/ui/copy-live.demo"

export default function Demo() {
  return (
    <div className="space-y-8">
      <Sample name="command" label="beside a command">
        <Code compact lang="sh" className="max-w-xl">
          npx shadcn add @ag/copy
        </Code>
      </Sample>
      <Sample name="label" label="in a panel header">
        <div className="max-w-xl overflow-hidden rounded-xl border border-foreground/10">
          <div className="flex items-center justify-between gap-4 border-b border-foreground/10 bg-foreground/4 py-2 pl-4 pr-2">
            <span className="font-mono text-xs text-muted-foreground">
              note.txt
            </span>
            <Copy value="a little context goes a long way" label />
          </div>
          <p className="p-4 text-sm leading-relaxed text-foreground/80">
            a little context goes a long way
          </p>
        </div>
      </Sample>
      <Sample name="live" label="copy the current value">
        <CopyLiveExample />
      </Sample>
    </div>
  )
}
