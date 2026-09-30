import { Sample } from "@/app/samples"
import type { Person } from "@/registry/base-nova/lib/person"

// #region person
const ADA: Person = {
  name: "Ada",
  handle: "@ada",
}
// #endregion

/** One person, defined once: the name and handle every surface that shows them reads
 *  (a chat's header, a Mac's lock screen). Without a picture, a surface draws its own
 *  placeholder, here the initial. */
export default function PersonDemo() {
  return (
    <Sample
      name="person"
      label="one person, handed to every surface"
      with="person"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-foreground/10 font-semibold">
          {ADA.name[0]}
        </span>
        <span className="leading-tight">
          <span className="block font-medium">{ADA.name}</span>
          <span className="block text-muted-foreground text-xs">
            {ADA.handle}
          </span>
        </span>
      </div>
    </Sample>
  )
}
