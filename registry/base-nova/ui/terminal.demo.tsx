import { Terminal } from "@/registry/base-nova/ui/terminal"

const SESSION = `$ trash thesis-draft.txt
trashed: ~/Desktop/thesis-draft.txt

@700 $ trash list
thesis-draft.txt  2026-08-20 14:27  ~/Desktop/thesis-draft.txt

@700 $ trash restore thesis-draft.txt
restored: ~/Desktop/thesis-draft.txt
~ 0 items left`

export default function Demo() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Terminal
        session={SESSION}
        rows={12}
        alt="A terminal session: trash, list, restore."
      />
      <Terminal
        session={SESSION}
        accent="#e7a13c"
        rows={12}
        alt="The same session with an amber accent."
      />
    </div>
  )
}
