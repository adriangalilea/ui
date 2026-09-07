"use client"

import { Sample } from "@/app/samples"
import { Act, ScrollStage, useAct } from "@/registry/base-nova/ui/scroll-stage"
import {
  type ChatProfile,
  type ChatScript,
  TelegramChat,
} from "@/registry/base-nova/ui/telegram-chat"

/** THE ACCOUNTS, ONCE. Every mock on a site keys its senders into one map like this, so
 *  the bot always has its handle and its picture, a person their photo and profile
 *  video, and a name is spelled one way. `from: "xtldr"` anywhere resolves to this. */
const PEOPLE: Record<string, ChatProfile> = {
  adrian: {
    name: "Adrian",
    handle: "@adriangalilea",
    avatar: "/adriangalilea.jpg",
    avatarVideo: "/adriangalilea.mp4",
  },
  melon: { name: "Melon", handle: "@melonflip" },
  xtldr: {
    name: "xtldr",
    handle: "@xtldrbot",
    avatar: "/xtldr-bot.jpg",
    bot: true,
  },
}

/** THE STORY IS THE BOT'S OWN FLOW: a link lands, someone tags the bot, the summary
 *  streams, a follow-up is asked, the bot answers. The link is a VIDEO, because what
 *  xtldr cites is a timestamp (deep-linked with &t=), never a paragraph: a citation the
 *  real bot does not make is a lie the demo must not tell. */
const VIDEO = "youtube.com/watch?v=ii1jcLg-eIQ"
const SCRIPT: ChatScript = {
  kind: "group",
  chatName: "the garden",
  chatTag: "3 members",
  people: PEOPLE,
  messages: [
    { from: "melon", text: "you have to watch this" },
    {
      from: "melon",
      text: VIDEO,
      preview: {
        site: "YouTube",
        title: "Lecture 3 - Before the Startup (Paul Graham)",
        description:
          "How to Start a Startup, Stanford CS183B. Paul Graham on the counterintuitive parts of starting a company.",
      },
      reactions: [{ emoji: "👀", when: "timeline" }],
    },
    {
      from: "me",
      text: PEOPLE.xtldr?.handle ?? "@xtldrbot",
      reply: { from: PEOPLE.melon?.name ?? "Melon", text: VIDEO },
      typed: true,
    },
    {
      from: "xtldr",
      typing: "xtldr is watching",
      source: VIDEO,
      blocks: [
        { kind: "heading", text: "Startups are counterintuitive", emoji: "🧭" },
        {
          kind: "item",
          text: "Your instincts about people are right; your instincts about startups are not",
          cite: "2:10",
        },
        {
          kind: "item",
          text: "Expertise in startups matters less than expertise in your users",
          cite: "9:35",
        },
        { kind: "heading", text: "Don't try", emoji: "🌱" },
        {
          kind: "item",
          text: "The way to get startup ideas is not to try to think of startup ideas",
          cite: "31:20",
        },
        {
          kind: "quote",
          text: "Startups are not a way to have fun. The way to get a startup idea is to work on your own problems.",
          by: "Paul Graham",
          cite: "33:04",
        },
      ],
      meta: {
        label: "🔗 youtube.com",
        href: `https://${VIDEO}`,
        time: "⏱ 49 min",
      },
      reactions: [
        { emoji: "❤️", count: 2 },
        { emoji: "🔥", count: 1 },
      ],
    },
    {
      from: "me",
      text: "does he say when to stop doing the unscalable things?",
      typed: true,
    },
    {
      from: "xtldr",
      typing: "typing",
      source: VIDEO,
      blocks: [
        { kind: "heading", text: "When to stop", emoji: "⏳" },
        {
          kind: "item",
          text: "Not while the manual work still teaches you something about your users",
          cite: "22:48",
        },
        {
          kind: "item",
          text: "Gradually: the founders who scaled well kept a hand in the unscalable part",
          cite: "24:15",
        },
      ],
    },
  ],
  afterlife: { from: "melon", messages: [{ at: 8, text: "ok that was easy" }] },
  alt: "A group chat: a friend drops a talk, the bot is tagged and summarizes it with timestamps, a follow-up gets a cited answer.",
}

/** The same people, two other chats: a private chat with Adrian (his photo and profile
 *  video in the header, from the profile) and a DM with the bot (its picture, its handle
 *  as the sub-line). Nothing about either was written twice. */
