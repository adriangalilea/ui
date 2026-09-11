// MEDIA FORMAT CHIPS. The generic vocabulary of what a video file carries, typed:
// picture (resolution × dynamic range), sound (codec × object audio × channels), the
// source tier, the language, the cut. An app passes VALUES, never label strings, and
// the chip owns every mark, word and tone, the way a score chip knows what IMDb is.
// This item carries visuals and vocabulary only: a consumer that needs MEANING (what a
// ghosted chip says about a fact, what a trailing glyph compares, a house spelling for
// a language) vendors the file and maps it.
//
// ARTWORK FIRST. A chip is ONE MARK standing FRAMELESS: the artwork is the chip. A
// brand lockup keeps its shape, a symbol its glyph, the flag its colours, and nothing
// draws a frame around any of them, so there is never a box in a box. Every BOXED
// value (a resolution, HDR10, HDR10+, HLG, channels, Remux, WEB-DL, DTS:X, a codec
// named beside its object mark, AAC and the other plain codecs, a language, every cut
// but IMAX) is the ONE drawn badge: a rounded box with the word set in the surrounding
// sans, semibold, to the HDR10 badge's proportions, so the whole boxed family has one
// weight at each rung. The resolution badge is the disc-case badge drawn in that
// family: "4K" over "ULTRA HD", twice the lines in the same box. The HDR10 / HDR10+
// and tabler badge artwork stays in the references and in MARKS, not wired.
//
// EMPHASIS is a visual ladder named for its look alone: `ghost` is the mark at 55%,
// `plain` is full ink on no ground, `washed` is full ink over a soft wash pill,
// `ringed` is the wash plus a ring. What a step means is the consumer's to decide.
//
// AN AXIS IS A GROUP of one to three chips: picture is [resolution] [range], sound is
// [object] [codec] [channels], tier is [disc] [Remux], lang is [flag] [name]. The
// per-axis components render the group, the `MediaSpec` strip sets the groups apart
// (tight within an axis, wider between), and a `trailing` node follows the axis's
// last chip.
//
// STYLE IS UTILITIES, consumer `className` last. The one computed value is the chip's
// ink: `--ag-media-ink` resolves `--ag-media-<kind>` and falls back to `currentColor`,
// so with nothing set every chip is monochrome in the surrounding text colour. That is
// the contract with a consumer on any palette, tokens or not. Custom properties a
// consumer MAY set:
//   --ag-media-picture / --ag-media-sound / --ag-media-tier / --ag-media-lang /
//   --ag-media-cut     the ink per kind (fallback: currentColor)
//   --ag-media-scrim   the ground under the poster rung's drawn badges (fallback:
//                      rgb(0 0 0 / .65))
// `tone` picks a mark's ink: "ink" (default) draws it like the words; "brand" draws it
// in the official hex, and only where that hex is a colour (a near-black brand such as
// Dolby stays ink: black on a dark surface is a missing logo, not a brand statement;
// `markFill` in media-spec-marks.tsx). Drawn badges never take a brand.
// Every chip carries data-slot="media-chip", data-kind (the AXIS: picture | sound |
// tier | lang | cut), data-facet (resolution | range | object | codec | channels | tier
// | edition | lang | cut), data-emphasis, data-size, and data-mark when it is artwork,
// so a consumer styles Dolby Vision or Atmos from outside without a class name to know.
// The typed label is the accessible name of the axis group whatever is drawn.

import { cn } from "@/lib/utils"
import {
  MARKS,
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

export const EMPHASES = ["ghost", "plain", "washed", "ringed"] as const
export type Emphasis = (typeof EMPHASES)[number]

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

/** The two varieties Intl names badly ("European Spanish"); a consumer extends
 *  this through `LangChip`'s `label`. */
const VARIETY_LABEL: Record<string, string> = {
  "es-ES": "Castilian",
  "es-419": "Latin American Spanish",
}

/** The language's name: a variety from the small table when it has one, else the
 *  LANGUAGE subtag's display name in `locale` (default English) through Intl, the
 *  region left to the flag ("Spanish", "French"); a tag Intl cannot name renders as
 *  itself. */
export function langLabel(tag: string, locale = "en"): string {
  const variety = VARIETY_LABEL[tag]
  if (variety) return variety
  const language = tag.split("-")[0] ?? tag
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(
      language,
    )
    // Intl echoes a subtag it cannot name; the whole tag is the honest fallback.
    return name && name !== language ? name : tag
  } catch {
    return tag
  }
}

