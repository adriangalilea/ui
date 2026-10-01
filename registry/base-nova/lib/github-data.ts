// GITHUB, as data: a repository, an issue or a pull request, one comment on either,
// a profile with its contribution calendar. The facts `github` draws, and the one
// fetch that reads them.
//
// WHERE THE FETCH RUNS is the web-preview decision: at authoring time, with the
// author's own token (`gh auth token`), once. The facts ship beside the page; a deploy
// never asks GitHub anything and never carries a token. GraphQL for everything it can
// name; a single comment comes from REST, since GraphQL cannot find one by its id.
//
// One URL says which: `github.com/o` a profile, `/o/r` a repository, `/o/r/issues/n`
// and `/o/r/pull/n` the thread, `#issuecomment-id` one comment in it. Anything else is
// a THROW, never a guess.

export interface GithubUser {
  login: string
  avatar: string
  url: string
}

export interface GithubLabel {
  name: string
  /** Hex without `#`, as GitHub stores it. */
  color: string
}

export interface GithubRepo {
  kind: "repo"
  url: string
  /** "vercel/ai" */
  name: string
  owner: GithubUser
  description?: string
  homepage?: string
  stars: number
  forks: number
  language?: { name: string; color: string }
  topics: string[]
  license?: string
  archived: boolean
  /** ISO 8601 */
  pushedAt: string
}

/** Where a thread stands, in GitHub's own words: an issue closes as done or as not
 *  planned, a pull request merges or closes unmerged, and either may be a draft. */
export type GithubState =
  | "open"
  | "draft"
  | "completed"
  | "not-planned"
  | "merged"
  | "closed"

export interface GithubThread {
  kind: "issue" | "pr"
  url: string
  repo: string
  number: number
  title: string
  state: GithubState
  author: GithubUser
  createdAt: string
  /** When it closed or merged. */
  closedAt?: string
  /** GitHub's own rendering of the opening post, sanitized by GitHub. */
  bodyHtml: string
  comments: number
  labels: GithubLabel[]
  /** Pull requests: the size of the change and where it goes. */
  diff?: { additions: number; deletions: number; files: number }
  branches?: { base: string; head: string }
}

export interface GithubComment {
  kind: "comment"
  url: string
  author: GithubUser
  createdAt: string
  /** GitHub's own rendering of the comment, sanitized by GitHub. */
  bodyHtml: string
  /** The thread it answers, without its own body. */
  thread: Omit<GithubThread, "bodyHtml">
}

export interface GithubDay {
  date: string
  count: number
  /** GitHub's quartile, 0 (none) to 4. */
  level: 0 | 1 | 2 | 3 | 4
}

export interface GithubProfile {
  kind: "profile"
  url: string
  user: GithubUser
  name?: string
  bio?: string
  company?: string
  location?: string
  website?: string
  followers: number
  following: number
  repos: number
  /** The last year, by week (Sunday first), as GitHub draws it. */
  calendar: { total: number; weeks: GithubDay[][] }
}

export type GithubFacts =
  | GithubRepo
  | GithubThread
  | GithubComment
  | GithubProfile

export type GithubTarget =
  | { kind: "profile"; login: string }
  | { kind: "repo"; owner: string; name: string }
  | { kind: "thread"; owner: string; name: string; number: number }
  | {
      kind: "comment"
      owner: string
      name: string
      number: number
      id: number
    }

/** What a github.com URL points at. THROWS on any other shape. */
export function githubTarget(url: string): GithubTarget {
  const u = new URL(url)
  if (u.hostname !== "github.com")
    throw new Error(`github: not github.com: ${url}`)
  const parts = u.pathname.split("/").filter(Boolean)
  const comment = /^#issuecomment-(\d+)$/.exec(u.hash)?.[1]
  const [owner, name, section, n] = parts
  if (parts.length === 1 && owner) return { kind: "profile", login: owner }
  if (parts.length === 2 && owner && name) return { kind: "repo", owner, name }
  if (
    parts.length === 4 &&
    owner &&
    name &&
    (section === "issues" || section === "pull") &&
    n &&
    /^\d+$/.test(n)
  ) {
    const number = Number(n)
    return comment
      ? { kind: "comment", owner, name, number, id: Number(comment) }
      : { kind: "thread", owner, name, number }
  }
  throw new Error(`github: not a profile, repo, issue, pull or comment: ${url}`)
}

