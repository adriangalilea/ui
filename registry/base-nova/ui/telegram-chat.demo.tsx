"use client"

import * as React from "react"
import { Sample } from "@/app/samples"
import { Act, ScrollStage, useAct } from "@/registry/base-nova/ui/scroll-stage"
import {
  type ChatProfile,
  type ChatScript,
  TelegramChat,
} from "@/registry/base-nova/ui/telegram-chat"

// #region people
/** THE ACCOUNTS, ONCE. Define a person or a bot as a profile and use it anywhere a chat
 *  names someone: `from: ADRIAN` in a group, `chatName: ADRIAN` for a private chat with
 *  him, the bot's DM, the afterlife. The label, the mini avatar, the header, the handle
 *  all come from the one definition. A script can also carry a `people` map and name
 *  them by key (`from: "melon"`), which is what the story below does. */
const ADRIAN: ChatProfile = {
  name: "Adrian",
  handle: "@adriangalilea",
  avatar: "/adriangalilea.jpg",
  avatarVideo: "/adriangalilea.mp4",
}
const XTLDR: ChatProfile = {
  name: "xtldr",
  handle: "@xtldrbot",
  avatar: "/xtldr-bot.jpg",
  bot: true,
}
const PEOPLE: Record<string, ChatProfile> = {
  adrian: ADRIAN,
  melon: { name: "Melon", handle: "@melonflip" },
  xtldr: XTLDR,
}
// #endregion

// #region story
/** THE BOT'S OWN FLOW, with the bot's own output: a link lands, someone tags the bot,
 *  it reacts 👀 and types, the summary streams with cited timestamps, a follow-up gets
 *  an answer. The summary is @xtldrbot's real transcript for this talk; the citations
 *  are its timestamps, deep-linked. */
const TALK = "youtube.com/watch?v=zjkBMFhNj_g"
const SCRIPT: ChatScript = {
  kind: "group",
  chatName: "the garden",
  chatTag: "3 members",
  people: PEOPLE,
  messages: [
    { from: "melon", text: "you have to watch this" },
    {
      from: "melon",
      text: TALK,
      preview: {
        site: "YouTube",
        title: "[1hr Talk] Intro to Large Language Models",
        description: "Andrej Karpathy",
        image: "/xtldr-preview-karpathy.jpg",
      },
      reactions: [{ emoji: "👀", when: "timeline" }],
    },
    {
      from: "me",
      text: "@xtldrbot",
      reply: { from: "Melon", text: TALK },
      typed: true,
    },
    {
      from: "xtldr",
      typing: "xtldr is typing",
      source: TALK,
      blocks: [
        {
          kind: "heading",
          text: 'LLMs: The 140GB "Zip File" of the Internet',
          emoji: "🤖",
        },
        {
          kind: "item",
          text: "An LLM is just 2 files: a 140GB parameters file (70B numbers) and ~500 lines of C code to run it.",
          cite: "0:29",
        },
        {
          kind: "item",
          text: "Training is lossy compression of ~10TB of internet text into those weights: a ~100x compression ratio.",
          cite: "4:34",
        },
        { kind: "heading", text: 'The Future: An "LLM OS"', emoji: "🛠️" },
        {
          kind: "item",
          text: "Think of an LLM as the kernel of an emerging operating system, coordinating tools and memory (context window = RAM).",
          cite: "42:33",
        },
        {
          kind: "quote",
          text: "It's kind of like a lossy compression of the internet.",
          by: "Andrej Karpathy",
          cite: "6:02",
        },
      ],
      meta: {
        label: "🔗 YouTube",
        href: `https://${TALK}`,
        time: "⏱️ 59m 48s saved",
      },
      reactions: [
        { emoji: "❤️", count: 2 },
        { emoji: "🔥", count: 1 },
      ],
    },
    {
      from: "me",
      text: "what does he say about hallucinations?",
      typed: true,
    },
    {
      from: "xtldr",
      typing: "xtldr is typing",
      source: TALK,
      blocks: [
        { kind: "heading", text: "Hallucinations", emoji: "💭" },
        {
          kind: "item",
          text: "The model dreams internet documents: a made-up ISBN looks exactly like a real one to it.",
          cite: "17:35",
        },
        {
          kind: "item",
          text: "Tool use is the fix: browse, run code, look it up, rather than recall from weights.",
          cite: "32:03",
        },
      ],
    },
  ],
  afterlife: { from: "melon", messages: [{ at: 8, text: "ok that was easy" }] },
  alt: "A group chat: a friend drops a talk, the bot is tagged and summarizes it with timestamps, a follow-up gets a cited answer.",
}
// #endregion

