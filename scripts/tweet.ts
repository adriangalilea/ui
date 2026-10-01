// `mise tweet <url>`: a post's facts as JSON, to keep beside the page. The one place a
// post touches the network: authoring time, on this machine.
import { fetchTweet } from "../registry/base-nova/lib/tweet-data"

const url = process.argv[2]
if (!url) {
  console.error("usage: mise tweet https://x.com/<user>/status/<id>")
  process.exit(2)
}
console.log(JSON.stringify(await fetchTweet(url), null, 2))
