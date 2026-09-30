import { Sample } from "@/app/samples"
import safetyNetsJson from "@/public/macos/awake/safety-nets.json"
import {
  frameAt,
  sceneClock,
  type Timeline,
} from "@/registry/base-nova/lib/macos-session"

// #region timeline
// awake's battery-floor scene, compiled by its own engine (`mise scene` in awake).
const FLOOR = safetyNetsJson as Timeline
const CLOCK = sceneClock(FLOOR)
// #endregion

/** The lib is time → stage. What a frame holds at a few instants, read straight off
 *  the fold: no player, no DOM, the same answer a still renderer would get. */
export default function MacosSessionDemo() {
  const at = [0.1, 0.35, 0.6, 1].map((p) => ({
    p,
    f: frameAt(FLOOR, CLOCK, p * CLOCK.total),
  }))
  return (
    <Sample
      name="fold"
      label="frameAt · the stage at four instants"
      with="timeline"
    >
      <div className="space-y-4 font-mono text-xs">
        <p className="text-muted-foreground lowercase">
          {FLOOR.steps.length} steps · {(CLOCK.total / 1000).toFixed(1)}s ·
          chord {FLOOR.chord}
        </p>
        <table className="w-full text-left">
          <thead className="text-muted-foreground lowercase">
            <tr>
              <th className="py-1 font-normal">at</th>
              <th className="font-normal">glyph</th>
              <th className="font-normal">world</th>
              <th className="font-normal">banner</th>
              <th className="font-normal">last line</th>
            </tr>
          </thead>
          <tbody>
            {at.map(({ p, f }) => (
              <tr key={p} className="border-border border-t align-top">
                <td className="py-1.5 pr-3 tabular-nums">
                  {((p * CLOCK.total) / 1000).toFixed(1)}s
                </td>
                <td className="pr-3">{f.glyph}</td>
                <td className="pr-3">
                  {f.world.clock} · {f.world.battery}% · lid {f.world.lid}
                  {f.world.asleep ? " · asleep" : ""}
                </td>
                <td className="pr-3">{f.banner?.text ?? "none"}</td>
                <td>{f.terminal.at(-1)?.text ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sample>
  )
}
