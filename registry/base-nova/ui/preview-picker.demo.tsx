"use client"

import { useState } from "react"
import { Sample } from "@/app/samples"
import { PreviewPicker } from "@/registry/base-nova/ui/preview-picker"

export default function Demo() {
  // #region state
  const [language, setLanguage] = useState("en")
  const [example, setExample] = useState(0)
  // #endregion
  return (
    <div className="space-y-10">
      <Sample name="languages" label="languages with icons" with="state">
        <PreviewPicker
          label="Preview language"
          value={language}
          onChange={setLanguage}
          options={[
            { value: "en", label: "English", icon: "🇬🇧" },
            { value: "es", label: "Español", icon: "🇪🇸" },
          ]}
        />
        <p className="mt-4 text-foreground/70" aria-live="polite">
          {language === "en"
            ? "A little more context."
            : "Un poco más de contexto."}
        </p>
      </Sample>
      <Sample name="examples" label="text and disabled choices" with="state">
        <PreviewPicker
          label="Preview example"
          value={example}
          onChange={setExample}
          options={[
            { value: 0, label: "overview" },
            { value: 1, label: "details" },
            { value: 2, label: "coming soon", disabled: true },
          ]}
        />
        <p className="mt-4 text-foreground/70" aria-live="polite">
          {example === 0
            ? "The whole picture."
            : "The small things that matter."}
        </p>
      </Sample>
    </div>
  )
}
