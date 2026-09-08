import { Code } from "@/registry/base-nova/ui/code"
import { Checks } from "./checks"

export const metadata = { robots: { index: false, follow: false } }
export default function Page() {
  return (
    <main className="p-6 space-y-8">
      <Code className="rounded-none" compact lang="bash">
        pnpm build
      </Code>
      <Checks />
    </main>
  )
}