export function cutLabel(cut: Cut): string {
  return (CUT_LABEL as Record<string, string>)[cut] ?? cut
}

// ── Which mark a value wears. The mapping is the vocabulary's, stated once here; the
// artwork is media-spec-marks.tsx. A value absent from a table is a drawn badge.

// The resolution badge is the disc-case badge, DRAWN: a big line over a small line
// ("4K" over "ULTRA HD") in the same box, stroke and radius as the one-line badge.
// No free vector of it exists and it is typography below the originality threshold.
// SD and 720p are one line; the three that carry a second line keep the row level by
// centring. tabler's badge-* artwork stays in MARKS and the references, not wired.
const RESOLUTION_BADGE: Record<
  Resolution,
  [primary: string, secondary?: string]
> = {
  sd: ["SD"],
  "720p": ["HD"],
  "1080p": ["1080p", "FULL HD"],
  "2160p": ["4K", "ULTRA HD"],
  "4320p": ["8K", "ULTRA HD"],
}
const RANGE_MARK: Partial<Record<DynamicRange, MarkId>> = {
  "dolby-vision": "dolby-vision",
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
/** Flags are keyed by the tag's region subtag. */
const FLAG_MARK: Record<string, MarkId> = { ES: "flag-es" }
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
  "bluray",
  "ultra-hd-bluray",
  "dvd",
  "imax",
  "flag-es",
])

// ── The rungs. ONE badge geometry for every boxed value, so the boxed family has one
// weight at each rung: box height B, corners B / 4, a hairline of B / 12, the word in
// the surrounding sans at semibold, slightly condensed, with a cap height ≈ B / 1.5 and
// side padding ≈ half a cap (the HDR10 badge's own proportions, redrawn in CSS). The
// two-line badge is the same box 1.75 × taller, centred on the row. A mark drawn in a
// grid with margins states its factor (`MarkArt.box`) and the chip scales the grid to
// B × box, so its box is B tall. A brand symbol and the flag stand at B; a lockup
// rises above B so a two-line wordmark stays legible, centred. Tuned once, on the
// demo page:
//   sm  B = 10px  radius 2.5px  hairline 0.8px  text 8px   sides 3px   two-line 18px
//   md  B = 12px  radius 3px    hairline 1px    text 11px  sides 4px   two-line 21px
//       lockup 16px
type Box = "symbol" | "lockup" | "flag"
const BOX_OF: Partial<Record<MarkId, Box>> = { "flag-es": "flag" }
/** The badge height B per rung, in px: what a mark drawn in a grid scales its box to. */
const BADGE_PX: Record<Size, number> = { sm: 10, md: 12 }
const MARK_H: Record<Size, Record<Box, string>> = {
  sm: { symbol: "h-2.5", lockup: "h-2.5", flag: "h-2.5" },
  md: { symbol: "h-3", lockup: "h-4", flag: "h-3" },
}
/** The drawn badge. */
const WORD: Record<Size, string> = {
  sm: "h-2.5 rounded-[2.5px] border-[0.8px] px-[3px] text-[8px]",
  md: "h-3 rounded-[3px] border px-1 text-[11px]",
}
/** The two-line drawn badge: the same box, 1.75 × taller (sm 18px, md 21px); the
 *  primary line at the badge's text size in the heaviest weight, the secondary at
 *  55% of it (clamped to 5px at sm), wide-tracked small caps. */
