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
//                 the typing status a line in the thread, the composer only while a
//                 message is being typed. Every size is a share of the container, so the
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

import * as React from "react"
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
  /** Shown in groups only (a private chat has two people; its pill is the bare emoji). */
  count?: number
  /** "timeline": pops one beat after the message lands, scrubbable. "afterlife"
   *  (default): wall-clock, starts seconds after the story completes, dribbles in,
   *  counts keep creeping up forever; scrubbing cannot summon or rewind it. */
  when?: "timeline" | "afterlife"
}

export type ChatBlock =
  | { kind: "heading"; text: string; emoji?: string }
  | { kind: "item"; text: string; cite?: string }
  | { kind: "quote"; text: string; by?: string; cite?: string }

export interface ChatMessage {
  /** "me" is your bubble on the right. Any other string is a sender on the left; in a
   *  group it is the colored label and picks the mini avatar. */
  from: "me" | string
  text?: string
  /** The sender's photo (left bubbles in groups). */
  avatar?: string
  /** The quoted message this one replies to. */
  reply?: { from: string; text: string }
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
  chatName: string
  /** Sub-line under the name ("online" · "bot" · "24 members"). Defaults from the
   *  header's profile: a bot's handle, else nothing. */
  chatTag?: string
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
    from?: string
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
  /** URL of Telegram's doodle pattern (telegram-tt's assets/pattern.svg), applied as
   *  a CSS mask tinted per theme, exactly like the client. */
  wallpaper?: string
  /** `page` follows the page's own light/dark; `dark` or `light` pins it, for a chat
   *  that must look like Telegram's own theme whatever the page is doing. */
  theme?: "dark" | "light" | "page"
  /** `phone` (default) draws the device. `none` draws the messages on a bare canvas at
   *  the container's width: no header (the typing status is a line in the thread), the
   *  composer only while typing. */
  frame?: "phone" | "none"
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
/** Air above and below a focused message, as a share of the viewport; and how far a
 *  viewport may grow past its crop to hold a tall one before showing its start instead. */
const FOCUS_PAD = 0.06
const FOCUS_GROW = 1.5

/** A CSS aspect-ratio value ("4 / 3", "1/1", "1.5") as width over height. */
function ratioOf(crop: string): number {
  const m = /^\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*$/.exec(crop)
  const w = m ? Number(m[1]) : Number.NaN
  const h = m?.[2] ? Number(m[2]) : 1
  if (!(w > 0) || !(h > 0))
    throw new Error(`telegram-chat: crop "${crop}" is not an aspect ratio`)
  return w / h
}

type Placement = { x: number; y: number; w: number; h: number }

/** An element's box in its ancestor's layout coordinates, transforms ignored: the offset
 *  chain, less any scroll between them. Rects would report the zoomed position. */
function placeIn(el: HTMLElement, ancestor: HTMLElement): Placement {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== ancestor) {
    x += node.offsetLeft
    y += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null
    // Every scrolling box between the node and its offsetParent, the offsetParent
    // included, shifts where the node is seen. The ancestor's own scroll is not the
    // question: the answer is in ITS content coordinates.
    for (
      let s: HTMLElement | null = node.parentElement;
      s && s !== ancestor;
      s = s.parentElement
    ) {
      x -= s.scrollLeft
      y -= s.scrollTop
      if (s === parent) break
    }
    node = parent
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

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
  typeChar: 2,
  digest: 160,
  send: 40,
  dwell: 220,
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
      typeStart = at + BEAT.digest
      typedEnd = typeStart + (m.text ?? "").length * BEAT.typeChar
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      ref.current?.pause()
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      autoPlay
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
  const start = React.useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setPlaying((n) => n + 1)
    window.setTimeout(() => setPlaying(0), EMOJI_PLAY_MS)
  }, [])
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
  if (plain) return <>{ch}</>
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

// ── the component ──

