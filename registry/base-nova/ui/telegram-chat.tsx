"use client"

// A Telegram chat as a pure function of {script, progress}: a message array plays
// out in order (bubbles land, a typed message fills the composer first, a rich body
// streams block by block, reactions pop) so that progress 0..1 maps deterministically
// onto the conversation: scrubbing forward, backward or jumping is idempotent and
// side-effect-free. Three chat shapes, one component: peer (a private chat, no bot
// chrome), bot (a DM with a bot: the Menu pill), group (left bubbles carry colored
// sender labels and mini avatars). Telegram realism: typing lives in the HEADER,
// reactions are pills on the bubble, avatars are real images or Telegram-gradient
// initials, the webpage preview is the client's card. The mockup is a `figure`
// whose chrome is decorative (aria-hidden), but links and previews are REAL anchors:
// what looks clickable is clickable, and tabbable. Uncontrolled (no `progress`) it
// plays ONCE when it enters the viewport, pauses off-screen, and renders the
// completed state under prefers-reduced-motion. `from` shifts the start so the first
// frame already shows a conversation, never an empty screen.
//
// THE PHONE IS A MODE, NOT THE COMPONENT. At the width a feature card gives it the
// device ate most of the space and the words landed too small to read, so a component
// whose whole job is to show what a bot SAID could not carry its own copy. Three
// orthogonal knobs, all on the same script and the same bubbles:
//   frame="none"  the messages on a bare canvas (the wallpaper, or nothing): no header,
//                 a persistent composer. Every size is a share of the container, so the
//                 text takes the width the phone was taking.
//   focus         message indices that stay sharp and lift; everything else blurs and
//                 steps back, and comes back on hover (the code item's rule). A phone
//                 thread scrolls the focused message into view.
//   crop          a viewport of a given aspect: the device keeps its FULL WIDTH and is cut
//                 in height only, panned to the focused message (else to the latest), the
//                 cut edges fading under a blurred scrim. Scaling into a bubble was tried
//                 and lost the width, and with it the phone; an unscaled phone panned to
//                 the message is what still reads as Telegram. Frameless crops by default,
//                 so a landing message slides the thread up instead of growing the page.
//                 The one knob that reads the DOM: the message's place on the device is
//                 measured, not guessed.
// A scrolly telling composes them: an act index in, focus out.

import { ChevronDown, SlidersHorizontal } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"
import { IphoneFrame } from "@/registry/base-nova/ui/device-frame"
import { Glass, type GlassTone } from "@/registry/base-nova/ui/liquid-glass"
import { Scrims } from "@/registry/base-nova/ui/scrims"
import { useChatLayout } from "@/registry/base-nova/ui/telegram-chat-layout"
import {
  useChatAfterlife,
  useChatPlayback,
} from "@/registry/base-nova/ui/telegram-chat-playback"
import { WebPreview } from "@/registry/base-nova/ui/web-preview"
import "./telegram-chat.css"

export type ChatKind = "peer" | "bot" | "group"

export interface ChatPreview {
  /** Site name line, link-colored bold ("YouTube", "GitHub"). */
  site: string
  title: string
  description?: string
  /** Large image (16:9 cover) above the text. */
  image?: string
}

export interface ChatReaction {
  emoji: string
  /** Shown when supplied; groups also show the default count of one. */
  count?: number
  /** "timeline": pops one beat after the message lands, scrubbable. "afterlife"
   *  (default): visible-time clock after the story completes. Counts grow to the
   *  declared total, then stop; scrubbing cannot summon or rewind it. */
  when?: "timeline" | "afterlife"
}

export type ChatBlock =
  | { kind: "heading"; text: string; emoji?: string }
  | { kind: "item"; text: string; cite?: string }
  | { kind: "quote"; text: string; by?: string; cite?: string }

/** Who a message is from or a chat is with: the profile itself (`from: ADRIAN`, the
 *  ergonomic form: define a person once, use them anywhere, no map to remember), a key
 *  into the script's `people`, or a bare name. */
export type Who = string | ChatProfile

export interface ChatMessage {
  /** "me" is your bubble on the right. Anyone else is a sender on the left; in a group
   *  it is the colored label and picks the mini avatar. */
  from: "me" | Who
  text?: string
  /** The sender's photo (left bubbles in groups). */
  avatar?: string
  /** The quoted message this one replies to. */
  reply?: { from: Who; text: string }
  preview?: ChatPreview
  /** Inline-bot attribution above the body ("via @xtldrbot"). */
  via?: string
  /** A rich body that streams block by block (a bot's answer). */
  blocks?: ChatBlock[]
  /** Footer under the blocks: source link and time. Lands after the last block. */
  meta?: { label: string; href: string; time: string }
  /** The URL cites deep-link into (a YouTube timestamp becomes &t=). */
  source?: string
  /** Header status shown for a beat before this message lands ("typing"). */
  typing?: string
  /** Typed into the composer char by char before sending. "me" only. */
  typed?: boolean
  /** A token of `text` spotlit after sending, until the next message lands. */
  emphasis?: string
  /** "instant": blocks land whole instead of streaming. */
  pace?: "stream" | "instant"
  reactions?: ChatReaction[]
}

/** A Telegram account, defined ONCE and reused by every mock on a site: the bot with its
 *  handle and its picture, a person with their photo and profile video. A message's
 *  `from` is the key into `people`; the label, the mini avatar and the chat header read
 *  the profile. A mock that spelled the bot's name three ways with three different
 *  gradient initials is what this exists to prevent. */
export interface ChatProfile {
  /** The display name, as Telegram shows it. */
  name: string
  /** "@xtldrbot": what a mention types and what a bot's sub-line shows. */
  handle?: string
  avatar?: string
  /** Telegram's animated profile video (mp4), looping muted over `avatar`. */
  avatarVideo?: string
  bot?: boolean
}

