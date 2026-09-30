import { Sample } from "@/app/samples"
import { Kbd, KeysText } from "@/registry/base-nova/ui/kbd"

export default function KbdDemo() {
  return (
    <div className="space-y-8">
      <Sample name="shortcut" label="one shortcut, any notation">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <Kbd keys="⌃⌥⌘A" />
          <Kbd keys="ctrl+alt+cmd+a" />
          <Kbd keys="⇧⌘F" />
          <Kbd keys="← →" />
          <Kbd keys="esc" />
        </div>
      </Sample>
      <Sample name="sentence" label="shortcuts inside text">
        <p className="text-sm text-foreground/80">
          <KeysText>Press ⌃⌥⌘A to keep your Mac awake, ⌘Q to quit.</KeysText>
        </p>
      </Sample>
    </div>
  )
}