async function graphql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`github graphql: HTTP ${res.status}`)
  const json = (await res.json()) as {
    data?: T
    errors?: { message: string }[]
  }
  if (json.errors?.length)
    throw new Error(
      `github graphql: ${json.errors.map((e) => e.message).join("; ")}`,
    )
  if (!json.data) throw new Error("github graphql: no data")
  return json.data
}

// `s=` asks the avatar service for the size a card draws at 2x.
const avatar = (url: string) => `${url}${url.includes("?") ? "&" : "?"}s=96`

const user = (
  u: { login: string; avatarUrl: string; url: string } | null,
): GithubUser =>
  u
    ? { login: u.login, avatar: avatar(u.avatarUrl), url: u.url }
    : // A deleted account is GitHub's "ghost".
      {
        login: "ghost",
        avatar: "https://avatars.githubusercontent.com/u/10137?s=96",
        url: "https://github.com/ghost",
      }

const USER = "login avatarUrl url"

async function repo(
  token: string,
  owner: string,
  name: string,
): Promise<GithubRepo> {
  type R = {
    repository: {
      nameWithOwner: string
      url: string
      description: string | null
      homepageUrl: string | null
      stargazerCount: number
      forkCount: number
      isArchived: boolean
      pushedAt: string
      licenseInfo: { spdxId: string } | null
      primaryLanguage: { name: string; color: string | null } | null
      repositoryTopics: { nodes: { topic: { name: string } }[] }
      owner: { login: string; avatarUrl: string; url: string }
    } | null
  }
  const { repository: r } = await graphql<R>(
    token,
    `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){
      nameWithOwner url description homepageUrl stargazerCount forkCount isArchived pushedAt
      licenseInfo{spdxId} primaryLanguage{name color}
      repositoryTopics(first:8){nodes{topic{name}}} owner{${USER}}}}`,
    { owner, name },
  )
  if (!r) throw new Error(`github: no repository ${owner}/${name}`)
  return {
    kind: "repo",
    url: r.url,
    name: r.nameWithOwner,
    owner: user(r.owner),
    ...(r.description ? { description: r.description } : {}),
    ...(r.homepageUrl ? { homepage: r.homepageUrl } : {}),
    stars: r.stargazerCount,
    forks: r.forkCount,
    ...(r.primaryLanguage
      ? {
          language: {
            name: r.primaryLanguage.name,
            color: r.primaryLanguage.color ?? "#8b949e",
          },
        }
      : {}),
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    ...(r.licenseInfo && r.licenseInfo.spdxId !== "NOASSERTION"
      ? { license: r.licenseInfo.spdxId }
      : {}),
    archived: r.isArchived,
    pushedAt: r.pushedAt,
  }
}

async function thread(
  token: string,
  owner: string,
  name: string,
  number: number,
): Promise<GithubThread> {
  type T = {
    repository: {
      nameWithOwner: string
      issueOrPullRequest:
        | ({
            __typename: "Issue" | "PullRequest"
            number: number
            title: string
            url: string
            state: "OPEN" | "CLOSED" | "MERGED"
            createdAt: string
            closedAt: string | null
            author: { login: string; avatarUrl: string; url: string } | null
            bodyHTML: string
            comments: { totalCount: number }
            labels: { nodes: GithubLabel[] } | null
          } & {
            stateReason?: "COMPLETED" | "NOT_PLANNED" | "REOPENED" | null
            isDraft?: boolean
            mergedAt?: string | null
            additions?: number
            deletions?: number
            changedFiles?: number
            baseRefName?: string
            headRefName?: string
          })
        | null
    } | null
  }
  const shared = `number title url state createdAt closedAt author{${USER}} bodyHTML
    comments{totalCount} labels(first:8){nodes{name color}}`
  const { repository } = await graphql<T>(
    token,
    `query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){
      nameWithOwner issueOrPullRequest(number:$n){__typename
        ... on Issue{${shared} stateReason}
        ... on PullRequest{${shared} isDraft mergedAt additions deletions changedFiles baseRefName headRefName}}}}`,
    { owner, name, n: number },
  )
  const t = repository?.issueOrPullRequest
  if (!repository || !t)
    throw new Error(`github: no #${number} in ${owner}/${name}`)
  const pr = t.__typename === "PullRequest"
  const state: GithubState = pr
    ? t.state === "MERGED"
      ? "merged"
      : t.state === "CLOSED"
        ? "closed"
        : t.isDraft
          ? "draft"
          : "open"
    : t.state === "OPEN"
      ? "open"
      : t.stateReason === "NOT_PLANNED"
        ? "not-planned"
        : "completed"
  const closedAt = (pr ? (t.mergedAt ?? t.closedAt) : t.closedAt) ?? undefined
  return {
    kind: pr ? "pr" : "issue",
    url: t.url,
    repo: repository.nameWithOwner,
    number: t.number,
    title: t.title,
    state,
    author: user(t.author),
    createdAt: t.createdAt,
    ...(closedAt ? { closedAt } : {}),
    bodyHtml: t.bodyHTML,
    comments: t.comments.totalCount,
    labels: t.labels?.nodes ?? [],
    ...(pr
      ? {
          diff: {
            additions: t.additions ?? 0,
            deletions: t.deletions ?? 0,
            files: t.changedFiles ?? 0,
          },
          branches: { base: t.baseRefName ?? "", head: t.headRefName ?? "" },
        }
      : {}),
  }
}