export interface ChatScript {
  kind: ChatKind
  /** Header title: the person, the bot, or the group name. A key into `people` reads
   *  the profile's name, avatar and video for the header. */
  chatName: Who
  /** Sub-line under the name ("online" · "bot" · "24 members"). Defaults from the
   *  header's profile: a bot's handle, else nothing. */
  chatTag?: string
  /** Optional business bot shown in the floating management bar. */
  managedBy?: Who
  avatar?: string
  /** Telegram's animated profile video (mp4), looping muted over `avatar` as its
   *  poster; poster only under prefers-reduced-motion. */
  avatarVideo?: string
  /** The accounts in this chat, keyed by the `from` a message uses. */
  people?: Record<string, ChatProfile>
  messages: ChatMessage[]
  /** The easter egg for whoever stays: messages that arrive `at` seconds after the
   *  story completes, on the wall clock. */
  afterlife?: {
    from?: Who
    avatar?: string
    avatarVideo?: string
    messages: { at: number; text: string }[]
  }
  /** Accessible description of the whole demo (the mockup is one picture). */
  alt: string
}

export interface TelegramChatProps {
  script: ChatScript
  /** 0..1 scrub position. Omit for the one-shot in-view autoplay. */
  progress?: number
  /** Floor for the animation. A number is a raw 0..1 position; {message: k} starts
   *  at the beginning of message k's beat with everything before it on screen. */
  from?: number | { message: number }
  /** Autoplay ms (uncontrolled only). Defaults proportional to script length. */
  duration?: number
  /** The autoplay's CEILING (uncontrolled only): the story plays, on its own clock and
   *  in view, up to the end of message k and waits there; raise it and it resumes. A
   *  storyboard paces the chat with this, one act at a time, so a later act never
   *  points back at a message the reader has already watched land. */
  until?: { message: number }
  /** Seconds added to the whole afterlife schedule (reactions + messages): lets a
   *  phone that completes instantly wait for its neighbours' story. */
  afterlifeDelay?: number
  /** Render a deterministic completed conversation without a decorative clock. */
  frozen?: boolean
  /** Fill a definite parent height; focus pans within that measured viewport. */
  viewport?: "content" | "container"
  /** In a fixed viewport, size the phone to the final focused exchange and chin. */
  fit?: "focus"
  /** URL of Telegram's doodle pattern (telegram-tt's assets/pattern.svg), applied as
   *  a CSS mask tinted per theme, exactly like the client. */
  wallpaper?: string
  /** `page` follows the page's own light/dark; `dark` or `light` pins it, for a chat
   *  that must look like Telegram's own theme whatever the page is doing. */
  theme?: "dark" | "light" | "page"
  /** `phone` (default) draws the device. `none` draws the messages on a bare canvas at
   *  the container's width: no header or typing status, the
   *  composer stays visible to keep typing transitions stable. */
  frame?: "phone" | "none"
  /** Hide the decorative input controls for message-only compositions. */
  composer?: boolean
  /** Message indices that stay sharp and lift; the rest blur and step back (hover brings
   *  them back). In a phone the thread scrolls the first focused message into view. */
  focus?: number | readonly number[]
  /** The viewport's aspect ratio (a CSS `aspect-ratio` value, "4 / 3"). The device keeps
   *  its full width and is cut in height, panned to the first focused message, else to
   *  the latest; the cut edges fade under a blurred scrim. A phone defaults to its own
   *  box; frameless defaults to `FRAMELESS_CROP` so the page never reflows as it plays. */
  crop?: string
  /** Reaction emoji as Telegram draws them, ANIMATED (Noto Animated Emoji, animated
   *  WebP, no player, lazy): on by default. Off, the pill shows the text glyph. Each
   *  animation is 150-300 KB, which is why only reactions get them, never body text. */
  animatedEmoji?: boolean
  /** What the cut decided, as it happened: story position, ceiling, target, whether it
   *  has landed, the viewport's height, the scroll it asked for and got. `true` prints
   *  it as a mono readout under the chat; a function receives every decision, for a
   *  page that ships it somewhere a reader of logs can see (the demo posts it to a
   *  dev-only route). For sign-off by hand; `?debug` on the demo page turns it on. */
  debug?: boolean | ((trace: Record<string, unknown>) => void)
  /** `false`: the thread never becomes a scroller, even settled. For a chat that is a
   *  film in a card rather than a phone to poke at; reactions stay pressable. */
  scrollable?: boolean
  className?: string
}

/** Noto Animated Emoji (Google, Apache 2.0): the emoji's codepoints, hex, joined by
 *  `_`, as one animated WebP at 512 px. Telegram's own animated set is TGS behind its
 *  API and its own IP; this is the open equivalent every browser plays with no player. */
export function animatedEmojiUrl(emoji: string): string {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${emojiCodes(emoji)}/512.webp`
}
/** The same emoji's still, from the same set: what a pill shows between plays. */
export function stillEmojiUrl(emoji: string): string {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${emojiCodes(emoji)}/emoji.svg`
}
function emojiCodes(emoji: string): string {
  return [...emoji]
    .map((c) => (c.codePointAt(0) as number).toString(16))
    .join("_")
}

/** The frameless canvas's default viewport: a landing message slides the thread up
 *  inside it instead of growing the page under the reader. */
export const FRAMELESS_CROP = "4 / 3"