export function TelegramChat({
  script,
  progress,
  from = 0,
  duration,
  until,
  afterlifeDelay = 0,
  wallpaper,
  theme = "page",
  frame = "phone",
  focus,
  crop,
  animatedEmoji = true,
  className,
}: TelegramChatProps) {
  const cut = crop ?? (frame === "none" ? FRAMELESS_CROP : undefined)
  // The accounts: a `from` is a key into `people` when it is one, a bare name when not.
  const profileOf = (who: string): ChatProfile | undefined =>
    script.people?.[who]
  const nameOf = (who: string) => profileOf(who)?.name ?? who
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
  const controlled = progress !== undefined
  const [auto, setAuto] = React.useState(0)
  const [aliveSec, setAliveSec] = React.useState(0)
  const root = React.useRef<HTMLElement>(null)
  const thread = React.useRef<HTMLDivElement>(null)
  const view = React.useRef<HTMLDivElement>(null)
  const device = React.useRef<HTMLDivElement>(null)
  const bubbles = React.useRef<(HTMLElement | null)[]>([])
  const focused: readonly number[] =
    focus === undefined ? [] : typeof focus === "number" ? [focus] : focus
  for (const f of focused)
    if (!Number.isInteger(f) || f < 0 || f >= script.messages.length)
      throw new Error(
        `telegram-chat: focus ${f} outside 0..${script.messages.length - 1}`,
      )
  const target = focused[0]
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
  // ~6ms per weighted char: a brisk stream, bounded both ways.
  const autoDuration =
    duration ??
    Math.min(14000, Math.max(4000, (1 - floor) * timeline.total * 6))

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

  // One-shot in-view autoplay (uncontrolled only): rAF advance, paused off-screen,
  // reduced-motion renders the completed state, never replays (anti-strobe). The
  // position lives in a ref so a raised ceiling RESUMES from where the story waited
  // rather than starting it over.
  const played = React.useRef(0)
  React.useEffect(() => {
    if (controlled) return
    const el = root.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played.current = ceiling
      setAuto(ceiling)
      return
    }
    // Context lands whole; only the act's own beat plays.
    if (played.current < lift) {
      played.current = lift
      setAuto(lift)
    }
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      played.current = Math.min(
        ceiling,
        played.current + (now - last) / autoDuration,
      )
      last = now
      setAuto(played.current)
      if (played.current < ceiling) frame = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(frame)
        if (entry?.isIntersecting && played.current < ceiling) {
          last = performance.now()
          frame = requestAnimationFrame(tick)
        }
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [controlled, autoDuration, ceiling, lift])

  const raw = controlled ? (progress as number) : auto
  const eff = floor + (1 - floor) * Math.min(1, Math.max(0, raw))
  const at = eff * timeline.total
  const isGroup = script.kind === "group"
  const completed = at >= timeline.total - BEAT.meta / 2 - 1e-6 || eff >= 1

  // The afterlife clock: wall-clock seconds since the story completed. Immune to
  // progress by construction: scrolling back pauses the clock but never rewinds it,
  // so reactions and late messages only ever accumulate.
  React.useEffect(() => {
    if (!completed) return
    const id = window.setInterval(() => setAliveSec((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [completed])

  // The thread is a real scroller ONLY once the story has settled (data-settled
  // unlocks overflow): while streaming the wheel belongs to the page, and the thread
  // stays pinned to the bottom. Settled, you scroll up to what was summoned. A late
  // message pulls it down only if you were already at the bottom, exactly the
  // client's behaviour.
  // A FOCUSED message owns the scroll instead: the thread centres it, because the reader
  // was pointed at it — and moves ONLY when where it wants to be changes. The afterlife
  // clock re-runs this every second; re-setting the same scrollTop each tick yanked the
  // thread back from wherever the reader had scrolled it.
  const threadWant = React.useRef<number | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: eff/aliveSec are the beats that grow the thread
  React.useLayoutEffect(() => {
    const el = thread.current
    if (!el) return
    const hero = target === undefined ? null : bubbles.current[target]
    if (hero) {
      // In the thread's content coordinates, so the scroll it sets is absolute.
      // Centred when it fits; a message taller than the screen shows its START, the
      // rest a scroll away. Centring it showed its middle with both ends cut.
      const box = placeIn(hero, el)
      const pad = el.clientHeight * FOCUS_PAD
      const want = Math.max(
        0,
        box.h + 2 * pad <= el.clientHeight
          ? box.y + box.h / 2 - el.clientHeight / 2
          : box.y - pad,
      )
      if (
        threadWant.current !== null &&
        Math.abs(want - threadWant.current) < 1
      )
        return
      threadWant.current = want
      el.scrollTop = want
      return
    }
    threadWant.current = null
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (!completed || atBottom) el.scrollTop = el.scrollHeight
  }, [completed, eff, aliveSec, target])

  // THE CUT is a real scroller. The viewport takes the crop's height (a measured px
  // value, so a change of crop TRANSITIONS instead of jumping: a phone with a focused
  // message can cut down onto it in the next act), the device keeps its full width
  // inside it, and the viewport scrolls so the focused message's centre (measured in
  // layout coordinates, the thread's scroll subtracted) sits at its centre, or, with
  // nothing focused, to the latest. A scroll, not a transform: the reader can scroll
  // up once the story settles, exactly as in the phone's thread, and the edge scrims
  // are scroll-driven in CSS, so they appear only where something is actually hidden.
  // Smooth after the first frame, so a landing message slides the thread up the way a
  // chat does; instant under reduced motion.
  // The viewport ALWAYS carries a measured px height, cut or not: `auto` to a px value
  // does not transition, and the whole point of the cut is that it closes over the
  // device like a curtain while the scroll glides, never a flash. The scroll moves only
  // when where it wants to be changes (the afterlife clock re-runs this every second).
  const [viewH, setViewH] = React.useState<number | null>(null)
  const viewWant = React.useRef<number | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: eff and aliveSec grow the thread and move the message
  React.useLayoutEffect(() => {
    const port = view.current
    const dev = device.current
    if (!port || !dev) return
    const place = () => {
      const dh = dev.offsetHeight
      if (!cut) {
        setViewH(dh)
        viewWant.current = null
        return
      }
      // THE VIEWPORT HOLDS THE FOCUSED MESSAGE. The crop is its floor; a taller message
      // grows it, within reason (half again the crop), so the message is seen whole;
      // past that the message's START is what shows and the rest is a scroll away.
      // Centring a message taller than the box showed its middle with both ends cut.
      const base = port.clientWidth / ratioOf(cut)
      const hero = target === undefined ? null : bubbles.current[target]
      const heroH = hero ? hero.offsetHeight : 0
      const pad = base * FOCUS_PAD
      const vh = Math.min(
        dh,
        hero
          ? Math.min(Math.max(base, heroH + 2 * pad), base * FOCUS_GROW)
          : base,
      )
      setViewH(vh)
      const heroY = hero ? placeIn(hero, dev).y : 0
      const want = hero
        ? heroH + 2 * pad <= vh
          ? heroY + heroH / 2 - vh / 2
          : heroY - pad
        : dh - vh
      const top = Math.max(0, Math.min(dh - vh, want))
      if (viewWant.current !== null && Math.abs(top - viewWant.current) < 1)
        return
      const smooth =
        viewWant.current !== null &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      viewWant.current = top
      port.scrollTo({ top, behavior: smooth ? "smooth" : "auto" })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(port)
    ro.observe(dev)
    return () => ro.disconnect()
  }, [cut, target, eff, aliveSec, frame])

  // Afterlife reactions across every message, in script order: staggered arrivals
  // with deterministic jitter, each pill lands at 1, climbs to its scripted count one
  // press at a time, then (groups only) keeps creeping up forever.
  let afterlifeIndex = 0
  const arriveAt = (i: number) => afterlifeDelay + 3 + i * 6 + ((i * 7) % 7)
  // Pills are BUTTONS: Telegram's reactions are pressable, and the demo's are too. A
  // pill you pressed is drawn as the client draws your own (filled in the accent) and
  // counts you; pressing again takes you off it. What the script and the afterlife clock
  // give the pill is the crowd; you are one more.
  const reactionPills = (m: ChatMessage, beat: Beat, index: number) => {
    const shown: { emoji: string; count: number }[] = []
    for (const r of m.reactions ?? []) {
      if (r.when === "timeline") {
        if (at >= beat.reactAt)
          shown.push({ emoji: r.emoji, count: r.count ?? 1 })
        continue
      }
      const i = afterlifeIndex++
      const since = aliveSec - arriveAt(i)
      if (since < 0) continue
      const target = r.count ?? 1
      const climb = Math.min(target - 1, Math.floor(since / 5))
      const eternal = isGroup
        ? Math.max(0, Math.floor((since - 5 * (target - 1)) / 22))
        : 0
      shown.push({ emoji: r.emoji, count: 1 + Math.max(0, climb) + eternal })
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
              {isGroup && <span className="n">{r.count + (own ? 1 : 0)}</span>}
            </button>
          )
        })}
      </div>
    )
  }

  const senderLabel = (who: string) =>
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
  const leftRow = (bubble: React.ReactNode, who: string, avatarUrl?: string) =>
    isGroup ? (
      <div className="tgchat-rowline">
        <Avatar
          className="tgchat-mini"
          name={nameOf(who)}
          photo={avatarUrl ?? profileOf(who)?.avatar}
          video={profileOf(who)?.avatarVideo}
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
    return (
      <div
        className={b.kind === "heading" ? "h" : b.kind === "item" ? "i" : "q"}
        key={key}
      >
        {b.kind === "heading" && b.emoji && (
          <span className="e">{b.emoji}</span>
        )}
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
        {chars === undefined && b.kind === "quote" && b.by && (
          <span className="by">{b.by}</span>
        )}
        {chars !== undefined && <span className="tgchat-caret" />}
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
  const composerChars =
    composing && composingBeat
      ? Math.min(
          Math.ceil((at - composingBeat.typeStart) / BEAT.typeChar),
          (composing.text ?? "").length,
        )
      : 0

  return (
    <figure
      ref={root}
      className={`tgchat${className ? ` ${className}` : ""}`}
      data-theme={theme}
      data-frame={frame}
      data-focus={
        // The blur waits for the focused message to EXIST: before it lands there is
        // nothing to focus on, and blurring everything pointed at nothing.
        focused.some((f) => at >= (timeline.beats[f] as Beat).land) || undefined
      }
      data-cut={cut ? "" : undefined}
      data-settled={completed || undefined}
      aria-label={script.alt}
    >
      {/* The viewport: what the reader sees of the device. Cut to an aspect, it is a
          scroller of that height with the device inside at full width and a scrim at
          each edge that hides something; otherwise it is the device's own box. */}
      <div
        ref={view}
        className="tgchat-view"
        style={
          viewH !== null
            ? { height: `${viewH.toFixed(1)}px` }
            : cut
              ? { aspectRatio: cut }
              : undefined
        }
      >
        {cut && <div className="tgchat-scrim" data-edge="top" />}
        <div ref={device} className="tgchat-phone">
          {frame === "phone" && (
            <>
              <span className="tgchat-btn action" />
              <span className="tgchat-btn vol-up" />
              <span className="tgchat-btn vol-down" />
              <span className="tgchat-btn power" />
            </>
          )}
          <div className="tgchat-screen">
            {wallpaper && (
              <div
                className="tgchat-wall"
                style={{
                  WebkitMaskImage: `url(${wallpaper})`,
                  maskImage: `url(${wallpaper})`,
                }}
              />
            )}
            {frame === "phone" && (
              <>
                <div className="tgchat-island" />
                <div className="tgchat-status">
                  <span>9:41</span>
                  <span className="radios">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 17 11"
                      width="17"
                      height="11"
                    >
                      <g fill="currentColor">
                        <rect x="0" y="7" width="3" height="4" rx="1" />
                        <rect x="4.5" y="5" width="3" height="6" rx="1" />
                        <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
                        <rect x="13.5" y="0" width="3" height="11" rx="1" />
                      </g>
                    </svg>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 26 11"
                      width="26"
                      height="11"
                    >
                      <rect
                        x="0.6"
                        y="0.6"
                        width="21"
                        height="9.8"
                        rx="2.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        opacity="0.5"
                      />
                      <rect
                        x="23.4"
                        y="3.6"
                        width="2"
                        height="3.8"
                        rx="1"
                        fill="currentColor"
                        opacity="0.5"
                      />
                      <rect
                        x="2.2"
                        y="2.2"
                        width="14"
                        height="6.6"
                        rx="1.6"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                </div>
              </>
            )}
            {/* The header is the PHONE's chrome. A bare canvas has none: a chat title
                pinned over floating bubbles was the device's composition forced onto
                the mode whose point is no device. What the header carried that is
                story, the typing status, goes into the thread instead. */}
            {frame === "phone" && (
              <div className="tgchat-header">
                <span className="tgchat-round">
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
                </span>
                <div className="tgchat-card">
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
                </div>
                <Avatar
                  className="tgchat-avatar"
                  name={nameOf(script.chatName)}
                  photo={script.avatar ?? header?.avatar}
                  video={script.avatarVideo ?? header?.avatarVideo}
                />
              </div>
            )}
            <div className="tgchat-messages" ref={thread}>
              <div className="tgchat-thread">
                {/* Messages are positional by design: their order IS their identity,
                  and the array never reorders. */}
                {script.messages.map((m, i) => {
                  const beat = timeline.beats[i] as Beat
                  if (at < beat.land) return null
                  const source = m.source ?? linkIn(m.text) ?? ""
                  const next = timeline.beats[i + 1]
                  const lit = Boolean(m.emphasis) && (!next || at < next.land)
                  const streaming = m.blocks !== undefined
                  let full = 0
                  while (
                    full < beat.blockEnds.length &&
                    (beat.blockEnds[full] as number) <= at
                  )
                    full++
                  const prevEnd =
                    full === 0
                      ? beat.land + (m.typed && m.emphasis ? BEAT.dwell : 0)
                      : (beat.blockEnds[full - 1] as number)
                  const partial =
                    streaming &&
                    full < (m.blocks as ChatBlock[]).length &&
                    at > prevEnd
                      ? (m.blocks as ChatBlock[])[full]
                      : undefined
                  const body = (
                    <>
                      {m.reply && (
                        <div className="tgchat-reply">
                          <strong>{m.reply.from}</strong>
                          <span>{m.reply.text}</span>
                        </div>
                      )}
                      {m.via && <div className="tgchat-via">{m.via}</div>}
                      {m.text && emphasized(m.text, m.emphasis, lit)}
                      {/* The webpage preview under a link: `web-preview` in its
                          telegram style, the same card every surface draws from the
                          same five facts, coloured by the bubble's `--wp-*`. */}
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
                        renderBlock(
                          partial,
                          full,
                          source,
                          Math.floor(at - prevEnd),
                        )}
                      {m.meta && at >= beat.metaAt && (
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
                      {reactionPills(m, beat, i)}
                    </>
                  )
                  const hero = focused.includes(i) || undefined
                  const hold = (el: HTMLElement | null) => {
                    bubbles.current[i] = el
                  }
                  if (m.from === "me")
                    return (
                      <div
                        ref={hold}
                        data-focused={hero}
                        className={`tgchat-bubble user${m.preview || linkIn(m.text) ? " link" : ""}`}
                        // biome-ignore lint/suspicious/noArrayIndexKey: positional by design
                        key={i}
                      >
                        {body}
                      </div>
                    )
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: positional by design
                    <React.Fragment key={i}>
                      {leftRow(
                        <div
                          ref={hold}
                          data-focused={hero}
                          className={`tgchat-bubble bot${streaming ? " tgchat-summary" : ""}${!streaming && (m.preview || linkIn(m.text)) ? " link" : ""}`}
                        >
                          {senderLabel(m.from)}
                          {body}
                        </div>,
                        m.from,
                        m.avatar,
                      )}
                    </React.Fragment>
                  )
                })}
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
                            script.afterlife?.avatarVideo ??
                            profileOf(who)?.avatarVideo
                          }
                        />
                        {bubble}
                      </div>
                    )
                  })}
                {/* Frameless: the typing status the header would have carried, under
                    the last message, the way a bare thread shows it. */}
                {frame === "none" && typingLabel && (
                  <div className="tgchat-typing-line">
                    <span className="tgchat-tdots">
                      <i />
                      <i />
                      <i />
                    </span>
                    {typingLabel}
                  </div>
                )}
              </div>
            </div>
            {composing?.reply && composerChars > 0 && (
              <div className="tgchat-replybar">
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
                  <strong>Reply to {composing.reply.from}</strong>
                  <span>{composing.reply.text}</span>
                </div>
              </div>
            )}
            <div
              className="tgchat-composer"
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
              <span className="cbtn">
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
              </span>
              <div className="box">
                {composing && composerChars > 0 ? (
                  <span className="typed">
                    {(composing.text ?? "").slice(0, composerChars)}
                    <span className="tgchat-caret" />
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
              </div>
              <span className="cbtn">
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
              </span>
            </div>
            {frame === "phone" && (
              <div className="tgchat-gesture">
                <span />
              </div>
            )}
          </div>
        </div>
        {cut && <div className="tgchat-scrim" data-edge="bottom" />}
      </div>
    </figure>
  )
}
