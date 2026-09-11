"use client"

import { useState } from "react"
import { Sample } from "@/app/samples"
import {
  AUDIO_CODECS,
  type Audio,
  type Cut,
  CutChip,
  EMPHASES,
  type Emphasis,
  isLossless,
  KINDS,
  LangChip,
  MediaSpec,
  PictureChip,
  RANGES,
  RESOLUTIONS,
  type Size,
  SoundChip,
  TIERS,
  TierChip,
} from "@/registry/base-nova/ui/media-spec"
import {
  MARKS,
  Mark,
  type MarkId,
} from "@/registry/base-nova/ui/media-spec-marks"

// #region sounds
// Values, never labels: the chip spells "TrueHD Atmos 7.1" and "DD+ Atmos 5.1" itself.
const SOUNDS: Audio[] = [
  { codec: "truehd", channels: "7.1", object: "atmos" },
  { codec: "eac3", channels: "5.1", object: "atmos" },
  { codec: "dts-hd-ma", channels: "7.1", object: "dts-x" },
  { codec: "dts-hd-ma", channels: "5.1" },
  { codec: "flac", channels: "2.0" },
  { codec: "ac3", channels: "5.1" },
  { codec: "aac", channels: "2.0" },
  { codec: "aac" },
]
// #endregion

// #region files
// Three files of one film: the disc, the web rip with the dub, a smaller transcode.
const DISC = {
  resolution: "2160p",
  range: "dolby-vision",
  audio: { codec: "truehd", channels: "7.1", object: "atmos" },
  tier: "remux",
  lang: "en",
  cut: "theatrical",
} as const
const DUB = {
  resolution: "1080p",
  range: "sdr",
  audio: { codec: "ac3", channels: "5.1" },
  tier: "webdl",
  lang: "es-ES",
  cut: "extended",
} as const
const SMALL = {
  resolution: "2160p",
  range: "hdr10",
  audio: { codec: "flac", channels: "5.1" },
} as const
// #endregion

// #region scale
// A consumer names its own four steps and maps them onto the ladder's four looks.
const EMPHASIS_FOR = {
  rumoured: "ghost",
  stated: "plain",
  checked: "lit",
  playing: "vivid",
} as const satisfies Record<string, Emphasis>
// #endregion

// #region compare
// A consumer computes its own comparison and hands the strip a glyph per axis.
const VERDICT = { picture: "▲", sound: "▲", tier: "▼" } as const
// #endregion

const KIND_LABEL: Record<(typeof KINDS)[number], string> = {
  picture: "picture",
  sound: "sound",
  tier: "tier",
  lang: "lang",
  cut: "cut",
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-muted-foreground text-xs lowercase">
      {children}
    </div>
  )
}

/** One row of every kind at one emphasis: the strip a file wears. */
function Row({ emphasis, size }: { emphasis: Emphasis; size?: Size }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <PictureChip
        resolution="2160p"
        range="dolby-vision"
        emphasis={emphasis}
        size={size}
      />
      <SoundChip audio={SOUNDS[0] as Audio} emphasis={emphasis} size={size} />
      <TierChip tier="remux" emphasis={emphasis} size={size} />
      <LangChip lang="es-ES" emphasis={emphasis} size={size} />
      <CutChip cut="extended" emphasis={emphasis} size={size} />
    </div>
  )
}