// Telegram's sender palette: label colors and the matching avatar gradients. A name
// hashes to a stable index so a sender keeps one identity everywhere.
const SENDER_COLORS = [
  "#e17076",
  "#eda86c",
  "#a695e7",
  "#7bc862",
  "#6ec9cb",
  "#65aadd",
  "#ee7aae",
]
const AVATAR_GRADIENTS: [string, string][] = [
  ["#ff885e", "#ff516a"],
  ["#ffcd6a", "#ffa85c"],
  ["#82b1ff", "#665fff"],
  ["#a0de7e", "#54cb68"],
  ["#53edd6", "#28c9b7"],
  ["#72d5fd", "#2a9ef1"],
  ["#e0a2f3", "#d669ed"],
]

function senderIndex(name: string): number {
  let sum = 0
  for (const ch of name) sum += ch.codePointAt(0) ?? 0
  return sum % SENDER_COLORS.length
}

function gradientOf(name: string): string {
  const [a, b] = AVATAR_GRADIENTS[senderIndex(name)] as [string, string]
  return `linear-gradient(180deg, ${a}, ${b})`
}

// ── the timeline: messages → weighted beats → visible state at progress ──
//
// Structural beats get fixed char-equivalent weights so the scrub spends real time on
// them; text streams by its own length.
const BEAT = {
  land: 50,
  /** typed: chars weigh double (a person types slower than a stream lands), after a
   *  digest pause to read what arrived, then a send beat, then a dwell on the sent
   *  line while its emphasis pulses. */
  typeChar: 12,
  digest: 160,
  send: 40,
  dwell: 400,
  typing: 90,
  react: 60,
  meta: 70,
} as const

interface Beat {
  /** The beat begins (typing status may show, composer may fill). */
  start: number
  /** Composer typing window (typed only). */
  typeStart: number
  typedEnd: number
  /** The bubble is on screen from here. */
  land: number
  /** Blocks complete here, cumulatively. */
  blockEnds: number[]
  /** The meta row lands here (mid its beat). */
  metaAt: number
  /** Timeline reactions pop here. */
  reactAt: number
  end: number
}

interface Timeline {
  beats: Beat[]
  total: number
}

function buildTimeline(script: ChatScript): Timeline {
  let at = 0
  const beats = script.messages.map((m) => {
    const start = at
    if (m.typing) at += BEAT.typing
    let typeStart = at
    let typedEnd = at
    if (m.typed) {
      if (m.from !== "me")
        throw new Error('telegram-chat: only a message from "me" can be typed')
      const text = m.text ?? ""
      typeStart = at + BEAT.digest
      typedEnd = typeStart + text.length * BEAT.typeChar
      at = typedEnd + BEAT.send
    } else {
      at += BEAT.land
    }
    const land = at
    if (m.typed && m.emphasis) at += BEAT.dwell
    const instant = m.pace === "instant"
    const blockEnds = (m.blocks ?? []).map((b) => {
      at += instant ? 0 : blockText(b).length
      return at
    })
    let metaAt = at
    if (m.meta) {
      metaAt = at + BEAT.meta / 2
      at += BEAT.meta
    }
    const reactAt = land + BEAT.react
    return {
      start,
      typeStart,
      typedEnd,
      land,
      blockEnds,
      metaAt,
      reactAt,
      end: at,
    }
  })
  return { beats, total: Math.max(1, at) }
}

function blockText(b: ChatBlock): string {
  return b.kind === "item" ? `• ${b.text}` : b.text
}

