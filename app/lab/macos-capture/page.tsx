import { Suspense } from "react"
import { Capture } from "./capture"

// The bench scripts/macos-capture.ts films: one macos stage, seekable frame by frame.
// ?src=/macos/<app>/<scene>.json &device=macbook|display &accent=%23hex &width=1200
// &ground=%23hex (the art is read from art.json beside the scene).
export default function Page() {
  return (
    <main className="dark">
      <Suspense>
        <Capture />
      </Suspense>
    </main>
  )
}
