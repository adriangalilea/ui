"use client"

import { useState } from "react"
import river from "@/public/glass-river.jpg"
import { Image } from "@/registry/base-nova/ui/image"

export default function Page() {
  const [src, setSrc] = useState("/image-test.jpg")
  return (
    <main className="p-8">
      <button type="button" onClick={() => setSrc("/image-next.jpg")}>
        change source
      </button>
      <Image
        src={src}
        width={800}
        height={600}
        alt="Test landscape"
        loading="eager"
        unoptimized
        blurDataURL={river.blurDataURL}
        className="w-full max-w-sm rounded-xl"
      />
      <p id="after-image">The image reserves its space before it loads.</p>
    </main>
  )
}
