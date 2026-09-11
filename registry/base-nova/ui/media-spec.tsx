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
// family: the sticker, "4K" over an inverted "ULTRA HD" band. The HDR10 / HDR10+
// and tabler badge artwork stays in the references and in MARKS, not wired.
//
// EMPHASIS IS LIGHT, NEVER GEOMETRY: a ladder named for its look alone, and no step
// adds a shape to a badge that already has its frame. `ghost` is the chip at 55%;
// `plain` is resting; `lit` is a soft glow behind the chip in the badge ink (a box
// shadow on a drawn badge, a drop shadow that follows the artwork's silhouette on a
// mark); `vivid` is the stronger glow with the chip at full brightness (white under
// ink and brand, the metal's highlight under gold). What a step means is the
// consumer's to decide.
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
// `tone` picks the ink: "ink" (default) draws every mark like the words; "brand" draws
// a mark in its official hex, and only where that hex is a colour (a near-black brand
// such as Dolby stays ink: black on a dark surface is a missing logo, not a brand
// statement; `markFill` in media-spec-marks.tsx), and drawn badges keep the ink;
// "gold" is the disc-case sticker, FOR THE DRAWN FAMILY ONLY: the drawn boxes filled
// near-black with a metallic gradient on stroke and letters, while every brand mark
// (Dolby, DTS, Blu-ray, DVD, IMAX, FLAC, Opus) stays in ink beside them, as disc
// cases print them; the flag is itself. A consumer retunes the metal through
// --ag-media-gold-hi / -mid / -lo / -glint (defaults #FFF1A8 · #E6B422 · #9C7A1B ·
// #FFE680). The resolution badge is the STICKER: two panels in one frame, the upper
// on the near-black ground with "4K" in the ink, the lower a band filled with the ink
// carrying "ULTRA HD" in the ground colour (`--ag-media-sticker-ground`, #0b0b0b).
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

export const EMPHASES = ["ghost", "plain", "lit", "vivid"] as const
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

/** The three rungs: sm on a poster's corner, md on a rail, lg where the chip is the
 *  thing looked at (a hero, a card wide enough to print the disc-case sticker). */
export type Size = "sm" | "md" | "lg"
export type Tone = MarkTone
/** The form a mark takes: its symbol (the Dolby D, the Blu-ray glyph) or its lockup
 *  (symbol and wordmark). The rung picks one (symbols at sm, lockups above); a
 *  consumer may name the form outright — a corner over art wants symbols beside the
 *  sticker at any rung, a rail wants lockups. */
export type MarkForm = "symbol" | "lockup"

/** A track's format. The codec is optional for a CLAIM that names only the object
 *  layer (a disc case, a release name saying "Atmos" and nothing about its carrier);
 *  a described track always names one. At least one of codec / object is set. */