const WORD2: Record<Size, [box: string, primary: string, secondary: string]> = {
  sm: [
    "h-[18px] rounded-[2.5px] border-[0.8px] px-[3px]",
    "text-[8px] font-black tracking-tight",
    "text-[5px] font-semibold uppercase tracking-[0.12em]",
  ],
  md: [
    "h-[21px] rounded-[3px] border px-1",
    "text-[11px] font-black tracking-tight",
    "text-[6px] font-semibold uppercase tracking-[0.12em]",
  ],
}
/** The emphasis ladder, named for its look. */
const EMPHASIS: Record<Emphasis, string> = {
  ghost: "opacity-55",
  plain: "",
  washed: "rounded bg-(--ag-media-ink)/12 px-0.5",
  ringed:
    "rounded bg-(--ag-media-ink)/12 px-0.5 ring-1 ring-(--ag-media-ink)/45",
}
/** A drawn badge on the poster rung sits on art: a scrim under it so it survives a
 *  white sky. Artwork carries its own weight. */
const SCRIM = "bg-(--ag-media-scrim) backdrop-blur-sm"
const BUTTON =
  "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-(--ag-media-ink)/60 focus-visible:outline-offset-1"
const GAP_WITHIN: Record<Size, string> = { sm: "gap-0.5", md: "gap-1" }
const GAP_BETWEEN: Record<Size, string> = { sm: "gap-1.5", md: "gap-2.5" }

export interface ChipProps {
  emphasis?: Emphasis
  size?: Size
  /** the marks' ink: the chip's own (default) or the brand's official hex */
  tone?: Tone
  /** rendered after the axis's last chip */
  trailing?: React.ReactNode
  /** the axis group's title */
  detail?: string
  onClick?: () => void
  className?: string
}

/** One value as one mark, or one drawn word where no artwork exists. */
type Atom = { mark: MarkId; name: string } | { word: string; sub?: string }

interface ChipRenderProps {
  kind: Kind
  facet: Facet
  atom: Atom
  emphasis: Emphasis
  size: Size
  tone: Tone
  onClick?: () => void
}

