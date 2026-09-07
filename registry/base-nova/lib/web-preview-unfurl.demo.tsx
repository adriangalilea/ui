import {
  hostOf,
  type Unfurl,
} from "@/registry/base-nova/lib/web-preview-unfurl"

/** What `mise unfurl <url>` printed for these, pasted here as data: the whole point.
 *  Nothing on this page fetched anything. */
const FACTS: Unfurl[] = [
  {
    url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    site: "YouTube",
    title: "[1hr Talk] Intro to Large Language Models",
    description: "Andrej Karpathy",
    image: "/xtldr-preview-karpathy.jpg",
  },
  {
    url: "https://paulgraham.com/ds.html",
    site: "paulgraham.com",
    title: "Do Things that Don't Scale",
    description:
      "One of the most common types of advice we give at Y Combinator is to do things that don't scale.",
  },
  {
    url: "https://github.com/Lulzx/cuda-metal",
    site: "GitHub",
    title: "GitHub - Lulzx/cuda-metal",
    description: "CUDA compiler and runtime for Apple Silicon",
    image: "/xtldr-preview-cuda-metal.png",
  },
]

export default function Demo() {
  return (
    <div className="space-y-6">
      <table className="w-full font-mono text-xs">
        <thead className="text-muted-foreground">
          <tr className="text-left">
            <th className="pb-2 font-normal">host</th>
            <th className="pb-2 font-normal">site</th>
            <th className="pb-2 font-normal">title</th>
            <th className="pb-2 font-normal">image</th>
          </tr>
        </thead>
        <tbody>
          {FACTS.map((f) => (
            <tr key={f.url} className="border-border border-t">
              <td className="py-2">{hostOf(f.url)}</td>
              <td className="py-2">{f.site}</td>
              <td className="py-2">{f.title}</td>
              <td className="py-2">{f.image ? "yes" : "none"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="max-w-prose text-muted-foreground text-sm">
        Five facts per link, fetched ONCE where the network is (
        <code className="font-mono text-xs">mise unfurl &lt;url&gt;</code>) and
        shipped as data. A browser cannot read a foreign page (CORS) and a build
        that fetches on every deploy depends on the other site being up; the
        card is a pure function of these. A server that wants them live imports
        the same <code className="font-mono text-xs">unfurl()</code>.
      </p>
    </div>
  )
}