// Telegram colors URLs and @mentions as links inside a bubble; a bare
// "youtube.com/..." is a link to the client, no scheme needed.
const LINK_RE =
  /((?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?|@[a-z0-9_]{3,})/gi

export function hrefOf(token: string): string {
  if (token.startsWith("@")) return `https://t.me/${token.slice(1)}`
  return /^https?:\/\//.test(token) ? token : `https://${token}`
}

/** The first URL inside a text, if any (the thing a chat is about). */
export function linkIn(text: string | undefined): string | undefined {
  return (text ?? "").match(LINK_RE)?.find((t) => !t.startsWith("@"))
}

function linkify(text: string): React.ReactNode {
  const out: React.ReactNode[] = []
  let offset = 0
  for (const [i, part] of text.split(LINK_RE).entries()) {
    out.push(
      i % 2 === 1 ? (
        <a
          className="tgchat-link"
          key={offset}
          href={hrefOf(part)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {part}
        </a>
      ) : (
        part
      ),
    )
    offset += part.length
  }
  return out
}

// A cite is the bot's own citation into the source: on YouTube a timestamp deep-links
// to that second (`&t=29s`); anywhere else it opens the page.
function citeHref(source: string, cite: string): string {
  const url = hrefOf(source)
  const parts = cite.split(":").map(Number)
  const isTime = parts.length >= 2 && parts.every((n) => Number.isInteger(n))
  if (!isTime || !/youtu\.?be/.test(url)) return url
  const seconds = parts.reduce((acc, n) => acc * 60 + n, 0)
  return `${url}${url.includes("?") ? "&" : "?"}t=${seconds}s`
}

// The text with its spotlight token wrapped so it can pulse once sent. Splits on the
// first whole-word match only.
function emphasized(
  text: string,
  emphasis: string | undefined,
  lit: boolean,
): React.ReactNode {
  if (!emphasis) return linkify(text)
  const m = new RegExp(
    `(^|\\s)(${emphasis.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=\\s|$)`,
  ).exec(text)
  if (!m || m.index === undefined) return linkify(text)
  const start = m.index + (m[1] as string).length
  const end = start + emphasis.length
  return (
    <>
      {linkify(text.slice(0, start))}
      <mark className="tgchat-emph" data-on={lit || undefined}>
        {emphasis}
      </mark>
      {linkify(text.slice(end))}
    </>
  )
}

function AvatarVideo({
  className,
  src,
  poster,
}: {
  className: string
  src: string
  poster?: string
}) {
  const ref = React.useRef<HTMLVideoElement>(null)
  React.useEffect(() => {
    const video = ref.current
    if (!video) return
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let visible = false
    const update = () => {
      if (motion.matches || !visible || document.hidden) video.pause()
      else void video.play().catch(() => {})
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      update()
    })
    observer.observe(video)
    motion.addEventListener("change", update)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      video.pause()
      motion.removeEventListener("change", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [])
  // Telegram loops a profile video for as long as it is on screen; this is the client's
  // behaviour, not decoration, so it is the one thing here that never stops on its own.
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      tabIndex={-1}
    />
  )
}

// One avatar element for every slot: the profile VIDEO when there is one (loops
// muted, the photo as poster), else the photo, else a gradient initial.
function Avatar({
  className,
  name,
  photo,
  video,
}: {
  className: string
  name: string
  photo?: string
  video?: string
}) {
  if (video)
    return <AvatarVideo className={className} src={video} poster={photo} />
  // biome-ignore lint/performance/noImgElement: any origin, a small round avatar
  if (photo) return <img className={className} src={photo} alt="" />
  return (
    <span className={className} style={{ background: gradientOf(name) }}>
      {name.charAt(0)}
    </span>
  )
}

/** How long one play of a Noto animation is given before the still comes back. */
const EMOJI_PLAY_MS = 2600

/** An emoji as Telegram paints a reaction: it PLAYS ONCE when the pill first comes into
 *  view, and again on a press, and rests as a still otherwise; a pill that looped
 *  forever was a page that never stopped moving. The still and the animation are the
 *  same set's two files; a fresh element restarts the animation from its first frame.
 *  The glyph when the set has neither (the request 404s and the image hands back). */
function Emoji({
  ch,
  animated,
  play,
}: {
  ch: string
  animated: boolean
  /** Bump to play again. */
  play: number
}) {
  const [plain, setPlain] = React.useState(!animated)
  const [playing, setPlaying] = React.useState(0)
  const seen = React.useRef(false)
  const ref = React.useRef<HTMLImageElement>(null)
  const timer = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])
  const start = React.useCallback(() => {
    if (
      !animated ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    setPlaying((n) => n + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPlaying(0), EMOJI_PLAY_MS)
  }, [animated])
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen.current) return
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting || seen.current) return
      seen.current = true
      io.disconnect()
      start()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [start])
  // biome-ignore lint/correctness/useExhaustiveDependencies: a bump of `play` is the signal
  React.useEffect(() => {
    if (play > 0) start()
  }, [play])
  if (plain)
    return (
      <span className="tgchat-emoji" aria-hidden="true">
        {ch}
      </span>
    )
  return (
    // biome-ignore lint/performance/noImgElement: a small emoji file from a CDN, sized by the pill
    <img
      ref={ref}
      key={playing}
      className="tgchat-emoji"
      src={playing ? animatedEmojiUrl(ch) : stillEmojiUrl(ch)}
      alt={ch}
      loading="lazy"
      onError={() => setPlain(true)}
    />
  )
}

/** Shared glass material; Telegram owns its container-relative geometry and theme. */
function TelegramGlass({
  tone,
  className,
  ...props
}: React.ComponentProps<"div"> & { tone: GlassTone }) {
  return (
    <Glass
      shape="surface"
      tone={tone}
      className={cn(
        "bg-(--tg-glass) text-(--tg-text) [--glass-blur:1.35cqw] dark:bg-(--tg-glass)",
        className,
      )}
      {...props}
    />
  )
}

// ── the component ──

