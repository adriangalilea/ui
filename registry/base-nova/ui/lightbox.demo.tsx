"use client"

import * as React from "react"
import {
  type Entry,
  type Facts,
  Lightbox,
  LightboxTrigger,
  type Source,
} from "@/registry/base-nova/ui/lightbox"

// picsum serves any id at any size: the page paints an 800-wide rendition, the
// original is 2400 wide with a 1200 candidate between them.
const picsum = (id: number, w: number, h: number): Source => ({
  src: `https://picsum.photos/id/${id}/${Math.round(w / 3)}/${Math.round(h / 3)}`,
  full: `https://picsum.photos/id/${id}/${w}/${h}`,
  srcset: `https://picsum.photos/id/${id}/${Math.round(w / 2)}/${Math.round(h / 2)} ${Math.round(w / 2)}w, https://picsum.photos/id/${id}/${w}/${h} ${w}w`,
  width: w,
  height: h,
  blur: "oklch(0.5 0 0)",
})

const GRID: Entry[] = [
  {
    id: "river",
    media: {
      kind: "image",
      source: picsum(1015, 2400, 1600),
      alt: "a river through a canyon",
    },
  },
  {
    id: "peaks",
    media: {
      kind: "image",
      source: picsum(1024, 1600, 2400),
      alt: "peaks, portrait",
    },
  },
  {
    id: "shore",
    media: {
      kind: "image",
      source: picsum(1016, 2400, 1800),
      alt: "a shoreline",
    },
  },
  {
    id: "wide",
    media: {
      kind: "image",
      source: picsum(1018, 2400, 1350),
      alt: "a wide valley",
    },
  },
  {
    id: "square",
    media: {
      kind: "image",
      source: picsum(1020, 2000, 2000),
      alt: "a bear, square",
    },
  },
  {
    id: "field",
    media: { kind: "image", source: picsum(1035, 2400, 1600), alt: "a field" },
  },
  {
    id: "tall",
    media: {
      kind: "image",
      source: picsum(1036, 1600, 2400),
      alt: "a tall view",
    },
  },
  {
    id: "lake",
    media: { kind: "image", source: picsum(1039, 2000, 2500), alt: "a lake" },
  },
]

const CARD: Entry = {
  id: "card",
  media: {
    kind: "image",
    source: picsum(1043, 2400, 1600),
    alt: "a cover-cropped card",
  },
  caption:
    "a 3:2 image inside a square card: the crop uncurls, the radius flattens",
}

const GIF: Entry = {
  id: "earth",
  media: {
    kind: "gif",
    source: {
      src: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
      full: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
      width: 400,
      height: 400,
    },
    alt: "the earth, rotating (public domain, wikimedia commons)",
  },
}

// The 33 s trailer, served by Blender itself (cc-by). The poster is a frame of it,
// grabbed with ffmpeg into public/, so the page paints the film and the film's own
// first frame flies.
const VIDEO: Entry = {
  id: "bunny",
  media: {
    kind: "video",
    src: "https://download.blender.org/peach/trailer/trailer_720p.mov",
    poster: {
      src: "/bunny-poster.jpg",
      full: "/bunny-poster.jpg",
      width: 1280,
      height: 720,
      blur: "oklch(0.85 0.06 120)",
    },
    title: "big buck bunny, the trailer",
    muted: true,
    loop: true,
  },
  caption:
    "big buck bunny trailer (cc-by, blender foundation) · space plays · j / l seek 10 s · m mutes · the bar scrubs",
}

// One map tile is the picture the frame opens from (a single tile for a demo sits
// inside openstreetmap's tile usage policy); the frame is the live map around it.
const FRAME: Entry = {
  id: "map",
  media: {
    kind: "frame",
    src: "https://www.openstreetmap.org/export/embed.html?bbox=2.15,41.38,2.19,41.40&layer=mapnik",
    width: 1200,
    height: 800,
    title: "openstreetmap · barcelona",
  },
  caption: "openstreetmap · barcelona · © openstreetmap contributors",
}
const TILE = "https://tile.openstreetmap.org/13/4145/3059.png"

const SMALL: Entry = {
  id: "small",
  media: {
    kind: "image",
    source: {
      src: "https://picsum.photos/id/1050/640/427",
      full: "https://picsum.photos/id/1050/640/427",
      width: 640,
      height: 427,
    },
    alt: "a 640 px original: the bar says when it is shown larger",
  },
}

