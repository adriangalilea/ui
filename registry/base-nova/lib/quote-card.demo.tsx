import {
  QUOTE_STEPS,
  quoteAccent,
  quoteClean,
  quoteFontSize,
  quoteWrap,
} from "@/registry/base-nova/lib/quote-card"

const SAMPLES = [
  "The purpose of a system is what it does.",
  "A designer knows he has achieved perfection not when there is nothing left to add, but when there is nothing left to take away.",
  "It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood.",
]

export default function Demo() {
  // The decisions a quote makes before anything draws it: the colour it keeps, the
  // size it is set at, and where the lines fall. Both emitters read these, which is
  // the only reason a card and its social preview stay the same quote.
  return (
    <div className="space-y-6">
      <table className="w-full font-mono text-xs">
        <thead className="text-muted-foreground">
          <tr className="text-left">
            <th className="pb-2 font-normal">chars</th>
            <th className="pb-2 font-normal">size @1200</th>
            <th className="pb-2 font-normal">lines</th>
            <th className="pb-2 font-normal">accent</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLES.map((text) => {
            const trimmed = quoteClean(text)
            const size = quoteFontSize(trimmed.length, 1200)
            return (
              <tr key={text} className="border-border border-t">
                <td className="py-2">{trimmed.length}</td>
                <td className="py-2">{size}px</td>
                <td className="py-2">{quoteWrap(trimmed, size, 680).length}</td>
                <td className="py-2">
                  <span
                    className="inline-block size-3 rounded-full align-middle"
                    style={{ background: quoteAccent(text) }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-muted-foreground text-sm">
        The ladder is a share of the frame, not a pixel size, so a 1200px
        preview and a 768px reading column step down at the same place in the
        text rather than at the same width. {QUOTE_STEPS.length} rungs, the last
        one open-ended.
      </p>
    </div>
  )
}
