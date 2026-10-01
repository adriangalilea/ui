import { Sample } from "@/app/samples"
import type { Tweet as TweetFacts } from "@/registry/base-nova/lib/tweet-data"
import { Tweet } from "@/registry/base-nova/ui/tweet"

// #region posts
/** Posts as data, pasted from `mise tweet <url>`. Nothing here fetched. */
const PHOTOS: TweetFacts = {
  id: "2101560333441610133",
  url: "https://x.com/Mappletons/status/2101560333441610133",
  author: {
    name: "Maggie Appleton",
    handle: "@Mappletons",
    avatar:
      "https://pbs.twimg.com/profile_images/1635665509512355840/-jFo36KR_200x200.jpg",
  },
  date: "2026-09-20T06:33:23.000Z",
  body: [
    {
      text: 'Can we agree to call Jev a "Decision Model"?\nI feel like they buried this in the explainations and docs.\nLanguage models output language. Decision models output decisions.',
    },
  ],
  media: [
    {
      kind: "photo",
      src: "https://pbs.twimg.com/media/HSo9u6-XUAA8PhA.jpg",
      width: 1638,
      height: 638,
    },
    {
      kind: "photo",
      src: "https://pbs.twimg.com/media/HSo9z9FW8AAj0zC.jpg",
      width: 1632,
      height: 428,
    },
  ],
  likes: 304,
  replies: 48,
}
const QUOTE: TweetFacts = {
  id: "2104646956551422036",
  url: "https://x.com/rocketalignment/status/2104646956551422036",
  author: {
    name: "🚀 Rocket",
    handle: "@rocketalignment",
    avatar:
      "https://pbs.twimg.com/profile_images/1980865852460158976/RoeuxAGX_200x200.jpg",
  },
  date: "2026-09-28T18:58:31.000Z",
  body: [
    {
      text: "Some people on Reddit are speculating that this account is fake but OpenAI confirmed to me that Joe does work there in the capacity he claims",
    },
  ],
  media: [],
  quote: {
    id: "2104335929293127851",
    url: "https://x.com/joedaroo/status/2104335929293127851",
    author: {
      name: "Joe",
      handle: "@joedaroo",
      avatar:
        "https://pbs.twimg.com/profile_images/2097167182526611457/UJBigEfF_200x200.jpg",
      verified: "blue",
    },
    date: "2026-09-27T22:22:36.000Z",
    body: [
      {
        text: "Took a minute to write a few words about security & safety as someone who lived through it all at OpenAI. I hope my thoughts help someone out there.",
      },
    ],
    media: [],
    card: {
      url: "https://x.com/i/article/2104258872957636608",
      site: "X",
      title: "Its not just the f*cking sandbox",
      description:
        "A lot of the perspective on all the AI incidents has been shared from the outside in, and little has been said from the inside looking out, through the lens of a security person living through it.",
      image: "https://pbs.twimg.com/media/HTQTvrnbYAAVg_-.jpg",
    },
    likes: 2849,
    replies: 440,
  },
  likes: 57,
  replies: 3,
}
const VIDEO: TweetFacts = {
  id: "2104674987164782598",
  url: "https://x.com/claudeai/status/2104674987164782598",
  author: {
    name: "Claude",
    handle: "@claudeai",
    avatar:
      "https://pbs.twimg.com/profile_images/1950950107937185792/QOfEjFoJ_200x200.jpg",
    verified: "blue",
  },
  date: "2026-09-28T20:49:54.000Z",
  body: [
    {
      text: "A thread of early experiments with Claude Sonnet 5.5.\n\nA fall foliage simulator by ",
    },
    { text: "@_re_pete", href: "https://x.com/_re_pete" },
    { text: ", made with Sonnet 5 vs Sonnet 5.5." },
  ],
  media: [
    {
      kind: "video",
      src: "https://video.twimg.com/amplify_video/2104672427187793920/vid/avc1/720x720/di5rQh2OGhgj0guK.mp4",
      poster:
        "https://pbs.twimg.com/amplify_video_thumb/2104672427187793920/img/in4Hl4l6NzD9hpWU.jpg",
      width: 1080,
      height: 1080,
    },
  ],
  likes: 7888,
  replies: 255,
}
// #endregion

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="photos"
        with="posts"
        label="01 · a post with pictures · two side by side in X's 16:9 frame, the text at reading size"
      >
        <Tweet tweet={PHOTOS} className="mx-auto max-w-xl" />
      </Sample>

      <Sample
        name="quote"
        label="02 · a quote · the quoted post drawn small inside, its X article as web-preview's x card"
      >
        <Tweet tweet={QUOTE} className="mx-auto max-w-xl" />
      </Sample>

      <Sample
        name="video"
        label="03 · a video · the richest mp4 under the embed's budget, its poster until played; a verified badge, a mention"
      >
        <Tweet tweet={VIDEO} className="mx-auto max-w-xl" />
      </Sample>

      <p className="max-w-prose text-foreground/60 text-sm">
        Every post is a pure function of its facts. Fetching them is{" "}
        <code>tweet-data</code>&apos;s job, from the endpoint X&apos;s own embed
        reads, once, at authoring time: no widget script and no request when the
        page renders.
      </p>
    </div>
  )
}
