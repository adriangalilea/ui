// A PUBLIC CHANNEL POST, as telegram-chat's own data: the fetch reads t.me's embed page
// once and hands back a `ChatScript` of one message from the channel, so a post is drawn
// by the same bubble every chat on the page uses (`frame="none"`, `frozen`), never by a
// second Telegram component.
//
// WHERE THE FETCH RUNS is the web-preview decision: at authoring time, on the machine
// that has the network. The result is data that ships beside the page. A post's
// pictures are served from Telegram's CDN under signed paths that do not live forever,
// so a consumer that keeps the facts keeps the files too (the URLs here are what to
// download, not what to ship).
//
// The text arrives as the embed's HTML, a small closed set of tags. Every tag the
// parser does not know is a THROW, never a silent drop: a post that lost its spoiler
// or its quote and still rendered is the bug this refuses to hide.

import type {
  ChatMessage,
  ChatProfile,
  ChatRun,
  ChatScript,
  Mark,
} from "@/registry/base-nova/ui/telegram-chat"

/** What t.me says about one public post: the facts, before they become a chat. */
export interface TelegramPost {
  /** https://t.me/<channel>/<id> */
  url: string
  channel: { name: string; handle: string; avatar?: string }
  /** ISO 8601, as Telegram stamps it (UTC). */
  date: string
  edited: boolean
  /** As the client prints it: "59", "1.2K". */
  views?: string
  photos: { src: string; width: number; height: number }[]
  body: ChatRun[]
  /** The webpage preview under a link in the text. */
  preview?: {
    url: string
    site: string
    title: string
    description?: string
    image?: string
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}
function decode(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    const v = ENTITIES[code.toLowerCase()]
    if (v === undefined) throw new Error(`telegram-chat-post: entity ${m}`)
    return v
  })
}

const MARK_OF: Record<string, Mark> = {
  b: "bold",
  strong: "bold",
  i: "italic",
  em: "italic",
  u: "underline",
  ins: "underline",
  s: "strike",
  strike: "strike",
  del: "strike",
  code: "code",
  "tg-spoiler": "spoiler",
}

/** The embed's message HTML as runs. Line breaks are `\n` inside the text; a `<pre>`
 *  is its own run, with the language when the post named one. */
export function parseTelegramText(html: string): ChatRun[] {
  // A custom emoji is its fallback glyph wrapped twice (`<tg-emoji><i class="emoji"
  // style=…><b>💡</b></i></tg-emoji>`); the <b> there is the widget's, not the author's.
  const flat = html
    .replace(/<i class="emoji"[^>]*><b>([^<]*)<\/b><\/i>/g, "$1")
    .replace(/<\/?tg-emoji[^>]*>/g, "")
  const runs: ChatRun[] = []
  const marks: Mark[] = []
  const open: { tag: string; mark: Mark }[] = []
  const hrefs: string[] = []
  let pre: { text: string; lang?: string } | null = null
  // A code block is a block: it ends the line before it and the one after it, so the
  // `\n` the author typed on each side is already drawn by the block itself.
  let afterBlock = false
  const push = (input: string) => {
    if (pre) {
      pre.text += input
      return
    }
    const text = afterBlock ? input.replace(/^\n/, "") : input
    afterBlock = false
    if (!text) return
    const href = hrefs.at(-1)
    const last = runs.at(-1)
    const same =
      last &&
      "text" in last &&
      last.href === href &&
      (last.marks ?? []).join() === marks.join()
    if (same) last.text += text
    else
      runs.push({
        text,
        ...(marks.length ? { marks: [...marks] } : {}),
        ...(href ? { href } : {}),
      })
  }
  const TOKEN = /<(\/?)([a-z][a-z0-9-]*)([^>]*?)\/?>|([^<]+)/gi
  for (const m of flat.matchAll(TOKEN)) {
    const [, close, rawTag, attrs, text] = m
    if (text !== undefined) {
      push(decode(text))
      continue
    }
    const tag = (rawTag as string).toLowerCase()
    if (tag === "br") {
      push("\n")
      continue
    }
    if (tag === "pre") {
      if (close) {
        const block = pre as { text: string; lang?: string }
        // The widget opens and closes a block with a <br/> of its own.
        runs.push({
          pre: block.text.replace(/^\n/, "").replace(/\n$/, ""),
          ...(block.lang ? { lang: block.lang } : {}),
        })
        pre = null
        afterBlock = true
      } else {
        const last = runs.at(-1)
        if (last && "text" in last) {
          last.text = last.text.replace(/\n$/, "")
          if (!last.text) runs.pop()
        }
        pre = { text: "" }
      }
      continue
    }
    if (pre && tag === "code") {
      const lang = /class="language-([^"]+)"/.exec(attrs as string)?.[1]
      if (!close && lang) pre.lang = lang
      continue
    }
    if (tag === "a") {
      if (close) hrefs.pop()
      else {
        const href = /href="([^"]*)"/.exec(attrs as string)?.[1]
        if (!href) throw new Error(`telegram-chat-post: <a> without href`)
        hrefs.push(decode(href))
      }
      continue
    }
    // A closing tag says only its name (`</span>`), so it closes what that name opened.
    if (close) {
      const top = open.pop()
      if (top?.tag !== tag)
        throw new Error(`telegram-chat-post: </${tag}> closes <${top?.tag}>`)
      marks.splice(marks.lastIndexOf(top.mark), 1)
      continue
    }
    const mark =
      tag === "span" && /class="tg-spoiler"/.test(attrs as string)
        ? "spoiler"
        : MARK_OF[tag]
    if (!mark)
      throw new Error(
        `telegram-chat-post: <${tag}> in a post's text is not drawn yet`,
      )
    open.push({ tag, mark })
    marks.push(mark)
  }
  if (pre) throw new Error("telegram-chat-post: unclosed <pre>")
  if (marks.length) throw new Error(`telegram-chat-post: unclosed ${marks}`)
  return runs
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

