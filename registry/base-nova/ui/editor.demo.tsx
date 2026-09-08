"use client"
import { useState } from "react"
import { Sample } from "@/app/samples"
import { Editor } from "./editor"

export default function Demo() {
  const [html, setHtml] = useState("")
  return (
    <Sample
      name="editor"
      label="HTML in/out; supply upload for image paste, drop and attachments"
    >
      <Editor
        label="Example document"
        defaultValue="<h2>A place to think</h2><p>Write, select text, or make a list.</p>"
        onChange={setHtml}
      />
      <details className="mt-4">
        <summary>document HTML</summary>
        <pre className="overflow-auto text-xs">{html}</pre>
      </details>
    </Sample>
  )
}
