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

/** The chapters with their ends; a clip without chapters is one whole span. */
export function spans(clip: Clip): (Chapter & { end: number })[] {
  const list = clip.chapters.length ? clip.chapters : [{ start: 0, title: "" }]
  return list.map((c, i) => ({
    ...c,
    end: list[i + 1]?.start ?? clip.duration,
  }))
}
