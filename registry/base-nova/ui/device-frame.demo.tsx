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
  return (
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
  )
}
