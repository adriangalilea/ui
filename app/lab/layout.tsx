import type { Metadata } from "next"
import type { ReactNode } from "react"

// The lab is where compositions are judged by eye before they become demos. It is
// reachable, never indexed: a search result must land on an item page, not a bench.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function LabLayout({ children }: { children: ReactNode }) {
  return children
}
