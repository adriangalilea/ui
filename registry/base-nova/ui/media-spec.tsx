// THE MEDIA FORMAT VOCABULARY, typed. What a copy of a film carries and how we know it:
// picture (resolution × dynamic range), sound (codec × object audio × channels), the
// source tier, the language, the cut. An app passes VALUES, never label strings, and
// the chip owns every mark, word and tone, the way a score chip knows what IMDb is. It
// knows nothing about ranking: which of two values is better is the caller's business
// (a daemon's ladder), and a chip renders one value honestly.
//
// ARTWORK FIRST. A chip is ONE MARK standing FRAMELESS: the artwork is the chip. Badge
// artwork (HDR10, HDR10+, the 4K / 8K / HD / SD badges) keeps its own box, a lockup
// keeps its shape, a symbol its glyph, and nothing draws a frame around any of them,
// so there is never a box in a box. A DRAWN badge (a rounded box with the word set in
// the surrounding sans, semibold, to the HDR10 badge's proportions) exists only for a
// value with no artwork anywhere: 720p, HLG, channels, Remux, WEB-DL, DTS:X, a codec
// named beside its object mark, AAC and the other plain codecs, castellano, latino, a
// language code, every cut but IMAX. Artwork badges and drawn badges read as one row.
//
// PROVENANCE sits ON the mark, never as a glyph: `claim` (a release name's promise) is
// ghosted; `verified` (the container states it) is full ink; `measured` (the pixels or
// the meter say so) is full ink over a soft wash pill; `delivered` (what this session
// on this screen actually gets) is the wash plus a ring, the loudest state. A reader
// learns nothing to read it: more presence, more certain.
//
// AN AXIS IS A GROUP of one to three chips: picture is [resolution] [range], sound is
// [object] [codec] [channels], tier is [disc] [Remux], lang is [flag] [castellano]. The
// per-axis components render the group, the `MediaSpec` strip sets the groups apart
// (tight within an axis, wider between), and a `delta` trails the axis's last chip.
//
// STYLE IS UTILITIES, consumer `className` last. The one computed value is the chip's
// ink: `--ag-media-ink` resolves `--ag-media-<kind>` and falls back to `currentColor`,
// so with nothing set every chip is monochrome in the surrounding text colour. That is
// the contract with a consumer on any palette, tokens or not. Custom properties a
// consumer MAY set:
//   --ag-media-picture / --ag-media-sound / --ag-media-tier / --ag-media-lang /
//   --ag-media-cut     the ink per kind (fallback: currentColor)
//   --ag-media-better / --ag-media-worse   the delta glyph inks (fallback: currentColor)
//   --ag-media-scrim   the ground under the poster rung's drawn badges (fallback:
//                      rgb(0 0 0 / .65))
// `tone` picks a mark's ink: "ink" (default) draws it like the words; "brand" draws it
// in the official hex, and only where that hex is a colour (a near-black brand such as
// Dolby stays ink: black on a dark surface is a missing logo, not a brand statement;
// `markFill` in media-spec-marks.tsx). Drawn badges never take a brand.
// Every chip carries data-slot="media-chip", data-kind (the AXIS: picture | sound |
// tier | lang | cut), data-facet (resolution | range | object | codec | channels | tier
// | edition | lang | cut), data-provenance, data-size, and data-mark when it is artwork,
// so a consumer styles Dolby Vision or Atmos from outside without a class name to know.
// The typed label stays the accessible name of the axis group whatever is drawn.

import { cn } from "@/lib/utils"
import {
  Mark,
  type MarkId,
  type MarkTone,
} from "@/registry/base-nova/ui/media-spec-marks"

// ── The vocabulary. Raw values are the wire spellings; a sibling Swift product pins
// the same literals, so a rename here is a rename there.

export const RESOLUTIONS = ["sd", "720p", "1080p", "2160p", "4320p"] as const
export type Resolution = (typeof RESOLUTIONS)[number]

