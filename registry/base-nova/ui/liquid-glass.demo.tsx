"use client"

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Pause,
  Play,
} from "lucide-react"
import * as React from "react"
import { Sample } from "@/app/samples"
import { Glass, type GlassTone } from "@/registry/base-nova/ui/liquid-glass"

// #region photos
// Local copies of the river, mountains and valley photographs (Lorem Picsum).
const PHOTOS = [
  {
    src: "/glass-river.jpg",
    name: "Along the river",
    note: "The long way home.",
    alt: "A river winding between forested mountains",
  },
  {
    src: "/glass-mountains.jpg",
    name: "Last light",
    note: "A little longer before sunset.",
    alt: "Orange canyon cliffs in the evening sun",
  },
  {
    src: "/glass-valley.jpg",
    name: "No hurry",
    note: "One more stop before we go.",
    alt: "A green valley beneath distant mountains",
  },
] as const
// #endregion

// #region gallery
function Gallery({ tone }: { tone: "dark" | "light" }) {
  const viewport = React.useRef<HTMLElement>(null)
  const [active, setActive] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const go = React.useCallback((index: number) => {
    const el = viewport.current
    if (!el) return
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    el.scrollTo({
      left: index * el.clientWidth,
      behavior: reduced ? "instant" : "smooth",
    })
  }, [])

  React.useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPlaying(!motion.matches)
    const change = () => setPlaying(!motion.matches)
    motion.addEventListener("change", change)
    return () => motion.removeEventListener("change", change)
  }, [])

  React.useEffect(() => {
    if (!playing) return
    const el = viewport.current
    if (!el) return
    let visible = false
    let frame = 0
    let last = 0
    let index = Math.round(el.scrollLeft / el.clientWidth)
    let direction = index === PHOTOS.length - 1 ? -1 : 1
    let elapsed = 0
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting)
      },
      { threshold: 0.25 },
    )
    observer.observe(el)
    // Hold a complete photograph, then glide to its neighbour. Reverse at the
    // ends instead of jumping back to the first photograph.
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 0
      last = now
      if (visible && !document.hidden) {
        elapsed += dt
        const t = Math.min(1, Math.max(0, (elapsed - 2400) / 1600))
        const eased = reduced
          ? t === 1
            ? 1
            : 0
          : t * t * t * (t * (t * 6 - 15) + 10)
        el.scrollLeft = (index + direction * eased) * el.clientWidth
        if (t === 1) {
          index += direction
          if (index === 0 || index === PHOTOS.length - 1) direction *= -1
          elapsed = 0
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [playing])

  const stop = () => setPlaying(false)
  const photo = PHOTOS[active] ?? PHOTOS[0]

  return (
    <div className="space-y-3">
      <div
        data-gallery={tone}
        className="relative isolate overflow-hidden rounded-[2rem] bg-zinc-900 [--scene-height:32rem] sm:[--scene-height:36rem]"
      >
        <section
          ref={viewport}
          data-playing={playing}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll this overflow region
          tabIndex={0}
          aria-label={`${tone} glass photo gallery`}
          className="flex h-(--scene-height) snap-x snap-mandatory data-[playing=true]:snap-none overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white [&::-webkit-scrollbar]:hidden"
          onWheel={stop}
          onTouchStart={stop}
          onKeyDown={stop}
          onScroll={(event) => {
            const el = event.currentTarget
            setActive(
              Math.min(
                PHOTOS.length - 1,
                Math.max(0, Math.round(el.scrollLeft / el.clientWidth)),
              ),
            )
          }}
        >
          {PHOTOS.map((item, index) => (
            <div
              key={item.src}
              className="relative h-(--scene-height) w-full shrink-0 snap-start"
            >
              {/* biome-ignore lint/performance/noImgElement: portable demo assets, served locally */}
              <img
                src={item.src}
                alt={item.alt}
                width={1200}
                height={900}
                loading={index === 0 ? "eager" : "lazy"}
                className="absolute inset-0 size-full object-cover"
              />
              <div
                className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent"
                aria-hidden
              />
              <div className="absolute right-6 bottom-28 left-6 text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.4)] sm:right-10 sm:bottom-32 sm:left-10">
                <p className="mb-2 text-xs tracking-[0.16em] uppercase opacity-75">
                  Weekend away · 0{index + 1}
                </p>
                <p className="text-3xl font-medium tracking-tight sm:text-5xl">
                  {item.name}
                </p>
                <p className="mt-2 text-sm opacity-80">{item.note}</p>
              </div>
            </div>
          ))}
        </section>
        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center gap-3 sm:inset-x-6 sm:top-6">
          <Glass
            as="button"
            shape="circle"
            tone={tone}
            className="pointer-events-auto size-12 sm:size-14"
            aria-label="Back to first photo"
            onClick={() => {
              stop()
              go(0)
            }}
          >
            <ChevronLeft className="size-6 -translate-x-0.5" />
          </Glass>
          <Glass
            shape="pill"
            tone={tone}
            className="mx-auto h-12 min-w-0 flex-1 flex-col justify-center gap-0 px-3 py-1 text-center sm:h-14 sm:max-w-64 sm:px-6"
          >
            <span className="text-sm font-semibold leading-5 sm:text-base">
              Adrian
            </span>
            <span className="truncate text-xs leading-4">online</span>
          </Glass>
          <Glass
            as="a"
            href="/adriangalilea.jpg"
            shape="circle"
            tone={tone}
            className="pointer-events-auto size-12 p-1 sm:size-14"
            aria-label="View Adrian’s avatar"
          >
            {/* biome-ignore lint/performance/noImgElement: use the same local portrait as Telegram */}
            <img
              src="/adriangalilea.jpg"
              alt=""
              width={56}
              height={56}
              className="size-full rounded-full object-cover"
            />
          </Glass>
        </div>
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center gap-3 sm:inset-x-6 sm:bottom-6">
          <Glass
            as="button"
            shape="circle"
            tone={tone}
            className="pointer-events-auto size-12 sm:size-14"
            aria-label="Previous photo"
            disabled={active === 0}
            onClick={() => {
              stop()
              go(active - 1)
            }}
          >
            <ArrowLeft className="size-5" />
          </Glass>
          <Glass
            shape="bar"
            tone={tone}
            className="pointer-events-auto mx-auto h-12 min-w-0 flex-1 justify-between px-3 sm:h-14 sm:max-w-64 sm:px-4"
          >
            <span className="text-sm tabular-nums">
              0{active + 1} <span className="opacity-45">/ 03</span>
            </span>
            <button
              type="button"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              aria-pressed={playing}
              onClick={() => setPlaying(!playing)}
              className="grid size-9 place-items-center rounded-full hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {playing ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </button>
            <button
              type="button"
              aria-label={saved ? "Unsave album" : "Save album"}
              aria-pressed={saved}
              onClick={() => setSaved(!saved)}
              className="rounded-full px-2 py-2 text-xs font-medium hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {saved ? <Check className="size-4" /> : "Save"}
            </button>
          </Glass>
          <Glass
            as="button"
            shape="circle"
            tone={tone}
            className="pointer-events-auto size-12 sm:size-14"
            aria-label="Next photo"
            disabled={active === PHOTOS.length - 1}
            onClick={() => {
              stop()
              go(active + 1)
            }}
          >
            <ArrowRight className="size-5" />
          </Glass>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight className="size-3" /> Scroll the photographs, or press
          play.
        </span>
        <span role="status" aria-live={playing ? "off" : "polite"}>
          {photo.name} · {active + 1} of {PHOTOS.length}
        </span>
      </div>
    </div>
  )
}
// #endregion