export default function Demo() {
  const [cut, setCut] = useState<Cut>("theatrical")
  const nextCut = () =>
    setCut((c) =>
      c === "theatrical"
        ? "extended"
        : c === "extended"
          ? "directors"
          : "theatrical",
    )
  return (
    <div className="space-y-12">
      <Sample
        name="picture"
        label="picture · every resolution × range · SDR goes unsaid"
      >
        <div className="space-y-2">
          {RESOLUTIONS.map((resolution) => (
            <div
              key={resolution}
              className="flex flex-wrap items-center gap-2.5"
            >
              {RANGES.map((range) => (
                <PictureChip
                  key={range}
                  resolution={resolution}
                  range={range}
                />
              ))}
            </div>
          ))}
        </div>
      </Sample>

      <Sample
        name="sound"
        label="sound · codec × object audio × channels"
        with="sounds"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {SOUNDS.map((audio) => (
              <SoundChip
                key={`${audio.codec}-${audio.channels}-${audio.object}`}
                audio={audio}
              />
            ))}
          </div>
          <Kicker>
            every codec · lossless ones are marked in the DOM (data-lossless)
          </Kicker>
          <div className="flex flex-wrap items-center gap-2.5">
            {AUDIO_CODECS.map((codec) => (
              <SoundChip
                key={codec}
                audio={{ codec, channels: "2.0" }}
                detail={isLossless(codec) ? "lossless" : "lossy"}
              />
            ))}
          </div>
        </div>
      </Sample>

      <Sample name="tier-lang-cut" label="tier · lang · cut">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {TIERS.map((tier) => (
              <TierChip key={tier} tier={tier} />
            ))}
            <TierChip
              tier="bluray"
              resolution="2160p"
              detail="a 2160p disc wears the Ultra HD Blu-ray mark"
            />
            <TierChip tier="remux" resolution="2160p" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {["es-ES", "es-419", "en", "fr-CA", "ja"].map((lang) => (
              <LangChip key={lang} lang={lang} />
            ))}
            <LangChip lang="fr" locale="fr" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {(
              [
                "theatrical",
                "extended",
                "directors",
                "unrated",
                "uncut",
                "final",
                "imax",
                "remastered",
                "Ultimate Edition",
              ] as Cut[]
            ).map((c) => (
              <CutChip key={c} cut={c} />
            ))}
          </div>
        </div>
      </Sample>

      <Sample
        name="marks"
        label="marks · every mark, symbol and lockup, in ink and in brand colour"
      >
        <div className="space-y-2">
          {(Object.keys(MARKS) as MarkId[]).map((id) => (
            <div key={id} className="flex items-center gap-4 text-sm">
              <div className="w-36 font-mono text-muted-foreground text-xs">
                {id}
              </div>
              <div className="flex flex-1 items-center gap-6 rounded bg-black px-4 py-2 text-white">
                <Mark id={id} form="symbol" />
                <Mark id={id} form="lockup" />
                <Mark id={id} form="symbol" tone="brand" />
                <Mark id={id} form="lockup" tone="brand" />
              </div>
              <div className="flex flex-1 items-center gap-6 rounded bg-white px-4 py-2 text-black">
                <Mark id={id} form="symbol" />
                <Mark id={id} form="lockup" />
                <Mark id={id} form="symbol" tone="brand" />
                <Mark id={id} form="lockup" tone="brand" />
              </div>
            </div>
          ))}
          <Kicker>
            symbol · lockup · symbol in brand · lockup in brand, at 1em / the
            lockup&apos;s own rise; a mark with one form shows it in both slots
          </Kicker>
        </div>
      </Sample>

      <Sample
        name="badges"
        label="badges · the drawn family, resolution badges beside the disc lockup, one level line"
      >
        <div className="space-y-3">
          <Kicker>
            the HDR10 / HDR10+ artwork at the md badge height, beside the drawn
            badge that stands in for it
          </Kicker>
          <div className="flex flex-wrap items-center gap-2.5">
            <Mark id="hdr10" em={0.9} />
            <Mark id="hdr10-plus" em={0.9} />
            <PictureChip resolution="720p" range="hdr10" />
            <PictureChip resolution="720p" range="hdr10-plus" />
          </div>
          <Kicker>
            md · the resolution badges are the disc-case badge drawn in the
            family, beside the Ultra HD Blu-ray lockup; HDR10 · HDR10+ · HLG ·
            AAC · 2.0 · 7.1 · Remux · WEB-DL are one-line drawn badges
          </Kicker>
          <div className="flex flex-wrap items-center gap-2.5">
            <PictureChip resolution="2160p" range="hdr10" />
            <TierChip tier="bluray" resolution="2160p" />
            <PictureChip resolution="4320p" range="hdr10-plus" />
            <PictureChip resolution="1080p" range="hlg" />
            <PictureChip resolution="720p" />
            <PictureChip resolution="sd" />
            <SoundChip audio={{ codec: "aac", channels: "2.0" }} />
            <SoundChip audio={{ codec: "dts-hd-ma", channels: "7.1" }} />
            <TierChip tier="remux" />
            <TierChip tier="webdl" />
          </div>
          <Kicker>sm · the same row on the poster rung</Kicker>
          <div className="flex flex-wrap items-center gap-1.5">
            <PictureChip resolution="2160p" range="hdr10" size="sm" />
            <PictureChip resolution="4320p" range="hdr10-plus" size="sm" />
            <PictureChip resolution="1080p" range="hlg" size="sm" />
            <PictureChip resolution="720p" size="sm" />
            <PictureChip resolution="sd" size="sm" />
            <SoundChip audio={{ codec: "aac", channels: "2.0" }} size="sm" />
            <SoundChip
              audio={{ codec: "dts-hd-ma", channels: "7.1" }}
              size="sm"
            />
            <TierChip tier="remux" size="sm" />
            <TierChip tier="webdl" size="sm" />
          </div>
        </div>
      </Sample>

      <Sample
        name="emphasis"
        label="emphasis · light, never geometry: ghost, plain, lit, vivid"
      >
        <div className="space-y-3">
          {EMPHASES.map((emphasis) => (
            <div key={emphasis} className="flex items-center gap-4">
              <div className="w-20 font-mono text-muted-foreground text-xs">
                {emphasis}
              </div>
              <Row emphasis={emphasis} />
            </div>
          ))}
        </div>
      </Sample>

      <Sample
        name="size"
        label="size · sm on a poster, md on a rail, lg where the chip is looked at"
      >
        <div className="flex flex-wrap items-start gap-8">
          <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-lg bg-[linear-gradient(160deg,#5b6a7a,#0b0b0e_55%,#3a2a1a)]">
            <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1.5">
              <PictureChip resolution="2160p" range="dolby-vision" size="sm" />
              <SoundChip audio={SOUNDS[0] as Audio} size="sm" />
              <LangChip lang="es-ES" size="sm" emphasis="ghost" />
            </div>
          </div>
          <div className="space-y-3">
            <Kicker>sm · brand symbols and the small badges</Kicker>
            <Row emphasis="plain" size="sm" />
            <Kicker>md · lockups, the whole spec</Kicker>
            <Row emphasis="plain" size="md" />
            <Kicker>lg · the same, for a hero</Kicker>
            <Row emphasis="plain" size="lg" />
            <Kicker>
              marks=&quot;symbol&quot; · lockups become symbols at any rung: the
              corner recipe at lg, in gold
            </Kicker>
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#151515] px-4 py-3">
              <PictureChip
                resolution="2160p"
                range="dolby-vision"
                size="lg"
                marks="symbol"
                tone="gold"
              />
              <SoundChip
                audio={{ object: "atmos" }}
                size="lg"
                marks="symbol"
                tone="gold"
              />
              <SoundChip
                audio={{ codec: "dts-hd-ma" }}
                size="lg"
                marks="symbol"
                tone="gold"
              />
              <TierChip
                tier="remux"
                resolution="2160p"
                size="lg"
                marks="symbol"
                tone="gold"
              />
            </div>
          </div>
        </div>
      </Sample>

      <Sample
        name="trailing"
        label="trailing · the slot after an axis takes anything"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <PictureChip resolution="2160p" range="hdr10" trailing="▲" />
          <SoundChip audio={SOUNDS[3] as Audio} trailing="=" />
          <TierChip
            tier="webdl"
            trailing={<span className="font-mono text-[10px]">×3</span>}
          />
          <LangChip lang="fr" trailing="·" />
        </div>
      </Sample>

      <Sample
        name="spec"
        label="MediaSpec · one strip per file, the axes set apart"
        with="files"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Kicker>the disc · click the cut to restate it</Kicker>
            <MediaSpec {...DISC} cut={undefined} />
            <CutChip cut={cut} onClick={nextCut} detail="click to restate" />
          </div>
          <div className="space-y-1">
            <Kicker>the dub · the language ghosted</Kicker>
            <span className="inline-flex flex-wrap items-center gap-2.5">
              <MediaSpec {...DUB} omit={["lang"]} />
              <LangChip lang={DUB.lang} emphasis="ghost" />
            </span>
          </div>
          <div className="space-y-1">
            <Kicker>the small one · vivid</Kicker>
            <MediaSpec {...SMALL} emphasis="vivid" />
          </div>
          <div className="space-y-1">
            <Kicker>
              the disc in brand tone · the marks take their official colours
            </Kicker>
            <MediaSpec {...DISC} tone="brand" />
            <MediaSpec {...DISC} emphasis="ghost" tone="brand" />
            <MediaSpec
              {...DISC}
              emphasis="lit"
              tone="brand"
              omit={["lang", "cut"]}
            />
          </div>
          <div className="space-y-1">
            <Kicker>on the poster · sm, picture and sound only</Kicker>
            <MediaSpec {...DISC} size="sm" omit={["tier", "lang", "cut"]} />
          </div>
        </div>
      </Sample>

      <Sample
        name="recipes"
        label="recipes · what the generic ergonomics allow"
        with="scale compare"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Kicker>a scale of certainty · the ladder is yours to name</Kicker>
            {(Object.keys(EMPHASIS_FOR) as (keyof typeof EMPHASIS_FOR)[]).map(
              (step) => (
                <div key={step} className="flex items-center gap-4">
                  <div className="w-20 font-mono text-muted-foreground text-xs">
                    {step}
                  </div>
                  <MediaSpec
                    {...DUB}
                    emphasis={EMPHASIS_FOR[step]}
                    omit={["lang", "cut"]}
                  />
                </div>
              ),
            )}
          </div>
          <div className="space-y-1.5">
            <Kicker>
              comparing against what you have · the slot takes anything
            </Kicker>
            <div className="flex items-center gap-4">
              <div className="w-20 font-mono text-muted-foreground text-xs">
                have
              </div>
              <MediaSpec {...DUB} omit={["lang", "cut"]} />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 font-mono text-muted-foreground text-xs">
                offered
              </div>
              <MediaSpec
                {...DISC}
                emphasis="ghost"
                omit={["lang", "cut"]}
                adornments={{
                  picture: VERDICT.picture,
                  sound: VERDICT.sound,
                  tier: (
                    <span className="font-mono text-[10px]">
                      {VERDICT.tier} +38 GB
                    </span>
                  ),
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Kicker>your own words · a label override per tag</Kicker>
            <div className="flex flex-wrap items-center gap-2.5">
              <LangChip lang="fr-CA" label="Québécois" />
              <LangChip lang="de-CH" label="Swiss German" />
              <LangChip lang="pt-BR" label="Brazilian" />
              <LangChip lang="es-ES" label="Peninsular" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Kicker>
              a poster corner · two marks over art: the sticker and one symbol
            </Kicker>
            <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_70%_30%,rgb(255_255_255/.22),transparent_45%),linear-gradient(160deg,#5a1f4a,#1a1030_55%,#08070c)]">
              <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(to_bottom,rgb(0_0_0/.6),transparent)]" />
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                <PictureChip
                  resolution="2160p"
                  range="dolby-vision"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Kicker>a premium shelf · the gold tone, on a dark ground</Kicker>
            <div className="rounded-lg bg-[#151515] px-4 py-3">
              <MediaSpec {...DISC} tone="gold" omit={["lang", "cut"]} />
            </div>
          </div>
        </div>
      </Sample>

      <Sample
        name="gold"
        label="gold · the disc-case stickers in metal, the brand marks in ink beside them"
      >
        <div className="space-y-4 rounded-lg bg-[#151515] px-5 py-4 text-[#e6e4ee]">
          <Kicker>
            md · the drawn family takes the metal (a 135° gradient on hairline
            frames); Dolby, Blu-ray and every other brand mark stay in ink, as
            disc cases print them
          </Kicker>
          <MediaSpec {...DISC} tone="gold" omit={["lang", "cut"]} />
          <Kicker>sm · flat mid gold: a gradient at 8px is noise</Kicker>
          <MediaSpec {...DISC} tone="gold" size="sm" omit={["lang", "cut"]} />
          <Kicker>the ladder in gold · ghost, plain, lit, vivid</Kicker>
          {EMPHASES.map((emphasis) => (
            <MediaSpec
              key={emphasis}
              {...DISC}
              tone="gold"
              emphasis={emphasis}
              omit={["lang", "cut"]}
            />
          ))}
          <Kicker>the flag stays itself</Kicker>
          <MediaSpec {...DUB} tone="gold" />
        </div>
      </Sample>

      <Sample
        name="foreign-palette"
        label="a consumer's own palette · hex inks, no tokens"
      >
        <div
          className="space-y-3 rounded-lg p-4 text-[#e6e4ee]"
          style={
            {
              background: "#0b0b0e",
              "--ag-media-picture": "#6cb8f0",
              "--ag-media-sound": "#e8b13d",
              "--ag-media-tier": "#e6e4ee",
              "--ag-media-lang": "#e8b13d",
              "--ag-media-cut": "#9c9aa8",
            } as React.CSSProperties
          }
        >
          {EMPHASES.map((emphasis) => (
            <Row key={emphasis} emphasis={emphasis} />
          ))}
        </div>
      </Sample>

      <Sample name="fallback" label="nothing set · monochrome by design">
        <p className="max-w-prose text-[0.9375rem] text-foreground/70 leading-relaxed">
          A file that is <PictureChip resolution="2160p" range="hdr10" /> with{" "}
          <SoundChip audio={{ codec: "dts-hd-ma", channels: "5.1" }} /> from a{" "}
          <TierChip tier="bluray" /> reads in the paragraph&apos;s own ink, told
          apart from a <PictureChip resolution="1080p" emphasis="ghost" /> by
          presence alone.
        </p>
      </Sample>

      <p className="max-w-prose text-[0.9375rem] text-foreground/70 leading-relaxed">
        The claim this page makes: the vocabulary is typed and the chip owns its
        marks ({KINDS.map((k) => KIND_LABEL[k]).join(" · ")}), artwork comes
        first and a drawn badge stands in only where none exists, the emphasis
        ladder and the trailing slot carry whatever a consumer means by them,
        and the same chips render under a palette that never installed the
        tokens. Dolby, DTS, HDR10+, Blu-ray, DVD and IMAX are their owners&apos;
        trademarks, worn here nominatively to say what a file carries, never to
        claim a certification; the artwork and its origins are in the
        repo&apos;s references.
      </p>
    </div>
  )
}
