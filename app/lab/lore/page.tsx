import Link from "next/link"
import { Reveal } from "@/registry/base-nova/ui/reveal"
import { Scrims } from "@/registry/base-nova/ui/scrims"
import { Terminal } from "@/registry/base-nova/ui/terminal"
import { Storyboard } from "./storyboard"

// The lab: a project page (untitled.garden/lore's shape) rebuilt on the primitives.
// Hero with a lead demo, sections that arrive, a pinned storyboard, a changelog.
// Nothing here is real lore content; the point is the scroll.

const HERO = `$ lore add youtube.com/watch?v=zjkBMFhNj_g
fetching · Intro to Large Language Models · 59:47
transcript · 8,412 words · en
~ stored in ~/Movies/lore/2026/09

@600 $ lore search "zip file of the internet"
00:04:12  LLMs: the 140GB "zip file" of the internet
00:41:03  tool use, the browser, the calculator
~ 2 hits`

const FEATURES = [
  {
    id: "archive",
    title: "everything you watch, kept",
    body: "Videos land in a folder you own, with their transcripts beside them. No cloud, no account, no app that forgets. The library is the folder.",
  },
  {
    id: "search",
    title: "search the words, jump to the second",
    body: "Every transcript is indexed. A hit is a timestamp; press it and the player lands there.",
  },
  {
    id: "keys",
    title: "every action has a key",
    body: "Press h while watching to see them. The pointer is a fallback, never the only path.",
  },
]

const RELEASES = [
  {
    version: "2.12.4",
    date: "2026-08-30",
    notes: [
      "local import from any folder",
      "app intents for shortcuts",
      "fix: highlights survive a rename",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-08-11",
    notes: [
      "a home screen of recent videos from every followed channel",
      "hide shorts",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-07-20",
    notes: [
      "move the library to any location",
      "naming conventions for library and browser",
    ],
  },
]

export default function Lab() {
  return (
    <div className="px-6 pb-24 sm:px-10 lg:px-14">
      <Scrims top={false} />
      <nav className="py-6">
        <Link
          href="/"
          className="font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          ← ui · lab
        </Link>
      </nav>

      <section
        id="overview"
        className="grid gap-12 lg:min-h-[80svh] lg:grid-cols-[1fr_2fr] lg:items-center"
      >
        <div className="space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">lore</h1>
          <p className="font-typewriter text-xl text-foreground/80">
            a local-first video archive for macOS
          </p>
          <a
            href="#features"
            className="inline-flex h-10 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-background"
            style={{ "--accent": "var(--brand)" } as React.CSSProperties}
          >
            download
          </a>
        </div>
        <figure className="space-y-3">
          <Terminal
            session={HERO}
            rows={16}
            alt="A terminal: lore adds a video, then finds a phrase in its transcript."
          />
          <figcaption className="text-sm italic text-muted-foreground/80">
            add a link, keep the video and its words, search the words.
          </figcaption>
        </figure>
      </section>

      <div className="mt-24 space-y-32">
        <section id="features" className="mx-auto max-w-4xl">
          <Reveal className="mx-auto mb-8 max-w-3xl">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-brand">01</span>
              <h2 className="text-2xl font-bold tracking-tight">features</h2>
            </div>
          </Reveal>
          <div className="space-y-16">
            {FEATURES.map((f) => (
              <Reveal key={f.id} as="article" id={f.id} className="space-y-4">
                <h3 className="mx-auto max-w-3xl text-lg font-semibold tracking-tight">
                  {f.title}
                </h3>
                <div className="aspect-video w-full rounded-xl border border-border bg-sidebar" />
                <p className="mx-auto max-w-3xl text-[0.9375rem] leading-relaxed text-foreground/80">
                  {f.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="story" className="mx-auto max-w-5xl">
          <Reveal className="mx-auto mb-8 max-w-3xl">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-brand">02</span>
              <h2 className="text-2xl font-bold tracking-tight">
                how a link becomes yours
              </h2>
            </div>
          </Reveal>
          <Storyboard />
        </section>

        <section id="changelog" className="mx-auto max-w-3xl">
          <Reveal className="mb-8">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-brand">03</span>
              <h2 className="text-2xl font-bold tracking-tight">changelog</h2>
            </div>
          </Reveal>
          <div className="relative ml-1.5 space-y-16 border-l border-border pl-8">
            {RELEASES.map((r) => (
              <Reveal key={r.version} as="section" className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[2.42rem] top-1.5 size-3 rounded-full border-2 border-background bg-brand"
                />
                <div className="mb-4 flex items-baseline gap-4">
                  <h3 className="font-mono text-lg font-semibold">
                    {r.version}
                  </h3>
                  <time className="font-mono text-xs text-muted-foreground">
                    {r.date}
                  </time>
                </div>
                <ul className="space-y-2 text-[0.9375rem] text-foreground/80">
                  {r.notes.map((n) => (
                    <li key={n}>· {n}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