async function comment(
  token: string,
  target: Extract<GithubTarget, { kind: "comment" }>,
): Promise<GithubComment> {
  const res = await fetch(
    `https://api.github.com/repos/${target.owner}/${target.name}/issues/comments/${target.id}`,
    {
      headers: {
        authorization: `bearer ${token}`,
        // GitHub's own rendering of the markdown, sanitized by GitHub.
        accept: "application/vnd.github.html+json",
      },
    },
  )
  if (!res.ok)
    throw new Error(`github: comment ${target.id}: HTTP ${res.status}`)
  const c = (await res.json()) as {
    html_url: string
    created_at: string
    body_html: string
    user: { login: string; avatar_url: string; html_url: string } | null
  }
  const { bodyHtml: _, ...parent } = await thread(
    token,
    target.owner,
    target.name,
    target.number,
  )
  return {
    kind: "comment",
    url: c.html_url,
    author: user(
      c.user
        ? {
            login: c.user.login,
            avatarUrl: c.user.avatar_url,
            url: c.user.html_url,
          }
        : null,
    ),
    createdAt: c.created_at,
    bodyHtml: c.body_html,
    thread: parent,
  }
}

const LEVEL: Record<string, GithubDay["level"]> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

async function profile(token: string, login: string): Promise<GithubProfile> {
  type P = {
    user: {
      login: string
      avatarUrl: string
      url: string
      name: string | null
      bio: string | null
      company: string | null
      location: string | null
      websiteUrl: string | null
      followers: { totalCount: number }
      following: { totalCount: number }
      repositories: { totalCount: number }
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: {
            contributionDays: {
              date: string
              contributionCount: number
              contributionLevel: string
            }[]
          }[]
        }
      }
    } | null
  }
  const { user: p } = await graphql<P>(
    token,
    `query($login:String!){user(login:$login){${USER} name bio company location websiteUrl
      followers{totalCount} following{totalCount}
      repositories(ownerAffiliations:OWNER,privacy:PUBLIC){totalCount}
      contributionsCollection{contributionCalendar{totalContributions
        weeks{contributionDays{date contributionCount contributionLevel}}}}}}`,
    { login },
  )
  if (!p) throw new Error(`github: no user ${login}`)
  const cal = p.contributionsCollection.contributionCalendar
  return {
    kind: "profile",
    url: p.url,
    user: user(p),
    ...(p.name ? { name: p.name } : {}),
    ...(p.bio ? { bio: p.bio } : {}),
    ...(p.company ? { company: p.company } : {}),
    ...(p.location ? { location: p.location } : {}),
    ...(p.websiteUrl ? { website: p.websiteUrl } : {}),
    followers: p.followers.totalCount,
    following: p.following.totalCount,
    repos: p.repositories.totalCount,
    calendar: {
      total: cal.totalContributions,
      weeks: cal.weeks.map((w) =>
        w.contributionDays.map((d) => {
          const level = LEVEL[d.contributionLevel]
          if (level === undefined)
            throw new Error(`github: contribution level ${d.contributionLevel}`)
          return { date: d.date, count: d.contributionCount, level }
        }),
      ),
    },
  }
}

/** Fetch what a github.com URL points at, with the author's token. */
export async function fetchGithub(
  url: string,
  token: string,
): Promise<GithubFacts> {
  if (!token) throw new Error("github: a token is required (gh auth token)")
  const t = githubTarget(url)
  if (t.kind === "profile") return profile(token, t.login)
  if (t.kind === "repo") return repo(token, t.owner, t.name)
  if (t.kind === "thread") return thread(token, t.owner, t.name, t.number)
  return comment(token, t)
}
