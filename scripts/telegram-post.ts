// `mise telegram-post <url>`: a public channel post's facts as JSON, to keep beside the
// page. The one place a post touches the network: authoring time, on this machine. The
// picture URLs are Telegram's signed CDN paths; download them before shipping.
import { fetchTelegramPost } from "../registry/base-nova/lib/telegram-chat-post"

const url = process.argv[2]
if (!url) {
  console.error("usage: mise telegram-post https://t.me/<channel>/<id>")
  process.exit(2)
}
console.log(JSON.stringify(await fetchTelegramPost(url), null, 2))