export const RANGES = [
  "sdr",
  "hlg",
  "hdr10",
  "hdr10-plus",
  "dolby-vision",
] as const
export type DynamicRange = (typeof RANGES)[number]

export const AUDIO_CODECS = [
  "aac",
  "ac3",
  "eac3",
  "dts",
  "dts-hd-hra",
  "dts-hd-ma",
  "truehd",
  "flac",
  "pcm",
  "alac",
  "opus",
  "mp3",
  "mp2",
  "vorbis",
] as const
export type AudioCodec = (typeof AUDIO_CODECS)[number]

export const CHANNELS = ["1.0", "2.0", "5.1", "6.1", "7.1"] as const
export type Channels = (typeof CHANNELS)[number]

export const OBJECT_AUDIO = ["atmos", "dts-x"] as const
export type ObjectAudio = (typeof OBJECT_AUDIO)[number]

export const TIERS = [
  "remux",
  "bluray",
  "webdl",
  "webrip",
  "hdtv",
  "dvd",
  "cam",
] as const
export type Tier = (typeof TIERS)[number]

export const CUTS = [
  "theatrical",
  "extended",
  "directors",
  "unrated",
  "uncut",
  "final",
  "imax",
  "remastered",
] as const
/** A known cut, or any label the catalogue names (rendered verbatim). */
export type Cut = (typeof CUTS)[number] | (string & {})

export const PROVENANCES = [
  "claim",
  "verified",
  "measured",
  "delivered",
] as const
export type Provenance = (typeof PROVENANCES)[number]

export const DELTAS = ["better", "same", "worse"] as const
export type Delta = (typeof DELTAS)[number]

export const KINDS = ["picture", "sound", "tier", "lang", "cut"] as const
export type Kind = (typeof KINDS)[number]

export const FACETS = [
  "resolution",
  "range",
  "object",
  "codec",
  "channels",
  "tier",
  "edition",
  "lang",
  "cut",
] as const
export type Facet = (typeof FACETS)[number]

export type Size = "sm" | "md"
export type Tone = MarkTone

export interface Audio {
  codec: AudioCodec
  channels?: Channels
  object?: ObjectAudio
}

// ── Labels. Pure, exported: a consumer prints the same words in a title or a log.

const RESOLUTION_LABEL: Record<Resolution, string> = {
  sd: "SD",
  "720p": "720p",
  "1080p": "1080p",
  "2160p": "4K",
  "4320p": "8K",
}
const RANGE_LABEL: Record<DynamicRange, [long: string, short: string]> = {
  sdr: ["SDR", "SDR"],
  hlg: ["HLG", "HLG"],
  hdr10: ["HDR10", "HDR10"],
  "hdr10-plus": ["HDR10+", "HDR10+"],
  "dolby-vision": ["Dolby Vision", "DV"],
}
const CODEC_LABEL: Record<AudioCodec, string> = {
  aac: "AAC",
  ac3: "DD",
  eac3: "DD+",
  dts: "DTS",
  "dts-hd-hra": "DTS-HD HRA",
  "dts-hd-ma": "DTS-HD MA",
  truehd: "TrueHD",
  flac: "FLAC",
  pcm: "PCM",
  alac: "ALAC",
  opus: "Opus",
  mp3: "MP3",
  mp2: "MP2",
  vorbis: "Vorbis",
}
const OBJECT_LABEL: Record<ObjectAudio, string> = {
  atmos: "Atmos",
  "dts-x": "DTS:X",
}
const TIER_LABEL: Record<Tier, string> = {
  remux: "Remux",
  bluray: "Blu-ray",
  webdl: "WEB-DL",
  webrip: "WEBRip",
  hdtv: "HDTV",
  dvd: "DVD",
  cam: "CAM",
}
const CUT_LABEL: Record<(typeof CUTS)[number], string> = {
  theatrical: "theatrical",
  extended: "extended",
  directors: "director's cut",
  unrated: "unrated",
  uncut: "uncut",
  final: "final cut",
  imax: "IMAX",
  remastered: "remastered",
}
/** The house spellings for the two Spanishes; every other code is its own label. */
const LANG_LABEL: Record<string, string> = {
  "es-ES": "castellano",
  "es-419": "latino",
}