// #region chats
/** THE SAME TWO DEFINITIONS, TWO CHATS. A private chat WITH Adrian: `chatName: ADRIAN`
 *  puts his photo and profile video in the header. A group where Adrian and the bot are
 *  both senders: `from: ADRIAN`, `from: XTLDR` give each their label and mini avatar, the
 *  bot answering the way it does in a group (someone drops a link, it reacts 👀, types,
 *  summarizes). Nothing about either of them was written twice. */
const PEER: ChatScript = {
  kind: "peer",
  chatName: ADRIAN,
  chatTag: "online",
  messages: [
    { from: ADRIAN, text: "the frameless telegram shipped" },
    {
      from: "me",
      text: "finally",
      reactions: [{ emoji: "🔥", when: "timeline" }],
    },
  ],
  alt: "A private chat with Adrian.",
}
const RICK = "youtube.com/watch?v=dQw4w9WgXcQ"
const GROUP: ChatScript = {
  kind: "group",
  chatName: "the garden",
  chatTag: "3 members",
  messages: [
    {
      from: ADRIAN,
      text: RICK,
      preview: {
        site: "YouTube",
        title:
          "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
        description: "Rick Astley",
        image: "/xtldr-preview-rick.jpg",
      },
      reactions: [{ emoji: "👀", when: "timeline" }],
    },
    {
      from: XTLDR,
      typing: "xtldr is typing",
      source: RICK,
      blocks: [
        {
          kind: "heading",
          text: "Never Gonna Give You Up: The Eternal Rickroll",
          emoji: "🎵",
        },
        {
          kind: "item",
          text: "Rick Astley's 1987 debut single, a synth-pop classic that became the internet's most famous prank.",
        },
        {
          kind: "item",
          text: "The chorus is a list of promises: never give up, never let down, never run around and desert you.",
          cite: "0:43",
        },
      ],
      meta: {
        label: "🔗 YouTube",
        href: `https://${RICK}`,
        time: "⏱️ 3m 33s saved",
      },
      reactions: [{ emoji: "😂", count: 1 }],
    },
    { from: "Melon", text: "you got us" },
  ],
  alt: "A group: Adrian drops a link, the bot reacts, types, and summarizes it.",
}
// #endregion

const WALL = "/tg-pattern.svg"

// #region acts
/** THE SCROLLY: an act index in; `until`, `focus` and `crop` out. The chat is PACED by
 *  the acts: each raises the ceiling and the story plays on to it, so an act never
 *  points back at a message the reader already watched land, and a reader who arrives
 *  at act three (two acts at once, or a reload) gets the act's own beat with everything
 *  before it already there. The effects chain: the whole phone, then one message lifted
 *  with the rest blurred, then the view zooms onto the answer, the phone growing and
 *  the viewport closing down onto it. */
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
  // `?debug` on the page: the chat prints what its cut decided, for sign-off by hand.
  const [debug, setDebug] = React.useState(false)
  React.useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("debug"))
  }, [])
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
        debug={debug}
        className={`mx-auto w-full ${now.wide ? "max-w-[28rem]" : "max-w-[22rem]"}`}
      />
    </div>
  )
}
// #endregion

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="phone"
        with="people story"
        label="01 · the phone · both themes"
      >
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
        with="people chats"
        label="05 · people · two profiles, defined once: a private chat with Adrian, and a group where Adrian and the bot are both senders"
      >
        <div className="flex flex-wrap items-start justify-center gap-10">
          <TelegramChat
            script={PEER}
            wallpaper={WALL}
            theme="dark"
            className="max-w-[18rem]"
          />
          <TelegramChat
            script={GROUP}
            wallpaper={WALL}
            theme="dark"
            className="max-w-[18rem]"
          />
        </div>
      </Sample>

      <Sample
        name="scrolly"
        with="acts"
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
        own. Each is 150-300 KB, lazy, which is why only reactions get them. The
        summaries are @xtldrbot&apos;s real output for these links; the
        follow-up answer is illustrative.
      </p>
    </div>
  )
}
