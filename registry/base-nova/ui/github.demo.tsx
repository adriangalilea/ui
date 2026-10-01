import { Sample } from "@/app/samples"
import type {
  GithubComment,
  GithubProfile,
  GithubRepo,
  GithubThread,
} from "@/registry/base-nova/lib/github-data"
import { Github } from "@/registry/base-nova/ui/github"
// #region facts
/** Facts as data, written by `mise github <url>` for five real URLs. Nothing here
 *  fetched; the calendar alone is a year of days, so it lives in a file. */
import FACTS from "./github.demo.json"

const ISSUE = FACTS.issue as GithubThread
const COMMENT = FACTS.comment as GithubComment
const LONG = FACTS.long as GithubComment
const PR = FACTS.pr as GithubThread
const REPO = FACTS.repo as GithubRepo
const PROFILE = FACTS.profile as GithubProfile
// #endregion

export default function Demo() {
  return (
    <div className="space-y-16">
      <Sample
        name="comment"
        with="facts"
        label="01 · a comment · one reply in its thread, the thread on a line above it, GitHub's own rendering of the markdown"
      >
        <Github facts={COMMENT} className="mx-auto max-w-2xl" />
      </Sample>

      <Sample
        name="cut"
        label="02 · a long comment, cut · lines={14}: the body stops at fourteen of its own lines, fades, and the rest is a link away"
      >
        <Github facts={LONG} lines={14} className="mx-auto max-w-2xl" />
      </Sample>

      <Sample
        name="threads"
        label="03 · an issue and a pull request · state in GitHub's colours, labels in their own, the size of the change"
      >
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <Github facts={ISSUE} />
          <Github facts={PR} />
        </div>
      </Sample>

      <Sample
        name="repo"
        label="04 · a repository · the pinned card: description, language, stars, forks"
      >
        <Github facts={REPO} className="mx-auto max-w-md" />
      </Sample>

      <Sample
        name="profile"
        label="05 · a profile · the person and the last year of contributions; hover a day for its count"
      >
        <Github facts={PROFILE} className="mx-auto max-w-3xl" />
      </Sample>

      <p className="max-w-prose text-foreground/60 text-sm">
        Every card is a pure function of its facts and opens its place on
        GitHub. Fetching them is <code>github-data</code>&apos;s job, once, with
        the author&apos;s own token: no API and no token on the page.
      </p>
    </div>
  )
}
