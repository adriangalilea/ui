import { Code } from "@/registry/base-nova/ui/code"
import { CommandCopy } from "../command-copy"

export function UpdateCommand({
  item,
  overwrite = false,
}: {
  item: string
  overwrite?: boolean
}) {
  const command = `npx shadcn add @ag/${item} --${overwrite ? "overwrite" : "dry-run"}`
  return (
    <CommandCopy
      command={command}
      component={item}
      metric={overwrite ? "updateApplyCopy" : "updatePreviewCopy"}
    >
      <Code
        compact
        copy={false}
        lang="sh"
        className="[&_code]:w-auto [&_pre]:whitespace-pre-wrap"
      >
        {command}
      </Code>
    </CommandCopy>
  )
}