async function page(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA } })
  if (!res.ok) throw new Error(`telegram-chat-post ${url}: HTTP ${res.status}`)
  return res.text()
}

function one(html: string, re: RegExp, what: string): string {
  const v = re.exec(html)?.[1]
  if (v === undefined) throw new Error(`telegram-chat-post: no ${what}`)
  return v
}

/** Fetch a public channel post (`https://t.me/<channel>/<id>`) and read its facts.
 *  THROWS on anything it would otherwise draw wrong: a private or deleted post, a
 *  video, a poll, a tag it does not know. */
export async function fetchTelegramPost(url: string): Promise<TelegramPost> {
  const m = /^https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]{4,})\/(\d+)\/?$/.exec(url)
  if (!m) throw new Error(`telegram-chat-post: not a channel post url: ${url}`)
  const [, handle, id] = m as unknown as [string, string, string]
  const canonical = `https://t.me/${handle}/${id}`
  const html = await page(`${canonical}?embed=1&mode=tme`)
  if (!html.includes("tgme_widget_message_bubble"))
    throw new Error(`telegram-chat-post ${canonical}: no public post here`)
  for (const unsupported of [
    "tgme_widget_message_video",
    "tgme_widget_message_roundvideo",
    "tgme_widget_message_poll",
    "tgme_widget_message_document",
    "tgme_widget_message_voice",
    "tgme_widget_message_sticker",
  ])
    if (html.includes(unsupported))
      throw new Error(
        `telegram-chat-post ${canonical}: ${unsupported.replace("tgme_widget_message_", "")} posts are not drawn yet`,
      )

  const textOpen = /<div class="tgme_widget_message_text[^"]*"[^>]*>/.exec(html)
  let body: ChatRun[] = []
  if (textOpen) {
    const start = textOpen.index + textOpen[0].length
    const end = html.indexOf("</div>", start)
    const inner = html.slice(start, end)
    if (inner.includes("<div"))
      throw new Error(`telegram-chat-post ${canonical}: nested block in text`)
    body = parseTelegramText(inner)
  }

  const photos = [
    ...html.matchAll(
      /tgme_widget_message_photo_wrap[^"]*"[^>]*style="width:(\d+)px;background-image:url\('([^']+)'\)"[\s\S]*?padding-top:([\d.]+)%/g,
    ),
  ].map(([, w, src, pad]) => {
    const width = Number(w)
    return {
      src: src as string,
      width,
      height: Math.round((width * Number(pad)) / 100),
    }
  })

  const lp = /<a class="tgme_widget_message_link_preview" href="([^"]+)"/.exec(
    html,
  )
  const preview = lp
    ? {
        url: decode(lp[1] as string),
        site: decode(
          one(html, /link_preview_site_name[^>]*>([^<]*)</, "preview site"),
        ),
        title: decode(
          one(html, /link_preview_title[^>]*>([^<]*)</, "preview title"),
        ),
        description: (() => {
          const d = /link_preview_description[^>]*>([\s\S]*?)<\/div>/.exec(
            html,
          )?.[1]
          return d
            ? decode(d.replace(/<br\/?>/g, "\n").replace(/<[^>]+>/g, ""))
            : undefined
        })(),
        image:
          /link_preview_(?:right_)?image[^>]*background-image:url\('([^']+)'\)/.exec(
            html,
          )?.[1],
      }
    : undefined

  // The embed carries no channel picture; the channel's own page does, as og:image.
  const channelPage = await page(`https://t.me/${handle}`)
  const avatar = /<meta property="og:image" content="([^"]+)"/.exec(
    channelPage,
  )?.[1]

  const views = /tgme_widget_message_views">([^<]+)</.exec(html)?.[1]
  return {
    url: canonical,
    channel: {
      name: decode(
        one(
          html,
          /tgme_widget_message_owner_name"[^>]*><span dir="auto">([^<]*)</,
          "channel name",
        ),
      ),
      handle: `@${handle}`,
      // A channel with no picture serves Telegram's logo as og:image.
      ...(avatar && !avatar.includes("telegram.org/img/") ? { avatar } : {}),
    },
    date: one(html, /<time datetime="([^"]+)"/, "date"),
    edited: /tgme_widget_message_meta">\s*edited/.test(html),
    ...(views ? { views } : {}),
    photos,
    body,
    ...(preview ? { preview } : {}),
  }
}

const DATE = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

/** The post as a chat of one message from its channel: what `<TelegramChat
 *  frame="none" frozen />` draws. */
export function postScript(post: TelegramPost): ChatScript {
  if (post.photos.length > 1)
    throw new Error(
      `telegram-chat-post ${post.url}: albums are not drawn yet (${post.photos.length} photos)`,
    )
  const channel: ChatProfile = post.channel
  const message: ChatMessage = {
    from: channel,
    ...(post.body.length ? { rich: post.body } : {}),
    ...(post.photos[0] ? { photo: post.photos[0] } : {}),
    ...(post.preview
      ? {
          source: post.preview.url,
          preview: {
            site: post.preview.site,
            title: post.preview.title,
            ...(post.preview.description
              ? { description: post.preview.description }
              : {}),
            ...(post.preview.image ? { image: post.preview.image } : {}),
          },
        }
      : {}),
    foot: {
      time: DATE.format(new Date(post.date)),
      href: post.url,
      ...(post.views ? { views: post.views } : {}),
      ...(post.edited ? { edited: true } : {}),
    },
  }
  return {
    kind: "channel",
    chatName: channel,
    messages: [message],
    alt: `A post in ${post.channel.name} on Telegram`,
  }
}
