// THE MEDIA FORMAT VOCABULARY, typed. What a copy of a film carries and how we know it:
// picture (resolution × dynamic range), sound (codec × object audio × channels), the
// source tier, the language, the cut. An app passes VALUES, never label strings, and
// the chip owns every label, short form and tone, the way a score chip knows what IMDb
// is. It knows nothing about ranking: which of two values is better is the caller's
// business (a daemon's ladder), and a chip renders one value honestly.
//
// PROVENANCE is the second axis and it is a fill ladder, never a glyph: `claim` (a
// release name's promise) is a dotted hairline with no wash; `verified` (the container
// states it) a solid hairline with a wash; `measured` (the pixels or the meter say so)
// is filled; `delivered` (what this session on this screen actually gets) is filled and
// ringed, the loudest state. A reader learns nothing to read it: more fill, more certain.
//
// STYLE IS UTILITIES, consumer `className` last. The one computed value is the chip's
// ink: `--ag-media-ink` resolves `--ag-media-<kind>` and falls back to `currentColor`,
// so with nothing set every chip is monochrome in the surrounding text colour and told
// apart by the fill ladder alone. That is the contract with a consumer on any palette,
// tokens or not. Custom properties a consumer MAY set:
//   --ag-media-picture / --ag-media-sound / --ag-media-tier / --ag-media-lang /
//   --ag-media-cut     the ink per kind (fallback: currentColor)
//   --ag-media-better / --ag-media-worse   the delta glyph inks (fallback: currentColor)
//   --ag-media-on-ink  the text on a filled chip (fallback: the theme's background,
//                      then the system Canvas colour)
//   --ag-media-scrim   the ground under the poster rung (fallback: rgb(0 0 0 / .65))
// Every root carries data-slot="media-chip" with data-kind / data-provenance /
// data-size, plus data-delta, data-range and data-object when set, so a consumer can
// style Dolby Vision or Atmos from outside without a class name to know.
//
// THE MARKS. A value that has a brand mark wears it, and the mark REPLACES the word it
// stands for while the rest of the label stays text: "4K" beside the Dolby Vision lockup,
// the Dolby Atmos lockup beside "TrueHD 7.1", the Blu-ray lockup alone. The rail rung
// (md) wears the LOCKUP; the poster rung (sm) wears the SYMBOL, because at 9 px a
// wordmark is a smudge and a glyph is not. Artwork and rules: media-spec-marks.tsx,
// generated from references/media-marks. `tone` picks the mark's ink: "ink" (default)
// draws it in the chip's own ink like the text; "brand" draws it in the official hex,
// and ONLY the mark, never the text. A filled provenance (measured, delivered) always
// keeps the mark in the fill's text colour: a brand-coloured mark on a brand-coloured
// fill is invisible. So does a near-black brand (Dolby, HDR10, DVD): black on a dark
// chip is a missing logo, not a brand statement (media-spec-marks.tsx, `markFill`).
// The typed label stays the accessible name whatever is drawn.

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

export type Size = "sm" | "md"

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

// ── Style. Fixed sets, one home each.

const BASE =
  "inline-flex items-center gap-1 whitespace-nowrap rounded border align-middle leading-none text-(--ag-media-ink)"
const SIZE: Record<Size, string> = {
  sm: "px-1 py-0.5 text-[9px] font-bold",
  md: "px-1.5 py-0.5 font-mono text-[11px]",
}
/** THE FILL LADDER: more fill, more certain. */
const PROVENANCE: Record<Provenance, string> = {
  claim: "border-dotted border-(--ag-media-ink)/45 opacity-85",
  verified: "border-solid border-(--ag-media-ink)/45 bg-(--ag-media-ink)/12",
  measured:
    "border-solid border-(--ag-media-ink) bg-(--ag-media-ink) text-(--ag-media-fill-text)",
  delivered:
    "border-solid border-(--ag-media-ink) bg-(--ag-media-ink) text-(--ag-media-fill-text) ring-2 ring-(--ag-media-ink)/35",
}
/** The poster rung sits on art: a scrim under the two unfilled states, so the chip
 *  survives a white sky. The filled states are their own ground. */
const SCRIM = "bg-(--ag-media-scrim) backdrop-blur-sm"
const BUTTON =
  "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-(--ag-media-ink)/60 focus-visible:outline-offset-1"

const DELTA: Record<Delta, [glyph: string, cls: string]> = {
  better: ["▲", "text-(--ag-media-better)"],
  same: ["=", "opacity-50"],
  worse: ["▼", "text-(--ag-media-worse)"],
}

export type Tone = MarkTone

export interface ChipProps {
  provenance?: Provenance
  size?: Size
  /** the mark's ink: the chip's own (default) or the brand's official hex */
  tone?: Tone
  delta?: Delta
  /** A second line for the title: where the fact came from, what it became. */
  detail?: string
  onClick?: () => void
  className?: string
}

