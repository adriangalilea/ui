"use client"

import { Sample } from "@/app/samples"
import type { Unfurl } from "@/registry/base-nova/lib/web-preview-unfurl"
import { WebPreview } from "@/registry/base-nova/ui/web-preview"

// #region facts
/** Facts as data, pasted from `mise unfurl <url>`. Nothing here fetched. */
const VIDEO: Unfurl = {
  url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
  site: "YouTube",
  title: "[1hr Talk] Intro to Large Language Models",
  description: "Andrej Karpathy",
  image: "/xtldr-preview-karpathy.jpg",
  favicon: "https://www.youtube.com/s/desktop/f8c8418d/img/favicon_32x32.png",
}
const ESSAY: Unfurl = {
  url: "https://paulgraham.com/ds.html",
  site: "paulgraham.com",
  title: "Do Things that Don't Scale",
  description:
    "One of the most common types of advice we give at Y Combinator is to do things that don't scale.",
}
const REPO: Unfurl = {
  url: "https://github.com/Lulzx/cuda-metal",
  site: "GitHub",
  title: "GitHub - Lulzx/cuda-metal",
  description: "CUDA compiler and runtime for Apple Silicon",
  image: "/xtldr-preview-cuda-metal.png",
  favicon: "https://github.githubassets.com/favicons/favicon.svg",
}
// #endregion

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="card"
        with="facts"
        label="01 · card · the default: the image at its aspect, the title at reading size, the domain as metadata, the whole card the link"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <WebPreview facts={VIDEO} />
          <WebPreview facts={REPO} />
          <WebPreview facts={ESSAY} />
        </div>
      </Sample>

      <Sample
        name="telegram"
        label="02 · telegram · the client's card, the one telegram-chat draws inside a bubble; here on the page, coloured by the page"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <WebPreview facts={VIDEO} style="telegram" className="text-sm" />
          <WebPreview facts={REPO} style="telegram" className="text-sm" />
          <WebPreview facts={ESSAY} style="telegram" className="text-sm" />
        </div>
      </Sample>

      <Sample
        name="x"
        label="03 · x · the large-image card with the title in a chip; a bordered card when the link has no picture"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <WebPreview facts={VIDEO} style="x" />
          <WebPreview facts={REPO} style="x" />
          <WebPreview facts={ESSAY} style="x" />
        </div>
      </Sample>

      <p className="max-w-prose text-foreground/60 text-sm">
        The same three links in every style: a video with a picture, a repo with
        a picture, an essay with none. Every card is a pure function of the five
        facts; fetching them is the lib&apos;s job and happens once, where the
        network is.
      </p>
    </div>
  )
}