const LOSSLESS: ReadonlySet<AudioCodec> = new Set([
  "truehd",
  "dts-hd-ma",
  "flac",
  "pcm",
  "alac",
])

export function isLossless(codec: AudioCodec): boolean {
  return LOSSLESS.has(codec)
}

/** "4K · Dolby Vision" at md, "4K·DV" at sm; SDR is the default and goes unsaid. */
export function pictureLabel(
  resolution: Resolution,
  range: DynamicRange = "sdr",
  size: Size = "md",
): string {
  const res = RESOLUTION_LABEL[resolution]
  if (range === "sdr") return res
  const [long, short] = RANGE_LABEL[range]
  return size === "sm" ? `${res}·${short}` : `${res} · ${long}`
}

/** "TrueHD Atmos 7.1" at md; the one word that matters at sm ("Atmos", else "TrueHD"). */
export function soundLabel(audio: Audio, size: Size = "md"): string {
  const codec = CODEC_LABEL[audio.codec]
  const object = audio.object ? OBJECT_LABEL[audio.object] : ""
  if (size === "sm") return object || codec
  return [codec, object, audio.channels ?? ""].filter(Boolean).join(" ")
}

export function tierLabel(tier: Tier): string {
  return TIER_LABEL[tier]
}

export function langLabel(code: string): string {
  return LANG_LABEL[code] ?? code
}

export function cutLabel(cut: Cut): string {
  return (CUT_LABEL as Record<string, string>)[cut] ?? cut
}

// ── Which mark a value wears. The mapping is the vocabulary's, stated once here; the
// artwork is media-spec-marks.tsx. A value absent from a table is a drawn badge.

const RESOLUTION_MARK: Partial<Record<Resolution, MarkId>> = {
  sd: "badge-sd",
  "1080p": "badge-hd",
  "2160p": "badge-4k",
  "4320p": "badge-8k",
}
const RANGE_MARK: Partial<Record<DynamicRange, MarkId>> = {
  "dolby-vision": "dolby-vision",
  hdr10: "hdr10",
  "hdr10-plus": "hdr10-plus",
}
const CODEC_MARK: Partial<Record<AudioCodec, MarkId>> = {
  truehd: "dolby-truehd",
  eac3: "dolby-digital-plus",
  ac3: "dolby-digital",
  dts: "dts",
  "dts-hd-ma": "dts-hd-ma",
  flac: "flac",
  opus: "opus",
}
const TIER_MARK: Partial<Record<Tier, MarkId>> = {
  remux: "bluray",
  bluray: "bluray",
  dvd: "dvd",
}
const LANG_MARK: Record<string, MarkId> = { "es-ES": "flag-es" }
const CUT_MARK: Record<string, MarkId> = { imax: "imax" }

/** Marks with a SYMBOL for the poster rung; a lockup-only mark is a drawn word there. */
const HAS_SYMBOL: ReadonlySet<MarkId> = new Set<MarkId>([
  "dolby",
  "dolby-vision",
  "dolby-atmos",
  "dolby-truehd",
  "dolby-digital-plus",
  "dolby-digital",
  "dts",
  "dts-hd-ma",
  "hdr10",
  "hdr10-plus",
  "bluray",
  "ultra-hd-bluray",
  "dvd",
  "imax",
  "flag-es",
  "badge-4k",
  "badge-8k",
  "badge-hd",
  "badge-sd",
])