const PEER: ChatScript = {
  kind: "peer",
  chatName: "adrian",
  chatTag: "online",
  people: PEOPLE,
  messages: [
    { from: "adrian", text: "the frameless telegram shipped" },
    {
      from: "me",
      text: "finally",
      reactions: [{ emoji: "🔥", when: "timeline" }],
    },
  ],
  alt: "A private chat with Adrian.",
}
const BOT: ChatScript = {
  kind: "bot",
  chatName: "xtldr",
  people: PEOPLE,
  messages: [
    { from: "me", text: VIDEO, typed: true },
    {
      from: "xtldr",
      typing: "xtldr is watching",
      source: VIDEO,
      blocks: [
        { kind: "heading", text: "In one line", emoji: "🧭" },
        {
          kind: "item",
          text: "Work on your own problems; ideas follow",
          cite: "31:20",
        },
      ],
      pace: "instant",
    },
  ],
  alt: "A direct message to the bot.",
}

const WALL = "/tg-pattern.svg"

/** THE SCROLLY: an act index in; `until`, `focus` and `crop` out. The chat is PACED by
 *  the acts: each raises the ceiling and the story plays on to it, so an act never
 *  points back at a message the reader already watched land, and a reader who arrives
 *  at act three (two acts at once, or a reload) gets the act's own beat with everything
 *  before it already there. The effects chain: the whole phone, then one message lifted
 *  with the rest blurred, then the view zooms onto the answer, the phone growing and
 *  the viewport closing down onto it. Nothing here is special to the chat; a
 *  consumer's storyboard does exactly this with its own words per act. */
const ACTS: {
  until: number
  focus?: number
  crop?: string
  wide?: boolean
  head: string
  body: string
}[] = [
  {
    until: 2,
    head: "a link lands",
    body: "someone drops a talk; you tag the bot. the phone plays to here and waits.",
  },
  {
    until: 3,
    focus: 3,
    head: "the bot answers",
    body: "the summary streams in and lifts; the rest blur and step back.",
  },
  {
    until: 5,
    focus: 5,
    crop: "4 / 3",
    wide: true,
    head: "ask it more",
    body: "a follow-up, a cited answer, and the view zooms onto it: the phone grows, the viewport closes down to the answer, the scroll glides. scroll it once it has settled.",
  },
]

function Scrolly() {
  const act = useAct()
  const now = ACTS[act] as (typeof ACTS)[number]
  return (
    <div className="grid h-svh items-center gap-10 lg:grid-cols-[1fr_minmax(0,28rem)]">
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
        from={{ message: 1 }}
        until={{ message: now.until }}
        focus={now.focus}
        crop={now.crop}
        className={`mx-auto w-full ${now.wide ? "max-w-[28rem]" : "max-w-[22rem]"}`}
      />
    </div>
  )
}

export default function Demo() {
  return (
    <div className="space-y-20">
      <Sample name="phone" label="01 · the phone · both themes">
        <div className="flex justify-center gap-10">
          <TelegramChat script={SCRIPT} wallpaper={WALL} theme="dark" />
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="light"
            className="max-lg:hidden"
          />
        </div>
      </Sample>

      <Sample
        name="frameless"
        label='02 · frame="none" · the same script at the width the phone was taking, in a viewport that never reflows the page'
      >
        <div className="flex justify-center">
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            frame="none"
            from={{ message: 3 }}
          />
        </div>
      </Sample>

      <Sample
        name="focus"
        label="03 · focus · one message lifts, the rest blur and step back"
      >
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
      </Sample>

      <Sample
        name="crop"
        label="04 · crop · the phone at full width, cut in height only, the edges fading only where something is hidden; scrolled to a focus, or to the latest"
      >
        <div className="flex flex-wrap items-start justify-center gap-10">
          <TelegramChat
            script={SCRIPT}
            wallpaper={WALL}
            theme="dark"
            from={1}
            focus={5}
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
      </Sample>

      <Sample
        name="people"
        label="05 · people · the accounts defined once, every chat reads them: a private chat with Adrian, a DM with the bot"
      >
        <div className="flex flex-wrap items-start justify-center gap-10">
          <TelegramChat
            script={PEER}
            wallpaper={WALL}
            theme="dark"
            className="max-w-[18rem]"
          />
          <TelegramChat
            script={BOT}
            wallpaper={WALL}
            theme="dark"
            className="max-w-[18rem]"
          />
        </div>
      </Sample>

      <Sample
        name="scrolly"
        label="06 · a scrolly · an act index in; until, focus and crop out. the chat is paced by the acts and the effects chain"
      >
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
                    from={{ message: 1 }}
                    until={{ message: a.until }}
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
      </Sample>

      <p className="max-w-prose text-foreground/60 text-sm">
        Reactions are buttons: press one and you count, press again and you
        leave. The emoji are Noto Animated Emoji (Google, Apache 2.0), animated
        WebP, no player; Telegram&apos;s own set lives behind its API and is its
        own. Each is 150-300 KB, lazy, which is why only reactions get them.
      </p>
    </div>
  )
}
