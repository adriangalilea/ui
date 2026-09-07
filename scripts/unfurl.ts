// `mise unfurl <url>`: the five facts of a link, as JSON, to paste beside the link in a
// script or a demo. The one place the network is touched for a preview: authoring time,
// on this machine. Fails loud on a page with no title.
import { unfurl } from "../registry/base-nova/lib/web-preview-unfurl"

const url = process.argv[2]
if (!url) {
  console.error("usage: mise unfurl <url>")
  process.exit(2)
}
console.log(JSON.stringify(await unfurl(url), null, 2))