export function TelegramChat({
  script,
  progress,
  from = 0,
  duration,
  until,
  afterlifeDelay = 0,
  frozen = false,
  viewport = "content",
  fit,
  wallpaper,
  theme = "page",
  frame = "phone",
  composer = true,
  focus,
  crop,
  animatedEmoji: animateEmoji = true,
  debug = false,
  scrollable = true,
  className,
}: TelegramChatProps) {
  const animatedEmoji = animateEmoji && !frozen
  // The frameless cut exists so a landing message slides the thread instead of growing
  // the page; a controlled chat (a still, one bubble at `progress`) lands nothing and
  // is simply its content's height.
  const wantsCut =
    (viewport === "container" ? "1" : crop) ??
    (frame === "none" && progress === undefined ? FRAMELESS_CROP : undefined)
  // The accounts: a `from` is the profile itself, a key into `people`, or a bare name.
  const profileOf = (who: Who): ChatProfile | undefined =>
    typeof who === "string" ? script.people?.[who] : who
  const nameOf = (who: Who) =>
    typeof who === "string" ? (profileOf(who)?.name ?? who) : who.name
  const sameSender = (a: Who, b: Who) => {
    if (a === b) return true
    // "me" is a reserved role, even if a profile happens to share its name.
    if (a === "me" || b === "me") return false
    const first = profileOf(a)
    const second = profileOf(b)
    if (!first || !second) return false
    return (
      first === second ||
      Boolean(
        first.handle &&
          second.handle &&
          first.handle.toLowerCase() === second.handle.toLowerCase(),
      )
    )
  }
  const glassTone = theme === "page" ? "auto" : theme
  const manager = script.managedBy ? profileOf(script.managedBy) : undefined
  const header = profileOf(script.chatName)
  const chatTag =
    script.chatTag ?? (header?.bot ? (header.handle ?? "bot") : undefined)
  // YOUR reactions: press a pill and you count; press again and you leave. Session
  // state, keyed by message and emoji, on top of whatever the script and the afterlife
  // clock give the pill.
  const [mine, setMine] = React.useState<ReadonlySet<string>>(() => new Set())
  // Every press also plays the emoji once, as the client does.
  const [presses, setPresses] = React.useState<Record<string, number>>({})
  const toggleMine = (key: string) => {
    setMine((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setPresses((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }))
  }
  const timeline = React.useMemo(() => buildTimeline(script), [script])
  const controlled = progress !== undefined || frozen
  const root = React.useRef<HTMLElement>(null)
  const thread = React.useRef<HTMLDivElement>(null)
  const view = React.useRef<HTMLDivElement>(null)
  const device = React.useRef<HTMLDivElement>(null)
  const bubbles = React.useRef<(HTMLElement | null)[]>([])
  // The ghost: the same messages rendered complete and hidden, for measuring.
  const ghosts = React.useRef<(HTMLElement | null)[]>([])
  const ghostRoot = React.useRef<HTMLDivElement>(null)
  const focused: readonly number[] =
    focus === undefined ? [] : typeof focus === "number" ? [focus] : focus
  for (const f of focused)
    if (!Number.isInteger(f) || f < 0 || f >= script.messages.length)
      throw new Error(
        `telegram-chat: focus ${f} outside 0..${script.messages.length - 1}`,
      )
  const floor =
    typeof from === "number"
      ? from
      : (() => {
          const beat = timeline.beats[from.message]
          if (!beat)
            throw new Error(
              `telegram-chat: from.message ${from.message} outside 0..${timeline.beats.length - 1}`,
            )
          return beat.start / timeline.total
        })()
  // ~6ms per weighted char, no ceiling: a cap squeezed every structural beat of a long
  // script (a typed line went by in a second under a three-summary story).
  const autoDuration =
    duration ?? Math.max(4000, (1 - floor) * timeline.total * 6)

  // The ceiling in raw 0..1 units: the end of message k's beat, mapped through the
  // floor the way `eff` is. No `until`, and the ceiling is the end of the story. THE
  // ACT'S STORY IS "MESSAGE k LANDS NOW": everything before it is context and is already
  // there, so `lift` is where the play starts when the ceiling is raised past it — a
  // reader who scrolls two acts at once, or reloads mid-scrolly, gets the act's own
  // beat and not a blurred replay of the whole conversation at normal speed.
  const rawAt = (weight: number) =>
    floor >= 1
      ? 1
      : Math.min(
          1,
          Math.max(0, (weight / timeline.total - floor) / (1 - floor)),
        )
  const untilBeat = until ? timeline.beats[until.message] : undefined
  if (until && !untilBeat)
    throw new Error(
      `telegram-chat: until.message ${until.message} outside 0..${timeline.beats.length - 1}`,
    )
  const ceiling = untilBeat ? rawAt(untilBeat.end) : 1
  const lift = untilBeat ? rawAt(untilBeat.start) : 0

  const auto = useChatPlayback(root, controlled, autoDuration, ceiling, lift)

  const raw = frozen ? 1 : controlled ? (progress as number) : auto
  const eff = floor + (1 - floor) * Math.min(1, Math.max(0, raw))
  const at = eff * timeline.total
  // THE CUT WAITS FOR ITS TARGET. A phone cropped to a message that has not landed
  // showed the bottom of a thread with nothing to show; the viewport closes down only
  // once the focused message exists (the blur has the same rule). Frameless is always
  // cut: there the viewport is the container, and the page must not reflow.
  const cut =
    wantsCut &&
    (viewport === "container" ||
      frame === "none" ||
      focused.every((f) => at >= (timeline.beats[f] as Beat).land))
      ? wantsCut
      : undefined
  const isGroup = script.kind === "group"
  const completed = at >= timeline.total - BEAT.meta / 2 - 1e-6 || eff >= 1

  const afterlifeEnd = React.useMemo(() => {
    const reactions = script.messages.flatMap((message) =>
      (message.reactions ?? []).filter(
        (reaction) => reaction.when !== "timeline",
      ),
    )
    return Math.max(
      0,
      ...reactions.map(
        (reaction, i) =>
          afterlifeDelay +
          3 +
          i * 6 +
          5 * Math.max(0, (reaction.count ?? 1) - 1),
      ),
      ...(script.afterlife?.messages.map(
        (message) => afterlifeDelay + message.at,
      ) ?? []),
    )
  }, [script, afterlifeDelay])
  const aliveSec = useChatAfterlife(root, completed, afterlifeEnd, frozen)

  const { viewH, scroller, trace, showLatest, scrollToLatest } = useChatLayout({
    elements: { root, thread, view, device, bubbles, ghosts, ghostRoot },
    focused,
    cut,
    frame,
    viewport,
    fit,
    completed,
    position: eff,
    aliveSec,
    debug,
    at,
    ceiling,
    lift,
  })

  // Afterlife reactions across every message, in script order: staggered arrivals
  // with deterministic jitter, each pill lands at 1, climbs to its scripted count one
  // press at a time, stopping at the scripted count.
  let afterlifeIndex = 0
  const arriveAt = (i: number) => afterlifeDelay + 3 + i * 6
  // Pills are BUTTONS: Telegram's reactions are pressable, and the demo's are too. A
  // pill you pressed is drawn as the client draws your own (filled in the accent) and
  // counts you; pressing again takes you off it. What the script and the afterlife clock
  // give the pill is the crowd; you are one more.
  // `final` is the ghost's view: every pill the message will ever carry, without
  // consuming a slot on the afterlife clock (that order belongs to the live thread).
  const reactionPills = (
    m: ChatMessage,
    beat: Beat,
    index: number,
    clock: number,
    final: boolean,
  ) => {
    const shown: { emoji: string; count: number }[] = []
    for (const r of m.reactions ?? []) {
      if (r.when === "timeline") {
        if (clock >= beat.reactAt)
          shown.push({ emoji: r.emoji, count: r.count ?? 1 })
        continue
      }
      if (final) {
        shown.push({ emoji: r.emoji, count: r.count ?? 1 })
        continue
      }
      const i = afterlifeIndex++
      const since = (frozen ? afterlifeEnd : aliveSec) - arriveAt(i)
      if (since < 0) continue
      const target = r.count ?? 1
      const climb = Math.min(target - 1, Math.floor(since / 5))
      shown.push({ emoji: r.emoji, count: 1 + Math.max(0, climb) })
    }
    if (shown.length === 0) return null
    return (
      <div className="tgchat-reacts">
        {shown.map((r) => {
          const key = `${index}:${r.emoji}`
          const own = mine.has(key)
          return (
            <button
              type="button"
              className="tgchat-react"
              key={r.emoji}
              data-mine={own || undefined}
              aria-pressed={own}
              aria-label={`${r.emoji} ${r.count + (own ? 1 : 0)}`}
              onClick={() => toggleMine(key)}
            >
              <Emoji
                ch={r.emoji}
                animated={animatedEmoji}
                play={presses[key] ?? 0}
              />
              {(isGroup ||
                m.reactions?.some(
                  (reaction) =>
                    reaction.emoji === r.emoji && reaction.count !== undefined,
                )) && <span className="n">{r.count + (own ? 1 : 0)}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  const senderLabel = (who: Who) =>
    isGroup ? (
      <div
        className="tgchat-from"
        style={{ color: SENDER_COLORS[senderIndex(nameOf(who))] }}
      >
        {nameOf(who)}
      </div>
    ) : null

  // Group chats put a mini avatar beside every left bubble, like Telegram does: the
  // profile's picture when the sender has one, the message's own, else the initial.
  const leftRow = (bubble: React.ReactNode, who: Who, avatarUrl?: string) =>
    isGroup ? (
      <div className="tgchat-rowline">
        <Avatar
          className="tgchat-mini"
          name={nameOf(who)}
          photo={avatarUrl ?? profileOf(who)?.avatar}
          video={frozen ? undefined : profileOf(who)?.avatarVideo}
        />
        {bubble}
      </div>
    ) : (
      bubble
    )

  const renderBlock = (
    b: ChatBlock,
    key: number,
    source: string,
    chars?: number,
  ) => {
    const text = blockText(b)
    const cite = b.kind === "item" || b.kind === "quote" ? b.cite : undefined
    const inner = (
      <>
        {chars === undefined ? text : text.slice(0, chars)}
        {chars === undefined && cite && (
          <a
            className="tgchat-cite"
            href={citeHref(source, cite)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {cite}
          </a>
        )}
      </>
    )
    // Telegram's blockquote: a tinted box in the sender's colour with a bar on the left
    // and a closing quote mark in its corner; the attribution is body text under it,
    // italic, the way the bot writes it.
    if (b.kind === "quote")
      return (
        <div className="q" key={key}>
          <blockquote className="tgchat-quote">{inner}</blockquote>
          {chars === undefined && b.by && <span className="by">{b.by}</span>}
        </div>
      )
    return (
      <div className={b.kind === "heading" ? "h" : "i"} key={key}>
        {b.kind === "heading" && b.emoji && (
          <span className="e">{b.emoji}</span>
        )}
        {inner}
      </div>
    )
  }

  // Header status: a message's own `typing` for a beat before it lands, and a late
  // message telegraphs itself 3 s ahead, the small magic Telegram does.
  const typingMessage = script.messages.find((m, i) => {
    const b = timeline.beats[i] as Beat
    return m.typing && at >= b.start + BEAT.typing / 3 && at < b.land
  })
  const nextLate = script.afterlife?.messages.find(
    (late) => aliveSec < afterlifeDelay + late.at,
  )
  const lateTyping = Boolean(
    nextLate && aliveSec >= afterlifeDelay + nextLate.at - 3,
  )
  const typingLabel = typingMessage
    ? (typingMessage.typing as string)
    : lateTyping
      ? "typing"
      : null

  // The composer: a typed message mid-flight.
  const typingIndex = script.messages.findIndex((m, i) => {
    const b = timeline.beats[i] as Beat
    return m.typed && at > b.typeStart && at < b.land
  })
  const composing =
    typingIndex >= 0 ? (script.messages[typingIndex] as ChatMessage) : null
  const composingBeat =
    typingIndex >= 0 ? (timeline.beats[typingIndex] as Beat) : null
  // Characters in the composer, typed one by one.
  const composerChars =
    composing && composingBeat
      ? Math.min(
          Math.ceil((at - composingBeat.typeStart) / BEAT.typeChar),
          (composing.text ?? "").length,
        )
      : 0

  /** One message at a moment of the story: nothing before it lands, its blocks up to
   *  the clock, the partial one mid-stream. The live thread renders it at `at`; the
   *  ghost renders it complete (an infinite clock) to measure what it will become. */
  const renderMessage = (
    m: ChatMessage,
    i: number,
    clock: number,
    held: React.RefObject<(HTMLElement | null)[]>,
  ) => {
    const beat = timeline.beats[i] as Beat
    if (clock < beat.land) return null
    const final = !Number.isFinite(clock)
    const source = m.source ?? linkIn(m.text) ?? ""
    const next = timeline.beats[i + 1]
    const previousMessage = script.messages[i - 1]
    const nextMessage = script.messages[i + 1]
    const continued =
      previousMessage && sameSender(previousMessage.from, m.from)
    const hasFollowing =
      nextMessage &&
      next &&
      clock >= next.land &&
      sameSender(nextMessage.from, m.from)
    const lit = Boolean(m.emphasis) && (!next || clock < next.land)
    const streaming = m.blocks !== undefined
    let full = 0
    while (
      full < beat.blockEnds.length &&
      (beat.blockEnds[full] as number) <= clock
    )
      full++
    const prevEnd =
      full === 0
        ? beat.land + (m.typed && m.emphasis ? BEAT.dwell : 0)
        : (beat.blockEnds[full - 1] as number)
    const partial =
      streaming && full < (m.blocks as ChatBlock[]).length && clock > prevEnd
        ? (m.blocks as ChatBlock[])[full]
        : undefined
    const body = (
      <>
        {m.reply && (
          <div
            className="tgchat-reply"
            style={
              {
                "--tg-reply-color":
                  SENDER_COLORS[senderIndex(nameOf(m.reply.from))],
              } as React.CSSProperties
            }
          >
            <strong>{nameOf(m.reply.from)}</strong>
            <span>{m.reply.text}</span>
          </div>
        )}
        {m.via && <div className="tgchat-via">{m.via}</div>}
        {m.text && emphasized(m.text, m.emphasis, lit)}
        {/* The webpage preview under a link: `web-preview` in its telegram style, the
            same card every surface draws from the same five facts, coloured by the
            bubble's `--wp-*`. */}
        {m.preview && (
          <WebPreview
            style="telegram"
            facts={{ url: hrefOf(source), ...m.preview }}
          />
        )}
        {streaming &&
          (m.blocks as ChatBlock[])
            .slice(0, full)
            .map((b, k) => renderBlock(b, k, source))}
        {partial &&
          renderBlock(partial, full, source, Math.floor(clock - prevEnd))}
        {m.meta && clock >= beat.metaAt && (
          <div className="tgchat-meta">
            <a
              className="src"
              href={m.meta.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {m.meta.label}
            </a>
            <span className="time">{m.meta.time}</span>
          </div>
        )}
        {reactionPills(m, beat, i, clock, final)}
      </>
    )
    const hero = focused.includes(i) || undefined
    const hold = (el: HTMLElement | null) => {
      held.current[i] = el
    }
    if (m.from === "me")
      return (
        <div
          ref={hold}
          data-focused={hero}
          data-continued={continued || undefined}
          data-tail={!hasFollowing || undefined}
          className={`tgchat-bubble user${m.preview || linkIn(m.text) ? " link" : ""}`}
          key={i}
        >
          {body}
        </div>
      )
    return (
      <React.Fragment key={i}>
        {leftRow(
          <div
            ref={hold}
            data-focused={hero}
            data-continued={continued || undefined}
            data-tail={!hasFollowing || undefined}
            className={`tgchat-bubble bot${streaming ? " tgchat-summary" : ""}${!streaming && (m.preview || linkIn(m.text)) ? " link" : ""}`}
            // The sender's peer colour: Telegram tints a quote in an incoming message
            // with it, the same palette that colours a group's sender labels.
            style={
              {
                "--tg-quote": SENDER_COLORS[senderIndex(nameOf(m.from))],
              } as React.CSSProperties
            }
          >
            {senderLabel(m.from)}
            {body}
          </div>,
          m.from,
          m.avatar,
        )}
      </React.Fragment>
    )
  }

  return (
    <figure
      ref={root}
      data-frozen={frozen}
      className={`tgchat${className ? ` ${className}` : ""}`}
      data-theme={theme}
      data-managed={script.managedBy ? "" : undefined}
      data-frame={frame}
      data-focus={
        // The blur waits for the focused message to EXIST: before it lands there is
        // nothing to focus on, and blurring everything pointed at nothing.
        focused.some((f) => at >= (timeline.beats[f] as Beat).land) || undefined
      }
      data-cut={scroller ? "" : undefined}
      data-settled={(completed && scrollable) || undefined}
      // A line is being typed: a page may zoom the device onto its composer for the beat.
      data-typing={composing && composerChars > 0 ? "" : undefined}
      aria-label={script.alt}
    >
      {/* The viewport: what the reader sees of the device. Cut to an aspect, it is a
          scroller of that height with the device inside at full width and a scrim at
          each edge that hides something; otherwise it is the device's own box. */}
      <div
        ref={view}
        className="tgchat-view"
        style={
          viewport === "container"
            ? { height: "100%" }
            : viewH !== null
              ? { height: `${viewH.toFixed(1)}px` }
              : cut
                ? { aspectRatio: cut }
                : undefined
        }
      >
        {scroller && <div className="tgchat-scrim" data-edge="top" />}
        <IphoneFrame
          ref={device}
          bare={frame !== "phone"}
          className="tgchat-phone"
          screenClassName="tgchat-screen"
        >
          {frame === "phone" && (
            <Scrims
              position="absolute"
              mode="static"
              className="tgchat-chrome-scrim"
            />
          )}
          {wallpaper && (
            <div
              className="tgchat-wall"
              style={{
                WebkitMaskImage: `url(${wallpaper})`,
                maskImage: `url(${wallpaper})`,
              }}
            />
          )}

          {/* The header is the PHONE's chrome. A bare canvas has none: a chat title
                pinned over floating bubbles was the device's composition forced onto
                the mode whose point is no device. What the header carried that is
                story, the typing status, goes into the thread instead. */}
          {frame === "phone" && (
            <div className="tgchat-header" aria-hidden="true">
              <TelegramGlass tone={glassTone} className="tgchat-round">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M10 3 5 8l5 5" />
                </svg>
              </TelegramGlass>
              <TelegramGlass tone={glassTone} className="tgchat-card">
                <div className="tgchat-names">
                  <strong>{nameOf(script.chatName)}</strong>
                  {typingLabel ? (
                    <span className="typing">
                      <span className="tgchat-tdots">
                        <i />
                        <i />
                        <i />
                      </span>
                      {typingLabel}
                    </span>
                  ) : (
                    chatTag && <span>{chatTag}</span>
                  )}
                </div>
              </TelegramGlass>
              <TelegramGlass tone={glassTone} className="tgchat-profile">
                <Avatar
                  className="tgchat-avatar"
                  name={nameOf(script.chatName)}
                  photo={script.avatar ?? header?.avatar}
                  video={
                    frozen
                      ? undefined
                      : (script.avatarVideo ?? header?.avatarVideo)
                  }
                />
              </TelegramGlass>
            </div>
          )}
          {frame === "phone" && script.managedBy && (
            <TelegramGlass
              tone={glassTone}
              className="tgchat-manager absolute"
              aria-hidden="true"
            >
              <Avatar
                className="tgchat-avatar"
                name={nameOf(script.managedBy)}
                photo={manager?.avatar}
                video={frozen ? undefined : manager?.avatarVideo}
              />
              <div className="tgchat-manager-names">
                <strong>{nameOf(script.managedBy)}</strong>
                <span>bot manages this chat</span>
              </div>
              <span className="tgchat-manager-stop">STOP</span>
              <SlidersHorizontal />
            </TelegramGlass>
          )}
          <div className="tgchat-messages" ref={thread}>
            <div className="tgchat-thread">
              {/* Messages are positional by design: their order IS their identity,
                  and the array never reorders. */}
              {script.messages.map((m, i) => renderMessage(m, i, at, bubbles))}
              {/* THE FINAL STATE, hidden, for measuring: how tall the focused messages
                    WILL be once they have landed. The cut sizes its viewport from this
                    instead of from the growing live bubble, so a summary streaming in
                    never resizes the page under the reader. Only while a cut has a
                    focus, the one consumer of the number; zero height and clipped, so it
                    adds nothing to the thread's scroll range. */}
              {focused.length > 0 && (
                <div className="tgchat-ghost" aria-hidden ref={ghostRoot}>
                  <div className="tgchat-thread">
                    {script.messages.map((m, i) =>
                      renderMessage(m, i, Number.POSITIVE_INFINITY, ghosts),
                    )}
                  </div>
                </div>
              )}
              {/* A late message is a left bubble like any other: in a group it
                    carries its sender's label and mini avatar (a gradient initial
                    when there is no photo), the same row every scripted message
                    gets. Its own photo, or video, rides on the afterlife block. */}
              {script.afterlife?.messages
                .filter((late) => aliveSec >= afterlifeDelay + late.at)
                .map((late) => {
                  const who = script.afterlife?.from ?? script.chatName
                  const bubble = (
                    <div className="tgchat-bubble bot">
                      {senderLabel(who)}
                      {linkify(late.text)}
                    </div>
                  )
                  if (
                    !isGroup &&
                    !script.afterlife?.avatar &&
                    !profileOf(who)?.avatar
                  )
                    return (
                      <React.Fragment key={late.at}>{bubble}</React.Fragment>
                    )
                  return (
                    <div className="tgchat-rowline" key={late.at}>
                      <Avatar
                        className="tgchat-mini"
                        name={nameOf(who)}
                        photo={
                          script.afterlife?.avatar ?? profileOf(who)?.avatar
                        }
                        video={
                          frozen
                            ? undefined
                            : (script.afterlife?.avatarVideo ??
                              profileOf(who)?.avatarVideo)
                        }
                      />
                      {bubble}
                    </div>
                  )
                })}
            </div>
          </div>
          {composer && composing?.reply && composerChars > 0 && (
            <TelegramGlass
              tone={glassTone}
              className="tgchat-replybar absolute [.tgchat[data-frame=none]_&]:relative"
              aria-hidden="true"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 17l-5-5 5-5" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              <div>
                <strong>Reply to {nameOf(composing.reply.from)}</strong>
                <span>{composing.reply.text}</span>
              </div>
            </TelegramGlass>
          )}
          {frame === "phone" && completed && scrollable && showLatest && (
            <Glass
              as="button"
              shape="circle"
              tone={glassTone}
              className="absolute right-(--tg-control-inset) bottom-[calc(var(--tg-composer-h)+var(--tg-control-bottom)+2cqw)] z-3 size-[10cqw] bg-(--tg-glass) text-(--tg-text) [--glass-blur:1.35cqw] dark:bg-(--tg-glass)"
              aria-label="Jump to latest message"
              onClick={scrollToLatest}
            >
              <ChevronDown className="size-[5.6cqw]" />
            </Glass>
          )}
          {composer && (
            <div
              className="tgchat-composer"
              aria-hidden="true"
              data-idle={!(composing && composerChars > 0) || undefined}
            >
              {script.kind === "bot" && (
                <span className="pill">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                  Menu
                </span>
              )}
              <TelegramGlass tone={glassTone} className="cbtn">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </TelegramGlass>
              <TelegramGlass tone={glassTone} className="box">
                {composing && composerChars > 0 ? (
                  <span className="typed">
                    <span>
                      {(composing.text ?? "").slice(0, composerChars)}
                    </span>
                    <span className="tgchat-caret" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="hint">Message</span>
                )}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </TelegramGlass>
              <TelegramGlass tone={glassTone} className="cbtn">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </TelegramGlass>
            </div>
          )}
        </IphoneFrame>
        {scroller && <div className="tgchat-scrim" data-edge="bottom" />}
      </div>
      {debug && trace.current && (
        <pre className="tgchat-debug">
          {Object.entries(trace.current)
            .map(([k, v]) => `${k} ${String(v)}`)
            .join("  ")}
        </pre>
      )}
    </figure>
  )
}
