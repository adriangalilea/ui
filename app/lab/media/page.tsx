"use client"
import { useState } from "react"
import { Editor } from "@/registry/base-nova/ui/editor"
import { Image } from "@/registry/base-nova/ui/image"
import { LightboxSolo } from "@/registry/base-nova/ui/lightbox"
import { multipartUploader } from "@/registry/base-nova/ui/upload"
import { Video } from "@/registry/base-nova/ui/video"

const upload = multipartUploader("/media-upload-test")
export default function Page() {
  const [submitted, setSubmitted] = useState(0)
  const [cardClicks, setCardClicks] = useState(0)
  return (
    <main className="mx-auto max-w-xl space-y-8 p-8">
      <Video
        src="/bunny.mp4"
        width={1280}
        height={720}
        poster="/video-poster.jpg"
        label="test preview"
        mode="preview"
        controls
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSubmitted((n) => n + 1)
        }}
      >
        <Editor
          label="test editor"
          upload={upload}
          defaultValue="<p>first paragraph</p><p>last paragraph</p>"
        />
        <button type="submit">publish</button>
        <output id="submits">{submitted}</output>
      </form>
      <Video
        src="/bunny.mp4"
        width={1280}
        height={720}
        poster="/video-poster.jpg"
        label="plain preview"
        mode="preview"
      />
      <Video
        src="/bunny.mp4?once"
        width={160}
        height={90}
        label="once preview"
        mode="preview"
        playOn="visible-once"
        loop
      />
      {/* biome-ignore lint/a11y/useSemanticElements: models a clickable card containing a separate lightbox button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCardClicks((n) => n + 1)}
        onKeyDown={() => {}}
      >
        <LightboxSolo
          label="portal test"
          entry={{
            id: "river",
            media: {
              kind: "image",
              alt: "portal landscape",
              source: {
                src: "/glass-river.jpg",
                full: "/glass-river.jpg",
                width: 1200,
                height: 900,
              },
            },
          }}
        >
          <Image
            src="/glass-river.jpg"
            width={1200}
            height={900}
            alt="portal landscape"
            unoptimized
          />
        </LightboxSolo>
      </div>
      <output id="card-clicks">{cardClicks}</output>
    </main>
  )
}
