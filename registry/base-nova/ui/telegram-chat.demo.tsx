"use client"

import { Act, ScrollStage, useAct } from "@/registry/base-nova/ui/scroll-stage"
import {
  type ChatScript,
  TelegramChat,
} from "@/registry/base-nova/ui/telegram-chat"

const SCRIPT: ChatScript = {
  kind: "group",
  chatName: "the garden",
  chatTag: "3 members",
  messages: [
    {
      from: "Adrian",
      text: "components as registry items, sites own the copy",
    },
    {
      from: "Melon",
      text: "so what do I run?",
      reactions: [{ emoji: "👀", when: "timeline" }],
    },
    {
      from: "me",
      text: "npx shadcn add @ag/telegram-chat",
      reply: { from: "Melon", text: "so what do I run?" },
    },
    {
      from: "Adrian",
      typing: "typing",
      blocks: [
        { kind: "heading", text: "what you get", emoji: "📦" },
        { kind: "item", text: "the phone, the wallpaper, both themes" },
        { kind: "item", text: "messages as data, played at any progress" },
        {
          kind: "quote",
          text: "what looks clickable is clickable",
          by: "the rule",
        },
      ],
      meta: {
        label: "🔗 ui.adriangalilea.com",
        href: "https://github.com/adriangalilea/ui",
        time: "⏱ 4 min",
      },
      reactions: [
        { emoji: "🔥", count: 3 },
        { emoji: "🌱", count: 2 },
      ],
    },
  ],
  afterlife: { from: "Melon", messages: [{ at: 8, text: "ok that was easy" }] },
  alt: "A group chat where a component is installed with one command.",
}

const WALL = "/tg-pattern.svg"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs text-muted-foreground">{children}</div>
  )
}

/** THE SCROLLY: an act index in, focus and crop out. The effects CHAIN: the whole
 *  phone, then one message lifted with the rest blurred, then the viewport cut down
 *  onto it, the height transitioning rather than jumping. Nothing here is special to
 *  the chat; a consumer's storyboard does exactly this with its own words per act. */
const ACTS: { focus?: number; crop?: string; head: string; body: string }[] = [
  {
    head: "a conversation",
    body: "the whole phone, playing once on its own clock as it enters.",
  },
  {
    focus: 2,
    head: "then one message",
    body: "it lifts; the rest blur and step back. hover brings them back.",
  },
  {
    focus: 3,
    crop: "4 / 3",
    head: "then the answer, up close",
    body: "the viewport cuts down onto it, full width, the height gliding; the edges fade only where something is hidden. scroll it once it has settled.",
  },
]

function Scrolly() {
  const act = useAct()
  const now = ACTS[act] as (typeof ACTS)[number]
  return (
    <div className="grid h-svh items-center gap-10 lg:grid-cols-[1fr_minmax(0,22rem)]">
      <div className="space-y-6">
        {ACTS.map((a, i) => (
          <Act
            key={a.head}
            index={i}
            className="transition-opacity duration-500"
            style={{ opacity: "calc(0.3 + 0.7 * var(--act-on))" }}
          >
            <h3 className="font-semibold text-lg">{a.head}</h3>
            <p className="text-foreground/70">{a.body}</p>
          </Act>
        ))}
      </div>
      <TelegramChat
        script={SCRIPT}
        wallpaper={WALL}
        theme="dark"
        from={{ message: 3 }}
        focus={now.focus}
        crop={now.crop}
        className="mx-auto w-full max-w-[22rem]"
      />
    </div>
  )
}

export default function Demo() {
  return (
    <div className="space-y-20">
      <section className="space-y-4">
        <Label>01 · the phone · both themes</Label>
        <div className="flex justify-center gap-10">
          <TelegramChat script={SCRIPT} wallpaper={WALL} theme="dark" />
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="light"
            className="max-lg:hidden"
          />
        </div>
      </section>

      <section className="space-y-4">
        <Label>
          02 · frame=&quot;none&quot; · the same script at the width the phone
          was taking, in a viewport that never reflows the page
        </Label>
        <div className="flex justify-center">
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            frame="none"
            from={{ message: 3 }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <Label>
          03 · focus · one message lifts, the rest blur and come back on hover
        </Label>
        <div className="flex flex-wrap items-start justify-center gap-10">
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            frame="none"
            from={1}
            focus={3}
            className="max-w-[30rem]"
          />
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="dark"
            from={1}
            focus={2}
            className="max-w-[18rem]"
          />
        </div>
      </section>

      <section className="space-y-4">
        <Label>
          04 · crop · the phone at full width, cut in height only, the edges
          fading under a scrim; panned to a focus, or to the latest
        </Label>
        <div className="flex flex-wrap items-start justify-center gap-10">
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="dark"
            from={1}
            focus={3}
            crop="4 / 3"
            className="w-full max-w-[24rem]"
          />
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="light"
            from={1}
            crop="1 / 1"
            className="w-full max-w-[20rem]"
          />
        </div>
      </section>

      <section className="space-y-4">
        <Label>
          05 · a scrolly · an act index in, focus and crop out; the effects
          chain
        </Label>
        <ScrollStage
          acts={ACTS.length}
          pace="80svh"
          stacked={
            <div className="space-y-10">
              {ACTS.map((a) => (
                <div key={a.head} className="space-y-4">
                  <h3 className="font-semibold text-lg">{a.head}</h3>
                  <TelegramChat
                    script={SCRIPT}
                    wallpaper={WALL}
                    theme="dark"
                    from={{ message: 3 }}
                    focus={a.focus}
                    crop={a.crop}
                    className="mx-auto w-full max-w-[22rem]"
                  />
                  <p className="text-foreground/70">{a.body}</p>
                </div>
              ))}
            </div>
          }
        >
          <Scrolly />
        </ScrollStage>
      </section>
    </div>
  )
}