// ── Which mark a value wears. The mapping is the vocabulary's, stated once here;
// the artwork is media-spec-marks.tsx. A value absent from a table wears text.

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
  "dts-hd-hra": "dts",
  flac: "flac",
  opus: "opus",
}
const OBJECT_MARK: Record<ObjectAudio, MarkId> = {
  atmos: "dolby-atmos",
  "dts-x": "dts",
}
const TIER_MARK: Partial<Record<Tier, MarkId>> = {
  remux: "bluray",
  bluray: "bluray",
  dvd: "dvd",
}
const LANG_MARK: Record<string, MarkId> = { "es-ES": "flag-es" }
const CUT_MARK: Record<string, MarkId> = { imax: "imax" }
/** Marks that carry a symbol for the poster rung (lockup-only marks stay text there). */
const MARKS_WITH_SYMBOL: ReadonlySet<MarkId> = new Set<MarkId>([
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
])

interface ChipRenderProps extends ChipProps {
  kind: Kind
  /** the typed label: the accessible name, and the text when no mark replaces it */
  label: string
  /** the chip's content once a mark has replaced the word it stands for */
  children?: React.ReactNode
  mark?: MarkId
  data?: Record<`data-${string}`, string | undefined>
}

function Chip({
  kind,
  label,
  children,
  mark,
  data,
  provenance = "verified",
  size = "md",
  tone = "ink",
  delta,
  detail,
  onClick,
  className,
}: ChipRenderProps) {
  const style = {
    // The fallback chains, written once: the kind's ink or the text colour; the text
    // on a fill, or the theme's background, or the system's page colour.
    "--ag-media-ink": `var(--ag-media-${kind}, currentColor)`,
    "--ag-media-fill-text":
      "var(--ag-media-on-ink, var(--color-background, Canvas))",
  } as React.CSSProperties
  const filled = provenance === "measured" || provenance === "delivered"
  const classes = cn(
    BASE,
    SIZE[size],
    PROVENANCE[provenance],
    size === "sm" && !filled && SCRIM,
    onClick && BUTTON,
    className,
  )
  const glyph = delta ? DELTA[delta] : null
  const attrs = {
    "data-slot": "media-chip",
    "data-kind": kind,
    "data-provenance": provenance,
    "data-size": size,
    "data-tone": mark ? tone : undefined,
    "data-mark": mark,
    "data-delta": delta,
    ...data,
    className: classes,
    style,
    title: detail,
    // A mark replaced part of the words: the typed label stays the name.
    "aria-label": children === undefined ? undefined : label,
    "aria-description": detail,
  }
  const body = (
    <>
      {children ?? label}
      {glyph && (
        <span
          data-slot="media-chip-delta"
          role="img"
          className={glyph[1]}
          aria-label={delta}
        >
          {glyph[0]}
        </span>
      )}
    </>
  )
  if (onClick)
    return (
      <button type="button" onClick={onClick} {...attrs}>
        {body}
      </button>
    )
  return <span {...attrs}>{body}</span>
}

/** The mark inside a chip: the rung follows the size, and a filled chip keeps the mark
 *  in its text colour whatever `tone` asks (brand on brand is invisible). */
function ChipMark({
  id,
  size,
  provenance,
  tone,
  em,
}: {
  id: MarkId
  size: Size
  provenance: Provenance
  tone: Tone
  em?: number
}) {
  const filled = provenance === "measured" || provenance === "delivered"
  return (
    <Mark
      id={id}
      form={size === "sm" ? "symbol" : "lockup"}
      tone={filled ? "ink" : tone}
      em={em}
    />
  )
}

// ── The five chips. Each states its content by the composition rules: at md the
// lockup replaces the word, the rest stays text; at sm the symbol and the short word.

export function PictureChip({
  resolution,
  range = "sdr",
  ...chip
}: ChipProps & { resolution: Resolution; range?: DynamicRange }) {
  const { size = "md", provenance = "verified", tone = "ink" } = chip
  const mark = RANGE_MARK[range]
  const badge = range === "hdr10" || range === "hdr10-plus"
  const res = RESOLUTION_LABEL[resolution]
  const wear = { size, provenance, tone }
  let content: React.ReactNode | undefined
  let worn: MarkId | undefined
  if (mark && size === "md") {
    // "4K" + the Dolby Vision lockup; "4K" + the HDR10 badge.
    worn = mark
    content = (
      <>
        {res}
        <ChipMark id={mark} {...wear} />
      </>
    )
  } else if (mark && badge) {
    // The badge alone: it is its own word.
    worn = mark
    content = <ChipMark id={mark} {...wear} />
  } else if (mark) {
    // The Dolby D and the short word.
    worn = mark
    content = (
      <>
        <ChipMark id={mark} {...wear} />
        {RANGE_LABEL[range][1]}
      </>
    )
  } else if (resolution === "2160p" && size === "md") {
    // SDR 4K wears the Ultra HD wordmark alone; beside a range lockup it stays "4K",
    // two lockups in one chip being one too many.
    worn = "ultra-hd"
    content = <ChipMark id="ultra-hd" {...wear} />
  }
  return (
    <Chip
      kind="picture"
      label={pictureLabel(resolution, range, size)}
      mark={worn}
      data={{ "data-resolution": resolution, "data-range": range }}
      {...chip}
    >
      {content}
    </Chip>
  )
}

