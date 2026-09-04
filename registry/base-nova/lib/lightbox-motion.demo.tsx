import {
  COAST,
  HAND,
  MACHINE,
  project,
  rubber,
  Spring,
  sourceView,
  type Tuning,
} from "@/registry/base-nova/lib/lightbox-motion"

const W = 320
const H = 120

function trace(
  tuning: Tuning,
  target = 100,
  vel = 0,
  seconds = 1,
): { points: string; ms: number } {
  const s = new Spring<"v">({ v: 0 }, { v: 0.5 })
  s.aim({ v: target }, tuning, { v: vel })
  const pts: string[] = [`0,${H}`]
  let t = 0
  for (let i = 0; i < 120 * seconds; i++) {
    const done = s.step(8.333)
    t += 8.333
    pts.push(
      `${(t / 1000 / seconds) * W}, ${H - (s.value.v / target) * (H / 1.2)}`,
    )
    if (done) break
  }
  return { points: pts.join(" "), ms: t }
}

function curve(
  f: (x: number) => number,
  from: number,
  to: number,
  scale: number,
) {
  const pts: string[] = []
  for (let i = 0; i <= 64; i++) {
    const x = from + ((to - from) * i) / 64
    pts.push(`${(i / 64) * W},${H - f(x) * scale}`)
  }
  return pts.join(" ")
}

function Plot({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-xs text-muted-foreground">{title}</div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-border bg-sidebar"
        role="img"
        aria-label={title}
      >
        {children}
      </svg>
      <p className="text-sm text-foreground/55">{note}</p>
    </div>
  )
}

export default function Demo() {
  const machine = trace(MACHINE)
  const hand = trace(HAND)
  const coast = trace(COAST, project(0, 2), 2, 2)
  const kick = trace(MACHINE, project(0, 2), 2, 2)
  const clip = (aspect: number) =>
    sourceView(
      { x: 0, y: 0, w: 100, h: 100 / aspect, radius: 0 },
      { w: 300, h: 200 },
      { top: 0, left: 0, w: 1000, h: 800 },
    ).clip.h
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <Plot
        title={`spring · machine ζ 1 · f 4.5 hz · settles ${Math.round(machine.ms)} ms`}
        note="Enter, exit, zoom, pan recovery, step: critically damped, no overshoot."
      >
        <polyline
          points={machine.points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Plot>
      <Plot
        title={`spring · hand ζ 0.82 · f 4.5 hz · settles ${Math.round(hand.ms)} ms`}
        note="Dismiss cancel and slide commit: a little weight past the target."
      >
        <polyline
          points={hand.points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Plot>
      <Plot
        title={`spring · coast ζ 1 · f ${COAST.f.toFixed(2)} hz · a 2 px/ms flick settles ${Math.round(coast.ms)} ms`}
        note="Momentum after a release: ω = 1/199, the decay the projection assumes, so the image never outruns the hand. The faint trace is the same flick under MACHINE: it kicks to twice the hand's speed first."
      >
        <polyline
          points={kick.points}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        <polyline
          points={coast.points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Plot>
      <Plot
        title="zoom rubber · 0.5 → 3 over [1, 2]"
        note="Soft under fit (0.15), stiff over the ceiling (0.05); the spring returns it."
      >
        <polyline
          points={curve((x) => rubber(x, 1, 2), 0.5, 3, H / 3)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1="0"
          x2={W}
          y1={H - H / 3}
          y2={H - H / 3}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
        <line
          x1="0"
          x2={W}
          y1={H - (2 * H) / 3}
          y2={H - (2 * H) / 3}
          stroke="currentColor"
          strokeOpacity="0.15"
        />
      </Plot>
      <Plot
        title="cover clip · trigger aspect 0.5 → 3 over a 3:2 fit"
        note="The vertical inset that crops the fit box into the trigger's shape; zero where aspects match."
      >
        <polyline
          points={curve((a) => clip(a), 0.5, 3, H / 60)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </Plot>
    </div>
  )
}
