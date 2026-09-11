"use client"

import { useState } from "react"
import { Sample } from "@/app/samples"
import {
  AUDIO_CODECS,
  type Audio,
  type Cut,
  CutChip,
  type Delta,
  isLossless,
  KINDS,
  LangChip,
  MediaSpec,
  PictureChip,
  PROVENANCES,
  type Provenance,
  RANGES,
  RESOLUTIONS,
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

// #region copies
// Three copies of one film as a library would hold them: the disc, the web rip that
// carries the dub, and the transcode the television is playing right now.
const REMUX = {
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
const PLAYING = {
  resolution: "2160p",
  range: "hdr10",
  audio: { codec: "flac", channels: "5.1" },
} as const
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

/** One row of every kind at one provenance: the strip a copy card wears. */
function Row({
  provenance,
  size,
}: {
  provenance: Provenance
  size?: "sm" | "md"
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <PictureChip
        resolution="2160p"
        range="dolby-vision"
        provenance={provenance}
        size={size}
      />
      <SoundChip
        audio={SOUNDS[0] as Audio}
        provenance={provenance}
        size={size}
      />
      <TierChip tier="remux" provenance={provenance} size={size} />
      <LangChip lang="es-ES" provenance={provenance} size={size} />
      <CutChip cut="extended" provenance={provenance} size={size} />
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
              className="flex flex-wrap items-center gap-1.5"
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
          <div className="flex flex-wrap items-center gap-1.5">
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
          <div className="flex flex-wrap items-center gap-1.5">
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
          <div className="flex flex-wrap items-center gap-1.5">
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
          <div className="flex flex-wrap items-center gap-1.5">
            {["es-ES", "es-419", "en", "fr", "ja"].map((lang) => (
              <LangChip key={lang} lang={lang} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
        name="provenance"
        label="provenance · on the mark: ghosted, full ink, washed, washed and ringed"
      >
        <div className="space-y-3">
          {PROVENANCES.map((provenance) => (
            <div key={provenance} className="flex items-center gap-4">
              <div className="w-20 font-mono text-muted-foreground text-xs">
                {provenance}
              </div>
              <Row provenance={provenance} />
            </div>
          ))}
        </div>
      </Sample>

      <Sample name="size" label="size · sm on a poster, md on a rail">
        <div className="flex flex-wrap items-start gap-8">
          <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-lg bg-[linear-gradient(160deg,#5b6a7a,#0b0b0e_55%,#3a2a1a)]">
            <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
              <PictureChip resolution="2160p" range="dolby-vision" size="sm" />
              <SoundChip audio={SOUNDS[0] as Audio} size="sm" />
              <LangChip lang="es-ES" size="sm" provenance="claim" />
            </div>
          </div>
          <div className="space-y-3">
            <Kicker>sm · brand symbols and the small badges</Kicker>
            <Row provenance="verified" size="sm" />
            <Kicker>md · lockups, the whole spec</Kicker>
            <Row provenance="verified" size="md" />
          </div>
        </div>
      </Sample>

      <Sample
        name="badges"
        label="badges · artwork beside the drawn badge, one row, both rungs"
      >
        <div className="space-y-3">
          <Kicker>
            md · HDR10 and HDR10+ are artwork, 4K / 8K / HD / SD are tabler's
            badges, HLG · 720p · 7.1 · Remux · WEB-DL are drawn
          </Kicker>
          <div className="flex flex-wrap items-center gap-2.5">
            <PictureChip resolution="2160p" range="hdr10" />
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

      <Sample name="delta" label="delta · a candidate against the copy you own">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-24 text-muted-foreground">owned</span>
            <MediaSpec {...DUB} provenance="verified" omit={["lang", "cut"]} />
          </div>
          {(
            [
              [
                "better",
                {
                  ...REMUX,
                  deltas: {
                    picture: "better",
                    sound: "better",
                    tier: "better",
                  },
                },
              ],
              [
                "same",
                {
                  ...DUB,
                  deltas: { picture: "same", sound: "same", tier: "same" },
                },
              ],
              [
                "worse",
                {
                  resolution: "720p",
                  range: "sdr",
                  audio: { codec: "aac", channels: "2.0" },
                  tier: "webrip",
                  deltas: { picture: "worse", sound: "worse", tier: "worse" },
                },
              ],
            ] as const
          ).map(([name, spec]) => (
            <div key={name} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 text-muted-foreground">
                {name as Delta}
              </span>
              <MediaSpec {...spec} provenance="claim" omit={["lang", "cut"]} />
            </div>
          ))}
        </div>
      </Sample>

      <Sample
        name="spec"
        label="MediaSpec · a copy card, a poster, what is playing"
        with="copies"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Kicker>
              the disc · verified from the container · click the cut to restate
              it
            </Kicker>
            <MediaSpec {...REMUX} cut={undefined} provenance="verified" />
            <CutChip
              cut={cut}
              onClick={nextCut}
              detail="click to restate the cut"
            />
          </div>
          <div className="space-y-1">
            <Kicker>
              the dub · the container states the picture, the name only promises
              the language
            </Kicker>
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <MediaSpec {...DUB} provenance="verified" omit={["lang"]} />
              <LangChip
                lang={DUB.lang}
                provenance="claim"
                detail="promised by the release name, unheard"
              />
            </span>
          </div>
          <div className="space-y-1">
            <Kicker>what the television gets · delivered</Kicker>
            <MediaSpec {...PLAYING} provenance="delivered" />
          </div>
          <div className="space-y-1">
            <Kicker>
              the same disc in brand tone · the marks take their official
              colours, the text keeps the ink
            </Kicker>
            <MediaSpec {...REMUX} provenance="verified" tone="brand" />
            <MediaSpec {...REMUX} provenance="claim" tone="brand" />
            <MediaSpec
              {...REMUX}
              provenance="measured"
              tone="brand"
              omit={["lang", "cut"]}
            />
          </div>
          <div className="space-y-1">
            <Kicker>on the poster · sm, picture and sound only</Kicker>
            <MediaSpec {...REMUX} size="sm" omit={["tier", "lang", "cut"]} />
          </div>
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
              "--ag-media-better": "#43d17c",
              "--ag-media-worse": "#f4655f",
              "--ag-media-on-ink": "#0b0b0e",
            } as React.CSSProperties
          }
        >
          {PROVENANCES.map((provenance) => (
            <Row key={provenance} provenance={provenance} />
          ))}
          <MediaSpec
            {...REMUX}
            provenance="claim"
            deltas={{ picture: "better", sound: "better", tier: "worse" }}
          />
        </div>
      </Sample>

      <Sample name="fallback" label="nothing set · monochrome by design">
        <p className="max-w-prose text-[0.9375rem] text-foreground/70 leading-relaxed">
          A copy that is <PictureChip resolution="2160p" range="hdr10" /> with{" "}
          <SoundChip audio={{ codec: "dts-hd-ma", channels: "5.1" }} /> from a{" "}
          <TierChip tier="bluray" /> reads in the paragraph&apos;s own ink, told
          apart from a <PictureChip resolution="1080p" provenance="claim" />{" "}
          promise by fill alone.
        </p>
      </Sample>

      <p className="max-w-prose text-[0.9375rem] text-foreground/70 leading-relaxed">
        The claim this page makes: the vocabulary is typed and the chip owns its
        marks ({KINDS.map((k) => KIND_LABEL[k]).join(" · ")}), artwork comes
        first and a drawn badge stands in only where none exists, provenance
        reads on the mark without a legend, and the same chips render under a
        palette that never installed the tokens. Which of two values is better
        is not a question a chip answers: the order of the ladder belongs to the
        app. Dolby, DTS, HDR10+, Blu-ray, DVD and IMAX are their owners&apos;
        trademarks, worn here nominatively to say what a copy carries, never to
        claim a certification; the artwork and its origins are in the
        repo&apos;s references.
      </p>
    </div>
  )
}
