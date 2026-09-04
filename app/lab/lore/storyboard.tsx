"use client"

// A storyboard on scroll-stage: phones on the left, the words on the right. Act i's
// phone stands in front; the act before tucks behind and outward; the words for
// every act stay on screen, the one on stage lit. A chat plays itself once, on its
// own clock, the moment its act begins (useAct mounts it); scroll never scrubs it.

import * as React from "react"
import {
  TelegramSummary,
  type TelegramSummaryScript,
} from "@/registry/base-nova/blocks/telegram-summary/telegram-summary"
import { Act, ScrollStage, useAct } from "@/registry/base-nova/ui/scroll-stage"

const LINK = {
  link: "youtube.com/watch?v=zjkBMFhNj_g",
  preview: {
    site: "YouTube",
    title: "[1hr Talk] Intro to Large Language Models",
    description: "Andrej Karpathy",
  },
}

const ACTS: { script: TelegramSummaryScript; heading: string; body: string }[] =
  [
    {
      heading: "a friend sends a link",
      body: "It arrives where links arrive. You tag the bot and the summary lands as your own message, inline.",
      script: {
        kind: "peer",
        chatName: "Adrian",
        chatTag: "online",
        intro: "you have to watch this",
        ...LINK,
        mention: "@xtldrbot",
        summary: {
          via: "via @xtldrbot",
          sections: [
            {
              emoji: "🤖",
              heading: 'The 140GB "zip file" of the internet',
              items: [
                {
                  text: "Two files: parameters and the code that runs them",
                  cite: "04:12",
                },
              ],
            },
            {
              emoji: "🧰",
              heading: "Tool use",
              items: [
                "The browser, the calculator, code: the model reaches out",
              ],
            },
          ],
          linkLabel: "🔗 youtube.com",
          time: "⏱ 59 min",
          reactions: [{ emoji: "🔥", count: 1 }],
        },
        alt: "A private chat: a friend sends a talk, the bot summarizes it inline.",
      },
    },
    {
      heading: "in any language",
      body: "Type the language after the tag. The same talk, in Spanish, summarized instantly.",
      script: {
        kind: "peer",
        chatName: "Pablo",
        chatTag: "online",
        intro: "mira esto",
        ...LINK,
        mention: "@xtldrbot es",
        typeMention: true,
        emphasis: "es",
        summaryPace: "instant",
        summary: {
          via: "via @xtldrbot",
          sections: [
            {
              emoji: "🤖",
              heading: 'El "zip" de 140GB de internet',
              items: [
                {
                  text: "Dos archivos: los parámetros y el código que los ejecuta",
                  cite: "04:12",
                },
              ],
            },
            {
              emoji: "🧰",
              heading: "Uso de herramientas",
              items: [
                "Navegador, calculadora, código: el modelo sale a buscar",
              ],
            },
          ],
          linkLabel: "🔗 youtube.com",
          time: "⏱ 59 min",
        },
        alt: "The same talk summarized in Spanish after typing the language.",
      },
    },
  ]

export function Storyboard() {
  return (
    <ScrollStage acts={ACTS.length} stacked={<Stacked />}>
      <div className="grid w-full items-center gap-10 lg:grid-cols-[auto_1fr]">
        <Phones />
        <Words />
      </div>
    </ScrollStage>
  )
}

function Phones() {
  const active = useAct()
  // Acts a phone has ever entered stay mounted: a chat played once keeps its finished
  // state while hidden and never streams again.
  const played = React.useRef(new Set<number>())
  for (let i = 0; i <= active; i++) played.current.add(i)
  return (
    <div
      className="relative"
      style={
        {
          "--phone": "min(300px, 36svh)",
          width: "calc(var(--phone) * 2.05)",
          height: "calc(var(--phone) * 730 / 356)",
        } as React.CSSProperties
      }
    >
      {ACTS.map((act, i) => {
        const on = i <= active
        const behind = on && i < active
        const shift = !on ? 22 : behind ? -42 : 0
        return (
          <Act
            key={act.script.alt}
            index={i}
            className="absolute top-0 right-0 w-[var(--phone)] transition-[opacity,transform] duration-700 ease-[var(--ease-out)]"
            style={{
              zIndex: i === active ? 10 : 10 - (active - i),
              opacity: !on ? 0 : behind ? 0.8 : 1,
              transform: `translateX(${shift}%)${behind ? " perspective(1600px) rotateY(-18deg) scale(0.9)" : !on ? " scale(0.92)" : ""}`,
              pointerEvents: on ? "auto" : "none",
            }}
          >
            {played.current.has(i) && (
              <TelegramSummary
                script={act.script}
                from="conversation"
                wallpaper="/tg-pattern.svg"
                theme="dark"
              />
            )}
          </Act>
        )
      })}
    </div>
  )
}

function Words() {
  const active = useAct()
  return (
    <div className="space-y-8">
      {ACTS.map((act, i) => (
        <div
          key={act.heading}
          className="space-y-4 transition-opacity duration-500"
          style={{ opacity: i === active ? 1 : 0.4 }}
        >
          <h3 className="text-lg font-semibold tracking-tight">
            {act.heading}
          </h3>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
            {act.body}
          </p>
        </div>
      ))}
    </div>
  )
}

function Stacked() {
  return (
    <div className="space-y-10">
      {ACTS.map((act) => (
        <div key={act.heading} className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">
            {act.heading}
          </h3>
          <div className="flex justify-center">
            <div className="w-full max-w-[330px]">
              <TelegramSummary
                script={act.script}
                from="conversation"
                wallpaper="/tg-pattern.svg"
                theme="dark"
              />
            </div>
          </div>
          <p className="text-[0.9375rem] leading-relaxed text-foreground/80">
            {act.body}
          </p>
        </div>
      ))}
    </div>
  )
}
