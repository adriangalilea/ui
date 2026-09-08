"use client"

import { useRef, useState } from "react"
import { CardGallery } from "@/registry/base-nova/ui/card-gallery"
import { Copy } from "@/registry/base-nova/ui/copy"
import {
  type Entry,
  Lightbox,
  LightboxTrigger,
} from "@/registry/base-nova/ui/lightbox"
import { PreviewPicker } from "@/registry/base-nova/ui/preview-picker"
import { Scrims } from "@/registry/base-nova/ui/scrims"
import { ScrollStage } from "@/registry/base-nova/ui/scroll-stage"
import { useScrollStageTimeline } from "@/registry/base-nova/ui/scroll-stage-timeline"
import {
  type ChatScript,
  TelegramChat,
} from "@/registry/base-nova/ui/telegram-chat"

const items = ["Observe", "Shape", "Release"].map((id) => ({
  id,
  label: id,
  mark: id[0],
  content: <p className="p-8">{id}</p>,
}))
const script: ChatScript = {
  kind: "peer",
  chatName: "Adrian",
  alt: "Composition test",
  messages: [
    {
      from: "Adrian",
      text: "A message that fits",
      reactions: [{ emoji: "♥", count: 2 }],
    },
  ],
}
const beats = [{ span: 1 }, { span: 1 }]
const entry: Entry = {
  id: "ref-check",
  media: {
    kind: "image",
    alt: "Reference check",
    source: {
      src: "/favicon.ico",
      full: "/favicon.ico",
      width: 32,
      height: 32,
    },
  },
}
function Timeline() {
  useScrollStageTimeline(beats)
  return <div className="h-64">Native scroll timeline</div>
}
export function Checks() {
  const [observed, setObserved] = useState("")
  const [selected, setSelected] = useState("Observe")
  const [language, setLanguage] = useState("en")
  const [late, setLate] = useState(false)
  const [clicks, setClicks] = useState(0)
  const scroll = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Lightbox>
        <LightboxTrigger
          entry={entry}
          ref={trigger}
          render={
            <button
              ref={button}
              id="ref-trigger"
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.currentTarget.dataset.refsAgree = String(
                  trigger.current === button.current && !!button.current,
                )
              }}
            />
          }
        >
          Check refs
        </LightboxTrigger>
      </Lightbox>
      <Copy
        id="copy-composed"
        value="copied value"
        label
        onClick={() => setClicks((n) => n + 1)}
      />
      <Copy
        id="copy-cancelled"
        value="must not copy"
        onClick={(e) => e.preventDefault()}
      />
      <output id="clicks">{clicks}</output>
      <output id="observed">{observed}</output>
      <CardGallery
        id="uncontrolled"
        items={items}
        onValueChange={setObserved}
      />
      <CardGallery
        id="controlled"
        items={items}
        value={selected}
        onValueChange={setSelected}
      />
      <div className="max-w-64">
        <PreviewPicker
          id="narrow-picker"
          name="language"
          label="Language"
          value={language}
          onChange={setLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "es", label: "Español" },
            { value: "de", label: "Deutsch" },
          ]}
        />
      </div>
      <div id="fixed-viewport" className="h-80 w-64">
        <TelegramChat
          script={script}
          frozen
          viewport="container"
          className="h-full"
        />
      </div>
      <div id="hidden-chat" className="hidden">
        <TelegramChat script={script} progress={1} />
      </div>
      <button type="button" id="late-content" onClick={() => setLate(true)}>
        Grow scroll content
      </button>
      <div
        ref={scroll}
        id="nested-scroll"
        className="relative h-40 overflow-auto"
      >
        <div>
          <Scrims position="absolute" scrollRef={scroll} />
          <div style={{ height: late ? 800 : 20 }}>Nested scroll content</div>
        </div>
      </div>
      <ScrollStage
        acts={2}
        pin="all"
        pace="100svh"
        stacked={<p>Completed story</p>}
      >
        <Timeline />
      </ScrollStage>
    </>
  )
}
