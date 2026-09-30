"use client"

import * as React from "react"
import { Sample } from "@/app/samples"
import {
  IphoneFrame,
  MacbookFrame,
  StudioDisplayFrame,
} from "@/registry/base-nova/ui/device-frame"

function Screen({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_25%_25%,#315c6c,transparent_65%),linear-gradient(145deg,#182b38,#111318)] text-white">
      <span className="font-mono text-sm">{label}</span>
    </div>
  )
}

export default function DeviceFrameDemo() {
  const [closed, setClosed] = React.useState(false)
  return (
    <div className="space-y-16">
      <Sample name="devices" label="three frames, any content">
        <div className="grid w-full items-center gap-12 p-8 md:grid-cols-[1fr_2fr]">
          <div className="mx-auto w-full max-w-56">
            <IphoneFrame>
              <Screen label="your app" />
            </IphoneFrame>
          </div>
          <div className="space-y-12">
            <MacbookFrame>
              <Screen label="your workspace" />
            </MacbookFrame>
            <StudioDisplayFrame>
              <Screen label="your canvas" />
            </StudioDisplayFrame>
          </div>
        </div>
      </Sample>
      <Sample name="lid" label="lid · the frame moves it, you say where">
        <div className="space-y-6 p-8">
          <MacbookFrame lid={closed ? "closed" : "open"}>
            <Screen label="your workspace" />
          </MacbookFrame>
          <button
            type="button"
            className="mx-auto block rounded-md border border-border px-3 py-1.5 font-mono text-xs lowercase"
            onClick={() => setClosed((c) => !c)}
          >
            {closed ? "open the lid" : "close the lid"}
          </button>
        </div>
      </Sample>
      <Sample
        name="positions"
        label="a number for a caller that owns time: 0 · 0.5 · 1"
      >
        <div className="grid gap-8 p-8 md:grid-cols-3">
          {[0, 0.5, 1].map((lid) => (
            <MacbookFrame key={lid} lid={lid}>
              <Screen label={`lid ${lid}`} />
            </MacbookFrame>
          ))}
        </div>
      </Sample>
    </div>
  )
}