const PROSE: Entry = {
  id: "prose",
  media: {
    kind: "image",
    source: picsum(1044, 2400, 1600),
    alt: "a figure inside prose",
  },
}

// The rail is the consumer's inspector beside the media (loom's rail, videoclub's
// details): whatever a site knows about the item and can do with it. This one shows
// what a media library would: the name, the original, an action, and a field whose
// keys stay in the field (arrows and letters never reach the lightbox from here).
function Rail({ entry, facts }: { entry: Entry; facts: Facts }) {
  const m = entry.media
  const full =
    m.kind === "image" || m.kind === "gif"
      ? m.source.full
      : m.kind === "video"
        ? m.src
        : null
  return (
    <div className="space-y-4 text-sm">
      <div className="font-mono text-xs lowercase text-muted-foreground">
        {entry.id} · {m.kind}
      </div>
      {entry.caption && (
        <div className="text-foreground/80">{entry.caption}</div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs lowercase">
        <dt className="text-muted-foreground">position</dt>
        <dd>
          {facts.index + 1} of {facts.count}
        </dd>
        {facts.natural && (
          <>
            <dt className="text-muted-foreground">original</dt>
            <dd>
              {facts.natural.w} × {facts.natural.h}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">zoom</dt>
        <dd>{Math.round(facts.zoom * 100)}%</dd>
      </dl>
      {full && (
        <a
          href={full}
          download
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 font-mono text-xs lowercase text-foreground/80 hover:text-foreground"
        >
          download original
        </a>
      )}
      <label className="block space-y-1">
        <span className="font-mono text-xs lowercase text-muted-foreground">
          notes
        </span>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
          placeholder="type here; arrows and letters stay in the field"
        />
      </label>
    </div>
  )
}

// Each surface is signed off by a hand on the device, never by a build: a round of
// fixes puts every line back to unverified.
const DEVICES = [
  "iphone safari",
  "android chrome",
  "macos safari",
  "macos chrome, trackpad + mouse",
  "firefox",
]

export default function Demo() {
  const [rail, setRail] = React.useState(false)
  return (
    <Lightbox
      history
      rail={rail}
      onRailChange={setRail}
      renderRail={(e, f) => <Rail entry={e} facts={f} />}
    >
      <div className="space-y-16">
        <section className="space-y-4">
          <div className="font-mono text-xs text-muted-foreground">
            01 · a justified grid
          </div>
          <div className="flex flex-wrap gap-2">
            {GRID.map((e) => {
              const { source, alt } = e.media as { source: Source; alt: string }
              const aspect = source.width / source.height
              return (
                <div
                  key={e.id}
                  style={{ flex: `${aspect} 1 ${aspect * 160}px` }}
                >
                  {/* The trigger carries the corner: it is the source rect the
                      image flies from, and the focus ring follows it. */}
                  <LightboxTrigger
                    entry={e}
                    render={
                      <a
                        href={source.full}
                        className="block overflow-hidden rounded-lg"
                      />
                    }
                  >
                    {/* biome-ignore lint/performance/noImgElement: the page's rendition */}
                    <img
                      src={source.src}
                      alt={alt}
                      width={source.width}
                      height={source.height}
                      className="block h-auto w-full"
                      style={{ aspectRatio: aspect }}
                      loading="lazy"
                    />
                  </LightboxTrigger>
                </div>
              )
            })}
            <div className="grow-[10]" />
          </div>
        </section>

        <section className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted-foreground">
              02 · a cover-cropped card
            </div>
            <LightboxTrigger
              entry={CARD}
              render={
                <a
                  href={(CARD.media as { source: Source }).source.full}
                  className="block overflow-hidden rounded-2xl"
                />
              }
            >
              {/* biome-ignore lint/performance/noImgElement: the page's rendition */}
              <img
                src={(CARD.media as { source: Source }).source.src}
                alt=""
                className="block aspect-square w-full object-cover"
              />
            </LightboxTrigger>
          </div>
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted-foreground">
              03 · a gif, never upgraded
            </div>
            <LightboxTrigger entry={GIF}>
              {/* biome-ignore lint/performance/noImgElement: a gif is never optimized */}
              <img
                src={(GIF.media as { source: Source }).source.src}
                alt=""
                className="block aspect-square w-full rounded-lg"
              />
            </LightboxTrigger>
          </div>
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted-foreground">
              04 · a video: its own frame flies, native controls inside
            </div>
            {/* The trigger wears data-lightbox-kind; the play glyph is drawn from
                that attribute alone (two pseudo-elements: a wash and a triangle),
                so any video trigger on the page says what it is. */}
            <LightboxTrigger
              entry={VIDEO}
              render={
                <a
                  href={(VIDEO.media as { src: string }).src}
                  className="relative block overflow-hidden rounded-lg data-[lightbox-kind=video]:before:absolute data-[lightbox-kind=video]:before:left-1/2 data-[lightbox-kind=video]:before:top-1/2 data-[lightbox-kind=video]:before:size-12 data-[lightbox-kind=video]:before:-translate-x-1/2 data-[lightbox-kind=video]:before:-translate-y-1/2 data-[lightbox-kind=video]:before:rounded-full data-[lightbox-kind=video]:before:bg-background/80 data-[lightbox-kind=video]:before:content-[''] data-[lightbox-kind=video]:after:absolute data-[lightbox-kind=video]:after:left-1/2 data-[lightbox-kind=video]:after:top-1/2 data-[lightbox-kind=video]:after:size-12 data-[lightbox-kind=video]:after:-translate-x-1/2 data-[lightbox-kind=video]:after:-translate-y-1/2 data-[lightbox-kind=video]:after:bg-foreground data-[lightbox-kind=video]:after:[clip-path:polygon(38%_28%,74%_50%,38%_72%)] data-[lightbox-kind=video]:after:content-['']"
                />
              }
            >
              {/* biome-ignore lint/performance/noImgElement: the poster */}
              <img
                src={(VIDEO.media as { poster: Source }).poster.src}
                alt=""
                width={1280}
                height={720}
                className="block aspect-video w-full"
              />
            </LightboxTrigger>
          </div>
        </section>

        <section className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted-foreground">
              05 · a frame: opens from a picture, box and keyboard, no zoom
            </div>
            <figure className="space-y-2">
              <LightboxTrigger
                entry={FRAME}
                render={
                  <a
                    href={(FRAME.media as { src: string }).src}
                    className="block w-fit overflow-hidden rounded-lg"
                  />
                }
              >
                {/* biome-ignore lint/performance/noImgElement: one map tile */}
                <img
                  src={TILE}
                  alt=""
                  width={256}
                  height={256}
                  className="block size-64"
                />
              </LightboxTrigger>
              <figcaption className="font-mono text-xs lowercase text-muted-foreground">
                {FRAME.media.kind === "frame" && FRAME.media.title} · ©
                openstreetmap contributors
              </figcaption>
            </figure>
          </div>
          <div className="space-y-4">
            <div className="font-mono text-xs text-muted-foreground">
              06 · a 640 px original: press + and read the bar
            </div>
            <LightboxTrigger entry={SMALL}>
              {/* biome-ignore lint/performance/noImgElement: a 640 px original */}
              <img
                src={(SMALL.media as { source: Source }).source.src}
                alt=""
                width={640}
                height={427}
                className="block h-auto w-full rounded-lg"
              />
            </LightboxTrigger>
          </div>
        </section>

        <section className="mx-auto max-w-prose space-y-4">
          <div className="font-mono text-xs text-muted-foreground">
            07 · a figure inside prose
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
            The caption below is a plain figcaption. Nothing on the entry names
            it; the lightbox reads the sibling once at open. Click the image,
            then press ? for the keys that work right now, i for the rail (the
            site's own inspector beside the media: details, actions, a field), h
            to hide the chrome. While it is open the address carries #lb=id: a
            reload lands on the same image, close strips it, and Back leaves the
            page the way it always does.
          </p>
          <figure className="space-y-2">
            <LightboxTrigger entry={PROSE}>
              {/* biome-ignore lint/performance/noImgElement: the page's rendition */}
              <img
                src={(PROSE.media as { source: Source }).source.src}
                alt=""
                className="block aspect-[3/2] w-full rounded-lg"
              />
            </LightboxTrigger>
            <figcaption className="text-sm text-foreground/55">
              read once at open: the sibling figcaption is the caption
            </figcaption>
          </figure>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
            Every trigger is a link to the original, so the page works before
            hydration and a middle click still opens the file.
          </p>
        </section>

        <section className="space-y-4">
          <div className="font-mono text-xs text-muted-foreground">
            device sign-off
          </div>
          <ul className="space-y-2 font-mono text-xs lowercase text-muted-foreground">
            {DEVICES.map((d) => (
              <li key={d}>{d} · unverified</li>
            ))}
          </ul>
        </section>
      </div>
    </Lightbox>
  )
}
