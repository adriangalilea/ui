"use client"

// A link-summary bot's conversation (xtldr's flows), expressed as telegram-chat
// messages. The script is authored in the shape a summary bot naturally has (who
// dropped the link, who tagged the bot, what the bot answered), and this builder
// turns it into the message array the primitive plays. Three flows:
//   peer  - a private chat with a person; the bot is not a member; the summary lands
//           with a "via" attribution (inline mode). No typing phase.
//   bot   - a DM with the bot; YOU send the link, the header types, the bot answers.
//   group - a group; every left bubble carries its sender.
// With no `mention` the flow reads as auto-mode: a link lands and the bot answers.

import type { Clip } from "@/registry/base-nova/lib/clip"
import {
  type ChatBlock,
  type ChatMessage,
  type ChatPreview,
  type ChatScript,
  chatClip,
  hrefOf,
  linkIn,
  TelegramChat,
  type TelegramChatProps,
} from "@/registry/base-nova/ui/telegram-chat"

export type SummaryItem = string | { text: string; cite?: string }

export interface SummarySection {
  /** Plain unicode emoji opening the heading. */
  emoji: string
  heading: string
  items: SummaryItem[]
}

export interface TelegramSummaryScript {
  kind: ChatScript["kind"]
  chatName: string
  chatTag: string
  avatar?: string
  avatarVideo?: string
  /** Their opening bubble before the link (peer/group). */
  intro?: string
  /** group: who says the intro. */
  introFrom?: string
  /** The link message. Sent BY YOU in a bot DM, by them otherwise. Omit when the link
   *  rides inside `mention`. */
  link?: string
  /** group: who drops the link. */
  linkFrom?: string
  /** The bot's own reaction on the link message (👀 while it reads). */
  linkReaction?: string
  /** Telegram's webpage preview under the link (or under the mention carrying it). */
  preview?: ChatPreview
  /** Your bubble tagging the bot. Quotes `link` when present. */
  mention?: string
  /** Type the mention into the composer char by char before it sends. */
  typeMention?: boolean
  /** A token of `mention` to spotlight once sent (the language word). */
  emphasis?: string
  /** "instant": the summary lands whole. */
  summaryPace?: "stream" | "instant"
  /** Header typing status before the summary ("typing" · "xtldr is typing"). */
  reading?: string
  summary: {
    /** Inline attribution ("via @xtldrbot"), the peer flow. */
    via?: string
    /** group: the bot's sender label. */
    from?: string
    /** group: the bot's avatar beside its bubble. */
    avatar?: string
    sections: SummarySection[]
    quote?: { text: string; by?: string; cite?: string }
    /** Meta row, verbatim (bring your own emoji): source and footer. */
    linkLabel: string
    time: string
    /** People reacting to the summary, on the wall clock after the story. */
    reactions?: { emoji: string; count: number }[]
  }
  afterlife?: ChatScript["afterlife"]
  /** The accounts, keyed by the names the flow uses (`chatName`, `linkFrom`,
   *  `summary.from`): the bot's handle and picture, a person's photo, defined once. */
  people?: ChatScript["people"]
  alt: string
}

/** The message array for a summary script. */
export function summaryMessages(s: TelegramSummaryScript): ChatMessage[] {
  const them = s.chatName
  const source = s.link ?? linkIn(s.mention)
  if (!source)
    throw new Error("telegram-summary: no link in `link` or `mention`")
  const messages: ChatMessage[] = []
  if (s.intro) messages.push({ from: s.introFrom ?? them, text: s.intro })
  if (s.link)
    messages.push({
      from: s.kind === "bot" ? "me" : (s.linkFrom ?? them),
      text: s.link,
      preview: s.preview,
      reactions: s.linkReaction
        ? [{ emoji: s.linkReaction, when: "timeline" }]
        : undefined,
    })
  if (s.mention)
    messages.push({
      from: "me",
      text: s.mention,
      reply: s.link ? { from: s.linkFrom ?? them, text: s.link } : undefined,
      preview: s.link ? undefined : s.preview,
      typed: s.typeMention,
      emphasis: s.emphasis,
    })
  const blocks: ChatBlock[] = s.summary.sections.flatMap((sec) => [
    { kind: "heading" as const, text: sec.heading, emoji: sec.emoji },
    ...sec.items.map((raw) => {
      const it = typeof raw === "string" ? { text: raw } : raw
      return { kind: "item" as const, text: it.text, cite: it.cite }
    }),
  ])
  if (s.summary.quote) blocks.push({ kind: "quote", ...s.summary.quote })
  messages.push({
    from: s.summary.from ?? them,
    avatar: s.summary.avatar,
    via: s.summary.via,
    typing: s.reading,
    blocks,
    pace: s.summaryPace,
    source,
    meta: {
      label: s.summary.linkLabel,
      href: hrefOf(source),
      time: s.summary.time,
    },
    reactions: s.summary.reactions?.map((r) => ({
      ...r,
      when: "afterlife" as const,
    })),
  })
  return messages
}

export function summaryScript(s: TelegramSummaryScript): ChatScript {
  return {
    kind: s.kind,
    chatName: s.chatName,
    chatTag: s.chatTag,
    avatar: s.avatar,
    avatarVideo: s.avatarVideo,
    people: s.people,
    messages: summaryMessages(s),
    afterlife: s.afterlife,
    alt: s.alt,
  }
}

/** The summary's clip (telegram-chat's `chatClip`), for a driver to play. */
export function summaryClip(s: TelegramSummaryScript): Clip {
  return chatClip(summaryScript(s))
}

/** Where a summary starts mid-conversation, ms into its clip: every bubble before the
 *  answer is already on screen (a typed mention still types, so it starts after the
 *  intro). A Playback's `start`. */
export function conversationStart(s: TelegramSummaryScript): number {
  const message =
    s.mention && s.typeMention
      ? s.intro
        ? 1
        : 0
      : summaryMessages(s).length - 1
  const chapter = summaryClip(s).chapters[message]
  if (!chapter)
    throw new Error(`telegram-summary: no message ${message} to start from`)
  return chapter.start
}

export interface TelegramSummaryProps
  extends Omit<TelegramChatProps, "script"> {
  script: TelegramSummaryScript
}

export function TelegramSummary({ script, ...rest }: TelegramSummaryProps) {
  return <TelegramChat script={summaryScript(script)} {...rest} />
}
