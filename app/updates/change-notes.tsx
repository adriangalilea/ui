import { InlineCode } from "@/registry/base-nova/ui/code-inline"

export function ChangeNotes({ notes }: { notes: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/75">
      {notes.map((note) => (
        <li key={note}>
          {note.split(/(`[^`]+`)/g).map((part, index) =>
            part.startsWith("`") ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: immutable text segments
              <InlineCode key={index}>{part.slice(1, -1)}</InlineCode>
            ) : (
              part
            ),
          )}
        </li>
      ))}
    </ul>
  )
}