// #region composition
function Composition() {
  const input = React.useRef<HTMLInputElement>(null)
  const [tone, setTone] = React.useState<GlassTone>("auto")
  return (
    <div className="space-y-6">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-xs text-muted-foreground">Tone</legend>
        {(["auto", "light", "dark"] as const).map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-foreground"
          >
            <input
              type="radio"
              name="glass-tone"
              value={value}
              checked={tone === value}
              onChange={() => setTone(value)}
              className="accent-current"
            />
            {value}
          </label>
        ))}
      </fieldset>
      <div className="relative overflow-hidden rounded-3xl bg-[url(/glass-valley.jpg)] bg-cover bg-center p-6 sm:p-10">
        <Glass tone={tone} className="max-w-sm space-y-4">
          <div>
            <p className="text-base font-semibold">Make it yours</p>
            <p className="mt-1 text-sm opacity-70">
              Native elements, normal props, and Tailwind overrides.
            </p>
          </div>
          <label className="block text-xs font-medium">
            Album name
            <input
              ref={input}
              defaultValue="Weekend away"
              className="mt-2 w-full rounded-lg border border-current/15 bg-transparent px-3 py-2 text-sm outline-offset-2"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Glass
              as="button"
              tone={tone}
              shape="pill"
              onClick={() => input.current?.focus()}
              className="text-xs font-medium"
            >
              Rename
            </Glass>
            <Glass
              as="button"
              tone={tone}
              shape="pill"
              disabled
              className="text-xs"
            >
              Shared
            </Glass>
          </div>
        </Glass>
      </div>
    </div>
  )
}
// #endregion

export default function Demo() {
  return (
    <div className="space-y-12">
      <Sample
        name="dark"
        with="photos gallery"
        label="01 · dark glass · photographs move beneath the controls"
      >
        <Gallery tone="dark" />
      </Sample>
      <Sample
        name="light"
        with="photos gallery"
        label="02 · light glass · the same photographs and proportions"
      >
        <Gallery tone="light" />
      </Sample>
      <Sample
        name="composition"
        with="composition"
        label="03 · composition · theme, native props, refs, and disabled states"
      >
        <Composition />
      </Sample>
      <p className="max-w-prose text-sm text-muted-foreground">
        Use <code>shape</code> and <code>tone</code> for the defaults,{" "}
        <code>as</code> for the element, and <code>className</code> for sizing.
        Set <code>--glass-blur</code> or <code>--glass-tint</code> through
        Tailwind or the typed <code>style</code> prop.{" "}
        <code>shape="surface"</code> applies only the material.
      </p>
    </div>
  )
}
