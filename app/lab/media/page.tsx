"use client"
import { useState } from "react"
import { Editor } from "@/registry/base-nova/ui/editor"
import { multipartUploader } from "@/registry/base-nova/ui/upload"
import { Video } from "@/registry/base-nova/ui/video"

const upload = multipartUploader("/media-upload-test")
export default function Page() {
  const [submitted, setSubmitted] = useState(0)
  return (
    <main className="mx-auto max-w-xl space-y-8 p-8">
      <Video
        src="/bunny.mp4"
        width={1280}
        height={720}
        poster="/video-poster.jpg"
        label="test preview"
        mode="preview"
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
    </main>
  )
}
