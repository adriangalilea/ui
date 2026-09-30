// A person, as every surface that shows one needs them: a chat's contact, a Mac's
// lock-screen account. Defined once by the page and handed to each component, so the
// same person wears the same name and picture everywhere. A surface with more to say
// about someone extends this (telegram-chat's `ChatProfile` adds `bot`).
// Framework-free.

export interface Person {
  /** The display name. */
  name: string
  /** "@adriangalilea": what a mention types and a sub-line shows. */
  handle?: string
  /** The picture's URL. Absent, a surface draws its own placeholder. */
  avatar?: string
  /** An animated picture (mp4) that loops muted over `avatar`, where a surface
   *  animates one. */
  avatarVideo?: string
}