// ── The rungs. Every mark stands at a height that makes its VISIBLE box match the
// row's badges: the HDR10 artwork is a tight box, so it sets the badge height B; the
// tabler badges draw their box across 14 of their 24 units, so they stand at B × 24/14;
// a brand symbol stands at B; a lockup rises above B to keep a two-line wordmark
// legible. The drawn badge is a box of height B with the word's cap height ≈ B / 1.5,
// corners at B / 4 and side padding at half the cap height (the HDR10 badge's own
// geometry). Tuned once, on the demo page: sm B = 10px, md B = 12px.
type Box = "badge" | "tabler" | "symbol" | "lockup" | "flag"
const BOX_OF: Partial<Record<MarkId, Box>> = {
  hdr10: "badge",
  "hdr10-plus": "badge",
  "badge-4k": "tabler",
  "badge-8k": "tabler",
  "badge-hd": "tabler",
  "badge-sd": "tabler",
  "flag-es": "flag",
}
const MARK_H: Record<Size, Record<Box, string>> = {
  sm: {
    badge: "h-2.5",
    tabler: "h-[17px]",
    symbol: "h-2.5",
    lockup: "h-2.5",
    flag: "h-2.5",
  },
  md: {
    badge: "h-3",
    tabler: "h-5",
    symbol: "h-3",
    lockup: "h-4",
    flag: "h-3",
  },
}
/** The drawn badge, in the HDR10 badge's proportions at each rung. */
const WORD: Record<Size, string> = {
  sm: "h-2.5 rounded-[2.5px] px-[3px] text-[8px]",
  md: "h-3 rounded-[3px] px-1 text-[11px]",
}
/** Provenance ON the mark: presence, never a glyph. */
const PROVENANCE: Record<Provenance, string> = {
  claim: "opacity-55",
  verified: "",
  measured: "rounded bg-(--ag-media-ink)/12 px-0.5",
  delivered:
    "rounded bg-(--ag-media-ink)/12 px-0.5 ring-1 ring-(--ag-media-ink)/45",
}
/** A drawn badge on the poster rung sits on art: a scrim under it so it survives a
 *  white sky. Artwork carries its own weight. */
const SCRIM = "bg-(--ag-media-scrim) backdrop-blur-sm"
const BUTTON =
  "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-(--ag-media-ink)/60 focus-visible:outline-offset-1"
const DELTA: Record<Delta, [glyph: string, cls: string]> = {
  better: ["▲", "text-(--ag-media-better)"],
  same: ["=", "opacity-50"],
  worse: ["▼", "text-(--ag-media-worse)"],
}
const GAP_WITHIN: Record<Size, string> = { sm: "gap-0.5", md: "gap-1" }
const GAP_BETWEEN: Record<Size, string> = { sm: "gap-1.5", md: "gap-2.5" }

export interface ChipProps {
  provenance?: Provenance
  size?: Size
  /** the marks' ink: the chip's own (default) or the brand's official hex */
  tone?: Tone
  /** trails the axis's last chip */
  delta?: Delta
  /** the axis group's title: where the fact came from, what it became */
  detail?: string
  onClick?: () => void
  className?: string
}

/** One value as one mark, or one drawn word where no artwork exists. */
type Atom = { mark: MarkId; name: string } | { word: string }

interface ChipRenderProps {
  kind: Kind
  facet: Facet
  atom: Atom
  provenance: Provenance
  size: Size
  tone: Tone
  onClick?: () => void
}

function Chip({
  kind,
  facet,
  atom,
  provenance,
  size,
  tone,
  onClick,
}: ChipRenderProps) {
  const style = {
    // The fallback chain, written once: the kind's ink or the surrounding text colour.
    "--ag-media-ink": `var(--ag-media-${kind}, currentColor)`,
  } as React.CSSProperties
  const isMark = "mark" in atom
  const box: Box = isMark
    ? (BOX_OF[atom.mark] ?? (size === "sm" ? "symbol" : "lockup"))
    : "badge"
  const classes = cn(
    "inline-flex shrink-0 items-center align-middle leading-none text-(--ag-media-ink)",
    isMark
      ? MARK_H[size][box]
      : cn(
          WORD[size],
          "border border-current font-semibold whitespace-nowrap",
          size === "sm" && SCRIM,
        ),
    PROVENANCE[provenance],
    onClick && BUTTON,
  )
  const attrs = {
    "data-slot": "media-chip",
    "data-kind": kind,
    "data-facet": facet,
    "data-provenance": provenance,
    "data-size": size,
    "data-mark": isMark ? atom.mark : undefined,
    "data-tone": isMark ? tone : undefined,
    className: classes,
    style,
    "aria-label": isMark ? atom.name : undefined,
  }
  const body = isMark ? (
    <Mark
      id={atom.mark}
      form={size === "sm" ? "symbol" : "lockup"}
      tone={tone}
      fill
    />
  ) : (
    atom.word
  )
  if (onClick)
    return (
      <button type="button" onClick={onClick} {...attrs}>
        {body}
      </button>
    )
  return <span {...attrs}>{body}</span>
}