export interface Audio {
  codec?: AudioCodec
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
  const codec = audio.codec ? CODEC_LABEL[audio.codec] : ""
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

// The resolution badge is the disc-case sticker, DRAWN (`Sticker`): "4K" on the ground
// panel over an inverted "ULTRA HD" band, in the family's stroke and radius. No free
// vector of it exists and it is typography below the originality threshold. SD and
// 720p are one-panel badges; the three with a band keep the row level by centring.
// tabler's badge-* artwork stays in MARKS and the references, not wired.
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
// sticker is the same frame 1.75 × taller, centred on the row. A mark drawn in a
// grid with margins states its factor (`MarkArt.box`) and the chip scales the grid to
// B × box, so its box is B tall. A brand symbol and the flag stand at B; a lockup
// rises above B so a two-line wordmark stays legible, centred. Tuned once, on the
// demo page:
//   sm  B = 10px  radius 2.5px  hairline 0.8px  text 8px   sides 3px   sticker 18px
//   md  B = 12px  radius 3px    hairline 1px    text 11px  sides 4px   sticker 21px
//       lockup 16px
//   lg  B = 16px  radius 4px    hairline 1.25px text 14px  sides 5px   sticker 30px
//       lockup 21px  symbol 18px
type Box = "symbol" | "lockup" | "flag"
const BOX_OF: Partial<Record<MarkId, Box>> = { "flag-es": "flag" }
/** The badge height B per rung, in px: what a mark drawn in a grid scales its box to. */
const BADGE_PX: Record<Size, number> = { sm: 10, md: 12, lg: 16 }
const MARK_H: Record<Size, Record<Box, string>> = {
  sm: { symbol: "h-2.5", lockup: "h-2.5", flag: "h-2.5" },
  md: { symbol: "h-3", lockup: "h-4", flag: "h-3" },
  lg: { symbol: "h-[18px]", lockup: "h-[21px]", flag: "h-4" },
}
/** The drawn badge. */
const WORD: Record<Size, string> = {
  sm: "h-2.5 rounded-[2.5px] border-[0.8px] px-[3px] text-[8px]",
  md: "h-3 rounded-[3px] border px-1 text-[11px]",
  lg: "h-4 rounded-[4px] border-[1.25px] px-[5px] text-[14px]",
}
/** THE STICKER: the disc-case resolution badge, two panels in one frame. An outer
 *  frame stroked in the ink; an upper panel on the near-black ground carrying the
 *  primary ("4K") in the ink, heavy; a lower band FILLED with the ink carrying the
 *  secondary ("ULTRA HD") in the ground colour, small caps, wide-tracked, flush to the
 *  frame's inner edge so band and frame read as one shape. Built as layout, not as a
 *  fixed-width drawing: a column sized by its widest line plus side padding, so no
 *  word ever clips. Box height 1.75 × B, band 30% of it, primary 55% of it, frame
 *  the family hairline × 1.25 at full ink, radius as the family. Under ink and brand
 *  it is white-on-black; under gold every ink is the metal (the frame a gradient
 *  ground behind a 1px inset column, the primary clipped from the gradient, the band
 *  a gradient fill) and the panel stays near-black. The ground is
 *  `--ag-media-sticker-ground` (default #0b0b0b) so a light surface can set its own. */
const STICKER: Record<
  Size,
  {
    h: number
    stroke: number
    r: number
    band: number
    primary: number
    secondary: number
    pad: number
  }
> = {
  sm: {
    h: 18,
    stroke: 1,
    r: 2.5,
    band: 5.4,
    primary: 9.9,
    secondary: 5,
    pad: 3,
  },
  md: {
    h: 21,
    stroke: 1.25,
    r: 3,
    band: 6.3,
    primary: 11.55,
    secondary: 6,
    pad: 4,
  },
  lg: {
    h: 30,
    stroke: 1.5,
    r: 4,
    band: 9,
    primary: 16.5,
    secondary: 8,
    pad: 5,
  },
}
const STICKER_GROUND = "var(--ag-media-sticker-ground, #0b0b0b)"

function Sticker({
  primary,
  secondary,
  size,
  gold,
  paint,
}: {
  primary: string
  secondary: string
  size: Size
  gold: boolean
  /** the metal under gold (the highlight alone when vivid) */
  paint: string
}) {
  const g = STICKER[size]
  const column = (
    <span
      data-slot={gold ? undefined : "media-sticker"}
      className="flex flex-col items-stretch overflow-hidden whitespace-nowrap"
      style={{
        height: g.h - (gold ? 2 * g.stroke : 0),
        borderRadius: gold ? Math.max(g.r - g.stroke, 0) : g.r,
        borderWidth: gold ? 0 : g.stroke,
        borderStyle: "solid",
        borderColor: "currentColor",
        background: STICKER_GROUND,
      }}
    >
      <span
        className="flex flex-1 items-center justify-center leading-none tracking-tight"
        style={{
          padding: `0 ${g.pad}px`,
          fontSize: g.primary,
          fontWeight: 900,
          ...(gold
            ? {
                backgroundImage: paint,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }
            : undefined),
        }}
      >
        {primary}
      </span>
      <span
        className="flex items-center justify-center font-semibold uppercase leading-none tracking-[0.12em]"
        style={{
          height: g.band,
          padding: `0 ${g.pad}px`,
          fontSize: g.secondary,
          color: STICKER_GROUND,
          ...(gold
            ? { backgroundImage: paint }
            : { background: "currentColor" }),
        }}
      >
        {secondary}
      </span>
    </span>
  )
  if (!gold) return column
  // The metal frame that keeps its radius: the gradient as the ground of a wrapper,
  // the column inset by the stroke.
  return (
    <span
      data-slot="media-sticker"
      className="inline-block"
      style={{
        padding: g.stroke,
        borderRadius: g.r,
        backgroundImage: paint,
      }}
    >
      {column}
    </span>
  )
}
/** The emphasis ladder, named for its look. */
/** The glow, per emphasis: radius in em and share of the ink. */
const GLOW: Record<Emphasis, [radius: string, share: number] | null> = {
  ghost: null,
  plain: null,
  lit: ["0.25em", 45],
  vivid: ["0.45em", 70],
}
/** The light a chip stands in. A drawn badge glows from its box; a mark glows from
 *  its silhouette (a drop shadow follows the artwork, a box shadow would draw the
 *  bounding rectangle a frameless mark exists to avoid). */
function emphasisStyle(
  emphasis: Emphasis,
  isMark: boolean,
): React.CSSProperties | undefined {
  const glow = GLOW[emphasis]
  if (!glow) return undefined
  const colour = `color-mix(in srgb, var(--ag-media-ink) ${glow[1]}%, transparent)`
  return isMark
    ? { filter: `drop-shadow(0 0 ${glow[0]} ${colour})` }
    : { boxShadow: `0 0 ${glow[0]} ${colour}` }
}
const EMPHASIS: Record<Emphasis, string> = {
  ghost: "opacity-55",
  plain: "",
  lit: "",
  vivid: "",
}
/** A drawn badge on the poster rung sits on art: a scrim under it so it survives a
 *  white sky. Artwork carries its own weight. */
const SCRIM = "bg-(--ag-media-scrim) backdrop-blur-sm"
// ── GOLD: the disc-case metallic sticker, for the drawn family. ONE mechanism: a CSS
// background the letters are clipped from (`background-clip: text`) and a band or a
// frame is filled with. The one-line box fills near-black and wears the metal on its
// stroke through the two-layer background trick (a padding-box fill over a border-box
// gradient behind a transparent border), so the radius survives; the sticker wears it
// as the ground of a wrapper the column sits inset in. Stroke widths are the family's
// (a hairline; the sticker's hairline × 1.25). At sm the metal is a flat mid gold: a
// gradient at 8px is noise. A consumer retunes the metal through --ag-media-gold-hi /
// -mid / -lo / -glint.
const GOLD_HI = "var(--ag-media-gold-hi, #FFF1A8)"
const GOLD_MID = "var(--ag-media-gold-mid, #E6B422)"
const GOLD_LO = "var(--ag-media-gold-lo, #9C7A1B)"
const GOLD_GLINT = "var(--ag-media-gold-glint, #FFE680)"
const GOLD_GROUND = "#0b0b0b"
const GOLD_METAL = `linear-gradient(135deg, ${GOLD_HI} 0%, ${GOLD_MID} 45%, ${GOLD_LO} 84%, ${GOLD_GLINT} 97%, ${GOLD_LO} 100%)`
/** The paint a rung's gold is drawn with. */
const GOLD_PAINT: Record<Size, string> = {
  sm: GOLD_MID,
  md: GOLD_METAL,
  lg: GOLD_METAL,
}
/** The gold one-line badge's stroke: the family hairline, in the metal. */
const GOLD_WORD: Record<Size, string> = {
  sm: "border-[0.8px]",
  md: "border",
  lg: "border-[1.25px]",
}
const BUTTON =
  "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-(--ag-media-ink)/60 focus-visible:outline-offset-1"
const GAP_WITHIN: Record<Size, string> = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
}
const GAP_BETWEEN: Record<Size, string> = {
  sm: "gap-1.5",
  md: "gap-2.5",
  lg: "gap-3",
}
/** The rung's own form: symbols on the poster rung, lockups above it. */
const FORM_OF: Record<Size, MarkForm> = {
  sm: "symbol",
  md: "lockup",
  lg: "lockup",
}

