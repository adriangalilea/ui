import { Code } from "@/registry/base-nova/ui/code"

export function UpdateCommand({
  item,
  overwrite = false,
}: {
  item: string
  overwrite?: boolean
}) {
  return (
    <Code
      compact
      lang="sh"
      className="[&_code]:w-auto [&_pre]:whitespace-pre-wrap"
    >
      {`pnpm dlx shadcn@latest add @ag/${item} --${overwrite ? "overwrite" : "dry-run"}`}
    </Code>
  )
}