/** One axis: its chips as a group, the typed label as the group's name, the delta
 *  glyph trailing the last chip. */
function Axis({
  kind,
  label,
  atoms,
  provenance = "verified",
  size = "md",
  tone = "ink",
  delta,
  detail,
  onClick,
  className,
}: ChipProps & {
  kind: Kind
  label: string
  atoms: [Facet, Atom][]
}) {
  const glyph = delta ? DELTA[delta] : null
  return (
    <span
      // The axis reads as ONE picture named by the typed label ("4K · Dolby Vision"),
      // which is what a row of marks is; its chips are decoration inside it.
      role="img"
      aria-label={label}
      title={detail}
      data-slot="media-axis"
      data-kind={kind}
      data-size={size}
      className={cn("inline-flex items-center", GAP_WITHIN[size], className)}
    >
      {atoms.map(([facet, atom]) => (
        <Chip
          key={facet}
          kind={kind}
          facet={facet}
          atom={atom}
          provenance={provenance}
          size={size}
          tone={tone}
          onClick={onClick}
        />
      ))}
      {glyph && (
        <span
          data-slot="media-axis-delta"
          role="img"
          className={cn("text-[11px] leading-none", glyph[1])}
          aria-label={delta}
        >
          {glyph[0]}
        </span>
      )}
    </span>
  )
}

/** The mark for a value at a rung, or nothing when the rung has no artwork for it. */
function markAt(id: MarkId | undefined, size: Size): MarkId | undefined {
  if (!id) return undefined
  if (size === "sm" && !HAS_SYMBOL.has(id)) return undefined
  return id
}

const mark = (id: MarkId, name: string): Atom => ({ mark: id, name })
const word = (w: string): Atom => ({ word: w })

// ── The five axes.

export function PictureChip({
  resolution,
  range = "sdr",
  ...chip
}: ChipProps & { resolution: Resolution; range?: DynamicRange }) {
  const size = chip.size ?? "md"
  const atoms: [Facet, Atom][] = []
  const res = markAt(RESOLUTION_MARK[resolution], size)
  atoms.push([
    "resolution",
    res
      ? mark(res, RESOLUTION_LABEL[resolution])
      : word(RESOLUTION_LABEL[resolution]),
  ])
  if (range !== "sdr") {
    const rng = markAt(RANGE_MARK[range], size)
    atoms.push([
      "range",
      rng ? mark(rng, RANGE_LABEL[range][0]) : word(RANGE_LABEL[range][0]),
    ])
  }
  return (
    <Axis
      kind="picture"
      label={pictureLabel(resolution, range, size)}
      atoms={atoms}
      {...chip}
    />
  )
}

export function SoundChip({ audio, ...chip }: ChipProps & { audio: Audio }) {
  const size = chip.size ?? "md"
  const atoms: [Facet, Atom][] = []
  const codec = CODEC_LABEL[audio.codec]
  if (audio.object === "atmos") {
    const id = markAt("dolby-atmos", size)
    atoms.push(["object", id ? mark(id, "Dolby Atmos") : word("Atmos")])
  } else if (audio.object === "dts-x") {
    // No DTS:X artwork exists anywhere free to vendor: a drawn badge.
    atoms.push(["object", word(OBJECT_LABEL["dts-x"])])
  }
  // Beside an object mark the codec is a word: two Dolby lockups in a row is heavy.
  const id = audio.object ? undefined : markAt(CODEC_MARK[audio.codec], size)
  atoms.push(["codec", id ? mark(id, codec) : word(codec)])
  if (audio.channels) atoms.push(["channels", word(audio.channels)])
  return (
    <Axis
      kind="sound"
      label={soundLabel(audio, size)}
      atoms={atoms}
      {...chip}
    />
  )
}