export interface ChipProps {
  emphasis?: Emphasis
  size?: Size
  /** the marks' form; default the rung's own (`FORM_OF`) */
  marks?: MarkForm
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
  form: MarkForm
  tone: Tone
  onClick?: () => void
}

function Chip({
  kind,
  facet,
  atom,
  emphasis,
  size,
  form,
  tone,
  onClick,
}: ChipRenderProps) {
  const gold = tone === "gold"
  const vivid = emphasis === "vivid"
  // Vivid brings the chip to full brightness while the glow keeps the badge ink:
  // white under ink and brand, the metal's highlight under gold.
  const paint = gold ? (vivid ? GOLD_HI : GOLD_PAINT[size]) : undefined
  const isMark = "mark" in atom
  const style = {
    // The fallback chain, written once: the kind's ink or the surrounding text colour;
    // under gold, the metal's mid tone, so the light is gold too.
    "--ag-media-ink": gold ? GOLD_MID : `var(--ag-media-${kind}, currentColor)`,
    ...emphasisStyle(emphasis, isMark),
  } as React.CSSProperties
  // A mark drawn inside a grid with margins (tabler's badges) scales its BOX to the
  // badge height; the art states the factor, so the grid never sets the size.
  const grid = isMark ? (MARKS[atom.mark][form]?.box ?? 1) : 1
  if (grid !== 1) style.height = `${BADGE_PX[size] * grid}px`
  const sticker = !isMark && atom.sub !== undefined
  if (gold && !isMark && !sticker) {
    // The one-panel box under gold: near-black inside, the metal on the stroke, the
    // radius kept (a padding-box fill over a border-box gradient behind a
    // transparent border).
    style.borderColor = "transparent"
    style.backgroundImage = `linear-gradient(${GOLD_GROUND}, ${GOLD_GROUND}), ${paint}`
    style.backgroundOrigin = "border-box"
    style.backgroundClip = "padding-box, border-box"
  }
  const classes = cn(
    "inline-flex shrink-0 items-center align-middle leading-none",
    vivid && !gold ? "text-white" : "text-(--ag-media-ink)",
    isMark
      ? grid === 1 && MARK_H[size][BOX_OF[atom.mark] ?? form]
      : sticker
        ? "whitespace-nowrap"
        : cn(
            WORD[size],
            "font-semibold tracking-tight whitespace-nowrap",
            // The frame is never the loudest thing: a hairline at 70% of the ink.
            gold ? GOLD_WORD[size] : "border-(--ag-media-ink)/70",
            size === "sm" && !gold && SCRIM,
          ),
    EMPHASIS[emphasis],
    onClick && BUTTON,
  )
  // The metal on the letters: clipped from the same paint the marks are cut from.
  const metal: React.CSSProperties | undefined = paint
    ? {
        backgroundImage: paint,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }
    : undefined
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
  // GOLD IS FOR THE DRAWN FAMILY ONLY: a brand mark stays in ink beside the metal
  // stickers, as disc cases print them.
  const body = isMark ? (
    <Mark id={atom.mark} form={form} tone={gold ? "ink" : tone} fill />
  ) : atom.sub !== undefined ? (
    <Sticker
      primary={atom.word}
      secondary={atom.sub}
      size={size}
      gold={gold}
      paint={paint ?? GOLD_PAINT[size]}
    />
  ) : metal ? (
    <span style={metal}>{atom.word}</span>
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
  marks,
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
  const form = marks ?? FORM_OF[size]
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
          form={form}
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

/** The mark for a value in a form, or nothing when no artwork exists in that form. */
function markAt(id: MarkId | undefined, form: MarkForm): MarkId | undefined {
  if (!id) return undefined
  if (form === "symbol" && !HAS_SYMBOL.has(id)) return undefined
  return id
}
/** The form a chip's marks take: named by the consumer, else the rung's own. */
function formOf(chip: ChipProps): MarkForm {
  return chip.marks ?? FORM_OF[chip.size ?? "md"]
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
    const rng = markAt(RANGE_MARK[range], formOf(chip))
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
  const form = formOf(chip)
  if (audio.object === "atmos") {
    const id = markAt("dolby-atmos", form)
    atoms.push(["object", id ? mark(id, "Dolby Atmos") : word("Atmos")])
  } else if (audio.object === "dts-x") {
    // No DTS:X artwork exists anywhere free to vendor: a drawn badge.
    atoms.push(["object", word(OBJECT_LABEL["dts-x"])])
  }
  // Beside an object mark the codec is a word: two Dolby lockups in a row is heavy.
  // An unnamed carrier (a claim) draws nothing: the object mark is the whole claim.
  if (audio.codec) {
    const codec = CODEC_LABEL[audio.codec]
    const id = audio.object ? undefined : markAt(CODEC_MARK[audio.codec], form)
    atoms.push(["codec", id ? mark(id, codec) : word(codec)])
  }
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
  let id = TIER_MARK[tier]
  if (id === "bluray" && resolution === "2160p") id = "ultra-hd-bluray"
  const disc = markAt(id, formOf(chip))
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
  const form = formOf(chip)
  const name = label ?? langLabel(lang, locale)
  const region = regionOf(lang)
  const flag = markAt(region ? FLAG_MARK[region] : undefined, form)
  const atoms: [Facet, Atom][] = []
  if (flag) {
    atoms.push(["lang", mark(flag, name)])
    // The flag alone in symbol form; the name beside it where lockups go.
    if (form === "lockup") atoms.push(["edition", word(name)])
  } else {
    atoms.push(["lang", word(name)])
  }
  return <Axis kind="lang" label={name} atoms={atoms} {...chip} />
}

export function CutChip({ cut, ...chip }: ChipProps & { cut: Cut }) {
  const id = markAt(CUT_MARK[cut], formOf(chip))
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
  marks?: MarkForm
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
  marks,
  tone,
  adornments,
  omit = [],
  className,
}: MediaSpecProps) {
  const show = (k: Kind) => !omit.includes(k)
  const shared = { emphasis, size, marks, tone }
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
