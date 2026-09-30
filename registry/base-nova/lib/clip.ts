// A clip: anything drawn from a moment, told as the facts a driver moves through
// it by: how long it runs and where its chapters start. The content's own lib makes
// its clip (macos-session's scene clock, terminal-session's session timeline); a
// driver moves through it (the player by the clock, a scroll stage by scroll, a
// still by one fixed moment); the component draws the frame at a progress. One
// contract, so any content plays in any driver. Framework-free.

/** A chapter: where it starts (ms) and its title. It runs to the next chapter's
 *  start, the last to the end. */
export interface Chapter {
  start: number
  title: string
  /** The title is code, as typed (a terminal's command): drawn in mono. */
  code?: boolean
}

export interface Clip {
  /** ms */
  duration: number
  chapters: Chapter[]
}

/** A moment of the clip (ms) as the 0..1 progress its component draws. */
export function progressAt(clip: Clip, ms: number): number {
  return Math.min(1, Math.max(0, ms / clip.duration))
}

/** A stretch of the clip, ms: what a scroll stage's act cues (ui/playhead `Cue`). */
export interface Span {
  from: number
  to: number
}

/** Chapters `first` through `last` as one span: from the first's start to the last's
 *  end. An act that tells messages 4 and 5 of a chat is `chapterSpan(clip, 4, 5)`. */
export function chapterSpan(clip: Clip, first: number, last = first): Span {
  const all = spans(clip)
  const a = all[first]
  const b = all[last]
  if (!a || !b || last < first)
    throw new Error(
      `chapterSpan: chapters ${first}..${last} outside 0..${all.length - 1}`,
    )
  return { from: a.start, to: b.end }
}

/** A local 0..1 across a span, as the progress of the whole clip: a scrubbed card
 *  that tells only part of its clip. */
export function progressWithin(clip: Clip, span: Span, local: number): number {
  const t = Math.min(1, Math.max(0, local))
  return progressAt(clip, span.from + (span.to - span.from) * t)
}

/** The chapters with their ends; a clip without chapters is one whole span. */
export function spans(clip: Clip): (Chapter & { end: number })[] {
  const list = clip.chapters.length ? clip.chapters : [{ start: 0, title: "" }]
  return list.map((c, i) => ({
    ...c,
    end: list[i + 1]?.start ?? clip.duration,
  }))
}