export function TierChip({
  tier,
  resolution,
  ...chip
}: ChipProps & {
  tier: Tier
  /** the copy's resolution, when known: a 2160p disc wears the Ultra HD Blu-ray mark */
  resolution?: Resolution
}) {
  const size = chip.size ?? "md"
  let id = TIER_MARK[tier]
  if (id === "bluray" && resolution === "2160p") id = "ultra-hd-bluray"
  const disc = markAt(id, size)
  const atoms: [Facet, Atom][] = [
    [
      "tier",
      disc
        ? mark(
            disc,
            id === "ultra-hd-bluray" ? "Ultra HD Blu-ray" : TIER_LABEL[tier],
          )
        : word(tier === "remux" ? TIER_LABEL.bluray : TIER_LABEL[tier]),
    ],
  ]
  // A remux is the disc's own bits: the disc, then the edition.
  if (tier === "remux") atoms.push(["edition", word(TIER_LABEL.remux)])
  return <Axis kind="tier" label={tierLabel(tier)} atoms={atoms} {...chip} />
}

export function LangChip({ lang, ...chip }: ChipProps & { lang: string }) {
  const size = chip.size ?? "md"
  const flag = markAt(LANG_MARK[lang], size)
  const atoms: [Facet, Atom][] = []
  if (flag) {
    atoms.push(["lang", mark(flag, langLabel(lang))])
    if (size === "md") atoms.push(["edition", word(langLabel(lang))])
  } else {
    atoms.push(["lang", word(langLabel(lang))])
  }
  return <Axis kind="lang" label={langLabel(lang)} atoms={atoms} {...chip} />
}

export function CutChip({ cut, ...chip }: ChipProps & { cut: Cut }) {
  const size = chip.size ?? "md"
  const id = markAt(CUT_MARK[cut], size)
  const atoms: [Facet, Atom][] = [
    ["cut", id ? mark(id, cutLabel(cut)) : word(cutLabel(cut))],
  ]
  return <Axis kind="cut" label={cutLabel(cut)} atoms={atoms} {...chip} />
}

// ── The strip: one copy's spec, axis groups in a fixed order, absent axes unsaid.

export interface MediaSpecProps {
  resolution?: Resolution
  range?: DynamicRange
  audio?: Audio
  tier?: Tier
  lang?: string
  cut?: Cut
  provenance?: Provenance
  size?: Size
  tone?: Tone
  deltas?: Partial<Record<"picture" | "sound" | "tier", Delta>>
  omit?: readonly Kind[]
  className?: string
}

export function MediaSpec({
  resolution,
  range,
  audio,
  tier,
  lang,
  cut,
  provenance,
  size = "md",
  tone,
  deltas,
  omit = [],
  className,
}: MediaSpecProps) {
  const show = (k: Kind) => !omit.includes(k)
  const shared = { provenance, size, tone }
  return (
    <span
      data-slot="media-spec"
      data-size={size}
      className={cn(
        "inline-flex flex-wrap items-center",
        GAP_BETWEEN[size],
        className,
      )}
    >
      {resolution && show("picture") && (
        <PictureChip
          resolution={resolution}
          range={range}
          delta={deltas?.picture}
          {...shared}
        />
      )}
      {audio && show("sound") && (
        <SoundChip audio={audio} delta={deltas?.sound} {...shared} />
      )}
      {tier && show("tier") && (
        <TierChip
          tier={tier}
          resolution={resolution}
          delta={deltas?.tier}
          {...shared}
        />
      )}
      {lang && show("lang") && <LangChip lang={lang} {...shared} />}
      {cut && show("cut") && <CutChip cut={cut} {...shared} />}
    </span>
  )
}