function Chip({
  kind,
  facet,
  atom,
  emphasis,
  size,
  tone,
  onClick,
}: ChipRenderProps) {
  const style = {
    // The fallback chain, written once: the kind's ink or the surrounding text colour.
    "--ag-media-ink": `var(--ag-media-${kind}, currentColor)`,
  } as React.CSSProperties
  const isMark = "mark" in atom
  const form = size === "sm" ? "symbol" : "lockup"
  // A mark drawn inside a grid with margins (tabler's badges) scales its BOX to the
  // badge height; the art states the factor, so the grid never sets the size.
  const grid = isMark ? (MARKS[atom.mark][form]?.box ?? 1) : 1
  if (grid !== 1) style.height = `${BADGE_PX[size] * grid}px`
  const classes = cn(
    "inline-flex shrink-0 items-center align-middle leading-none text-(--ag-media-ink)",
    isMark
      ? grid === 1 && MARK_H[size][BOX_OF[atom.mark] ?? form]
      : cn(
          atom.sub ? WORD2[size][0] : WORD[size],
          "border-current font-semibold tracking-tight whitespace-nowrap",
          size === "sm" && SCRIM,
        ),
    EMPHASIS[emphasis],
    onClick && BUTTON,
  )
  const attrs = {
    "data-slot": "media-chip",
    "data-kind": kind,
    "data-facet": facet,
    "data-emphasis": emphasis,
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
  ) : atom.sub ? (
    <span className="flex flex-col items-center leading-none">
      <span className={WORD2[size][1]}>{atom.word}</span>
      <span className={WORD2[size][2]}>{atom.sub}</span>
    </span>
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

/** One axis: its chips as a group, the typed label as the group's name, the trailing
 *  node after the last chip. */
function Axis({
  kind,
  label,
  atoms,
  emphasis = "plain",
  size = "md",
  tone = "ink",
  trailing,
  detail,
  onClick,
  className,
}: ChipProps & {
  kind: Kind
  label: string
  atoms: [Facet, Atom][]
}) {
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
          emphasis={emphasis}
          size={size}
          tone={tone}
          onClick={onClick}
        />
      ))}
      {trailing !== undefined && trailing !== null && (
        <span data-slot="media-axis-trailing" className="leading-none">
          {trailing}
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
const word = (w: string, sub?: string): Atom => ({ word: w, sub })

// ── The five axes.

export function PictureChip({
  resolution,
  range = "sdr",
  ...chip
}: ChipProps & { resolution: Resolution; range?: DynamicRange }) {
  const size = chip.size ?? "md"
  const atoms: [Facet, Atom][] = []
  const [primary, secondary] = RESOLUTION_BADGE[resolution]
  atoms.push(["resolution", word(primary, secondary)])
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
  /** the resolution, when known: a 2160p disc wears the Ultra HD Blu-ray mark */
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

/** The region subtag of a BCP-47 tag ("es-ES" → "ES"), or nothing. */
function regionOf(tag: string): string | undefined {
  return tag.split("-").find((part, i) => i > 0 && /^[A-Z]{2}$/.test(part))
}

export function LangChip({
  lang,
  label,
  locale,
  ...chip
}: ChipProps & {
  /** a BCP-47 tag */
  lang: string
  /** the word to draw beside the flag; default `langLabel(lang, locale)` */
  label?: string
  /** the locale the default label is named in */
  locale?: string
}) {
  const size = chip.size ?? "md"
  const name = label ?? langLabel(lang, locale)
  const region = regionOf(lang)
  const flag = markAt(region ? FLAG_MARK[region] : undefined, size)
  const atoms: [Facet, Atom][] = []
  if (flag) {
    atoms.push(["lang", mark(flag, name)])
    if (size === "md") atoms.push(["edition", word(name)])
  } else {
    atoms.push(["lang", word(name)])
  }
  return <Axis kind="lang" label={name} atoms={atoms} {...chip} />
}

export function CutChip({ cut, ...chip }: ChipProps & { cut: Cut }) {
  const size = chip.size ?? "md"
  const id = markAt(CUT_MARK[cut], size)
  const atoms: [Facet, Atom][] = [
    ["cut", id ? mark(id, cutLabel(cut)) : word(cutLabel(cut))],
  ]
  return <Axis kind="cut" label={cutLabel(cut)} atoms={atoms} {...chip} />
}

// ── The strip: axis groups in a fixed order, absent axes unsaid.

export interface MediaSpecProps {
  resolution?: Resolution
  range?: DynamicRange
  audio?: Audio
  tier?: Tier
  lang?: string
  /** the word beside the flag, when the default display name is not wanted */
  langLabel?: string
  locale?: string
  cut?: Cut
  emphasis?: Emphasis
  size?: Size
  tone?: Tone
  /** a node after each axis's last chip */
  adornments?: Partial<Record<Kind, React.ReactNode>>
  omit?: readonly Kind[]
  className?: string
}

export function MediaSpec({
  resolution,
  range,
  audio,
  tier,
  lang,
  langLabel: langWord,
  locale,
  cut,
  emphasis,
  size = "md",
  tone,
  adornments,
  omit = [],
  className,
}: MediaSpecProps) {
  const show = (k: Kind) => !omit.includes(k)
  const shared = { emphasis, size, tone }
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
          trailing={adornments?.picture}
          {...shared}
        />
      )}
      {audio && show("sound") && (
        <SoundChip audio={audio} trailing={adornments?.sound} {...shared} />
      )}
      {tier && show("tier") && (
        <TierChip
          tier={tier}
          resolution={resolution}
          trailing={adornments?.tier}
          {...shared}
        />
      )}
      {lang && show("lang") && (
        <LangChip
          lang={lang}
          label={langWord}
          locale={locale}
          trailing={adornments?.lang}
          {...shared}
        />
      )}
      {cut && show("cut") && (
        <CutChip cut={cut} trailing={adornments?.cut} {...shared} />
      )}
    </span>
  )
}
