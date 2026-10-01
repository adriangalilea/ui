// `mise github <url>`: what a github.com URL points at (profile, repo, issue, pull,
// comment) as JSON, to keep beside the page. The one place it touches GitHub: authoring
// time, with your own token (`gh auth token`), which never leaves this machine.
import { $ } from "bun"
import { fetchGithub } from "../registry/base-nova/lib/github-data"

const url = process.argv[2]
if (!url) {
  console.error(
    "usage: mise github https://github.com/<owner>[/<repo>[/issues|pull/<n>[#issuecomment-<id>]]]",
  )
  process.exit(2)
}
const token = (await $`gh auth token`.text()).trim()
console.log(JSON.stringify(await fetchGithub(url, token), null, 2))
