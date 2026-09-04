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

export default function Demo() {
  return (
    <div className="flex justify-center gap-10">
      <TelegramChat script={SCRIPT} wallpaper="/tg-pattern.svg" theme="dark" />
      <TelegramChat
        script={SCRIPT}
        wallpaper="/tg-pattern.svg"
        theme="light"
        className="max-lg:hidden"
      />
    </div>
  )
}
