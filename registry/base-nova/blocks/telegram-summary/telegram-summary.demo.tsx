import {
  TelegramSummary,
  type TelegramSummaryScript,
} from "@/registry/base-nova/blocks/telegram-summary/telegram-summary"

const SCRIPT: TelegramSummaryScript = {
  kind: "peer",
  chatName: "Adrian",
  chatTag: "online",
  intro: "you have to read this",
  link: "paulgraham.com/ds.html",
  preview: {
    site: "paulgraham.com",
    title: "Do Things that Don't Scale",
    description:
      "One of the most common types of advice we give at Y Combinator is to do things that don't scale.",
  },
  mention: "@xtldrbot",
  summary: {
    via: "via @xtldrbot",
    sections: [
      {
        emoji: "🌱",
        heading: "Recruit users by hand",
        items: [
          "Startups take off because founders make them",
          "Stripe installed itself on users' laptops",
        ],
      },
      {
        emoji: "🔥",
        heading: "Delight, deliberately",
        items: [
          { text: "Over-engage with early users; it compounds", cite: "¶12" },
        ],
      },
    ],
    quote: {
      text: "The most common unscalable thing founders have to do at the start is to recruit users manually.",
      by: "Paul Graham",
    },
    linkLabel: "🔗 paulgraham.com",
    time: "⏱ 14 min read",
    reactions: [{ emoji: "❤️", count: 1 }],
  },
  alt: "A private chat: a friend sends an essay, the bot summarizes it inline.",
}

export default function Demo() {
  return (
    <div className="flex justify-center">
      <TelegramSummary
        script={SCRIPT}
        from="conversation"
        wallpaper="/tg-pattern.svg"
        theme="dark"
      />
    </div>
  )
}
