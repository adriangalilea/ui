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
// NO KIND GLYPH, on purpose. The typed label already names its kind ("4K · Dolby
// Vision" is a picture, "TrueHD Atmos 7.1" a sound, "Remux" a tier) and at 9 px on a
// poster a glyph is a smudge. A consumer who wants one styles `[data-kind]`.

import { cn } from "@/lib/utils"

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

export interface ChipProps {
  provenance?: Provenance
  size?: Size
  delta?: Delta
  /** A second line for the title: where the fact came from, what it became. */
  detail?: string
  onClick?: () => void
  className?: string
}

interface ChipRenderProps extends ChipProps {
  kind: Kind
  label: string
  data?: Record<`data-${string}`, string | undefined>
}

function Chip({
  kind,
  label,
  data,
  provenance = "verified",
  size = "md",
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
    "data-delta": delta,
    ...data,
    className: classes,
    style,
    title: detail,
    "aria-description": detail,
  }
  const body = (
    <>
      {label}
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

// ── The five chips.

export function PictureChip({
  resolution,
  range = "sdr",
  ...chip
}: ChipProps & { resolution: Resolution; range?: DynamicRange }) {
  return (
    <Chip
      kind="picture"
      label={pictureLabel(resolution, range, chip.size)}
      data={{ "data-resolution": resolution, "data-range": range }}
      {...chip}
    />
  )
}

export function SoundChip({ audio, ...chip }: ChipProps & { audio: Audio }) {
  return (
    <Chip
      kind="sound"
      label={soundLabel(audio, chip.size)}
      data={{
        "data-codec": audio.codec,
        "data-object": audio.object,
        "data-lossless": isLossless(audio.codec) ? "" : undefined,
      }}
      {...chip}
    />
  )
}

export function TierChip({ tier, ...chip }: ChipProps & { tier: Tier }) {
  return (
    <Chip
      kind="tier"
      label={tierLabel(tier)}
      data={{ "data-tier": tier }}
      {...chip}
    />
  )
}

export function LangChip({ lang, ...chip }: ChipProps & { lang: string }) {
  return (
    <Chip
      kind="lang"
      label={langLabel(lang)}
      data={{ "data-lang": lang }}
      {...chip}
    />
  )
}

export function CutChip({ cut, ...chip }: ChipProps & { cut: Cut }) {
  return (
    <Chip
      kind="cut"
      label={cutLabel(cut)}
      data={{ "data-cut": cut }}
      {...chip}
    />
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
  deltas,
  omit = [],
  className,
}: MediaSpecProps) {
  const show = (k: Kind) => !omit.includes(k)
  const shared = { provenance, size }
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
        <TierChip tier={tier} delta={deltas?.tier} {...shared} />
      )}
      {lang && show("lang") && <LangChip lang={lang} {...shared} />}
      {cut && show("cut") && <CutChip cut={cut} {...shared} />}
    </span>
  )
}