export function SoundChip({ audio, ...chip }: ChipProps & { audio: Audio }) {
  const { size = "md", provenance = "verified", tone = "ink" } = chip
  const wear = { size, provenance, tone }
  const codec = CODEC_LABEL[audio.codec]
  const channels = audio.channels ?? ""
  let content: React.ReactNode | undefined
  let worn: MarkId | undefined
  if (audio.object === "atmos") {
    // The Dolby Atmos lockup beside "TrueHD 7.1"; the Dolby D beside "Atmos".
    worn = OBJECT_MARK.atmos
    content =
      size === "md" ? (
        <>
          <ChipMark id={worn} {...wear} />
          {[codec, channels].filter(Boolean).join(" ")}
        </>
      ) : (
        <>
          <ChipMark id={worn} {...wear} />
          {OBJECT_LABEL.atmos}
        </>
      )
  } else if (audio.object === "dts-x") {
    // No DTS:X artwork exists: the dts mark and ":X" set in the chip's own type.
    worn = OBJECT_MARK["dts-x"]
    content = (
      <>
        <ChipMark id={worn} {...wear} />
        {size === "md" ? [":X", channels].filter(Boolean).join(" ") : "X"}
      </>
    )
  } else {
    const mark = CODEC_MARK[audio.codec]
    if (mark && size === "md" && audio.codec !== "dts-hd-hra") {
      // The codec's lockup beside the channels.
      worn = mark
      content = (
        <>
          <ChipMark id={mark} {...wear} />
          {channels}
        </>
      )
    } else if (mark && audio.codec === "dts-hd-hra" && size === "md") {
      // No DTS-HD HRA artwork: the dts lockup and the rest as text.
      worn = mark
      content = (
        <>
          <ChipMark id={mark} {...wear} />
          {["HD HRA", channels].filter(Boolean).join(" ")}
        </>
      )
    } else if (mark && MARKS_WITH_SYMBOL.has(mark)) {
      // The symbol and the short word.
      worn = mark
      content = (
        <>
          <ChipMark id={mark} {...wear} />
          {codec}
        </>
      )
    }
  }
  return (
    <Chip
      kind="sound"
      label={soundLabel(audio, size)}
      mark={worn}
      data={{
        "data-codec": audio.codec,
        "data-object": audio.object,
        "data-lossless": isLossless(audio.codec) ? "" : undefined,
      }}
      {...chip}
    >
      {content}
    </Chip>
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
  const { size = "md", provenance = "verified", tone = "ink" } = chip
  const wear = { size, provenance, tone }
  let mark = TIER_MARK[tier]
  if (mark === "bluray" && resolution === "2160p") mark = "ultra-hd-bluray"
  let content: React.ReactNode | undefined
  if (mark) {
    // The disc's mark alone; "Remux" beside it, since a remux is the disc's own bits.
    content = (
      <>
        <ChipMark id={mark} {...wear} />
        {tier === "remux" && size === "md" ? TIER_LABEL.remux : null}
      </>
    )
  }
  return (
    <Chip
      kind="tier"
      label={tierLabel(tier)}
      mark={mark}
      data={{ "data-tier": tier }}
      {...chip}
    >
      {content}
    </Chip>
  )
}

export function LangChip({ lang, ...chip }: ChipProps & { lang: string }) {
  const { size = "md", provenance = "verified", tone = "ink" } = chip
  const mark = LANG_MARK[lang]
  let content: React.ReactNode | undefined
  if (mark) {
    // The flag at the text's own height, the house word beside it on the rail.
    content = (
      <>
        <ChipMark
          id={mark}
          size={size}
          provenance={provenance}
          tone={tone}
          em={1}
        />
        {size === "md" ? langLabel(lang) : null}
      </>
    )
  }
  return (
    <Chip
      kind="lang"
      label={langLabel(lang)}
      mark={mark}
      data={{ "data-lang": lang }}
      {...chip}
    >
      {content}
    </Chip>
  )
}

export function CutChip({ cut, ...chip }: ChipProps & { cut: Cut }) {
  const { size = "md", provenance = "verified", tone = "ink" } = chip
  const mark = CUT_MARK[cut]
  const content = mark ? (
    <ChipMark id={mark} size={size} provenance={provenance} tone={tone} />
  ) : undefined
  return (
    <Chip
      kind="cut"
      label={cutLabel(cut)}
      mark={mark}
      data={{ "data-cut": cut }}
      {...chip}
    >
      {content}
    </Chip>
  )
}

// ── The strip: one copy's spec in a fixed order, absent axes unsaid.

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

const GAP: Record<Size, string> = { sm: "gap-1", md: "gap-1.5" }

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
      className={cn("inline-flex flex-wrap items-center", GAP[size], className)}
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
