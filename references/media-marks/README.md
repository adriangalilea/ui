# Media marks: where every vector came from

The brand marks the media-spec chips wear (web: `@ag/media-spec`, Swift: `MediaSpec`),
how they were sourced, what could not be sourced, and how to fetch them again.
Every mark here is artwork that is free to vendor; the names and shapes are
registered trademarks of their owners and are used nominatively: a chip says what a
file contains, it never implies certification by Dolby, DTS, IMAX or the Blu-ray
Disc Association.

## Sources

| Source | What it gave us | Licence | How to fetch |
|---|---|---|---|
| Wikimedia Commons | Dolby Vision, Dolby Atmos, Dolby TrueHD, Dolby Digital, Dolby Digital Plus, DTS (2020), DTS-HD Master Audio, HDR10, HDR10+, Blu-ray Disc, Ultra HD Blu-ray, DVD, IMAX, Ultra HD wordmark | PD-textlogo "with trademark": the artwork is below the threshold of originality, the mark is registered | `https://commons.wikimedia.org/wiki/Special:FilePath/<File name>.svg`. Search with the MediaWiki API: `api.php?action=query&list=search&srnamespace=6&srsearch=<q> filemime:image/svg+xml`. Licence per file: `prop=imageinfo&iiprop=extmetadata` → `LicenseShortName`. |
| simple-icons | Dolby double-D, dts wordmark (the poster-rung symbols) and their official hexes | CC0 | `https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/<slug>.svg`; hexes in `.../data/simple-icons.json` (brands keyed by title, slug derived). Also on jsDelivr: `cdn.jsdelivr.net/npm/simple-icons@latest/icons/<slug>.svg`. |
| Xiph.Org wiki | FLAC and Opus logos, the projects' own files | Xiph project logos, free to use | `https://wiki.xiph.org/images/f/fc/FLAC_Logo.svg`, `https://wiki.xiph.org/images/7/7f/Opus-Logo.svg` |
| lipis/flag-icons | Spain flag (4:3 and 1:1) | MIT | `https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/es.svg` |
| HatScripts/circle-flags | Spain as a circle; a language-keyed `es-mx` exists | MIT | `https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags/es.svg` (and `flags/language/es-mx.svg`) |
| Iconify API (tabler, mdi) | Generic glyphs: `badge-4k`, `badge-8k`, `badge-hd`, `badge-sd`, `hdr`, `surround-sound`, `disc` | tabler MIT, mdi Apache-2.0 | `https://api.iconify.design/tabler/badge-4k.svg`, `https://api.iconify.design/mdi/disc.svg` |

### Wikimedia Commons: rate limits and etiquette

Commons answers **HTTP 429** to a burst of anonymous requests and to any request
without a descriptive User-Agent. Both the FilePath redirect and the API throttle.
What works:

- Send a User-Agent naming the project and a contact, per the
  [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy):
  `<project>/<version> (<repository URL>)`. The repository URL is the contact.
- One request per second or slower. A loop over twenty files with no pause gets
  throttled after the first two or three.
- Resolve the real upload URL through the API (`prop=imageinfo&iiprop=url`) rather
  than guessing file names; a guessed name is a 404 that looks like a throttle.
- Do not fetch in CI. Fetch once, commit the normalised file, and record the source
  here. A build that reaches for Commons is a build that fails on a 429.

### simple-icons and Iconify

Neither throttles at this volume. simple-icons removes brands on request from the
owner (IMAX was removed), so a slug that existed can vanish: the committed file is
the record, not the CDN.

## What could not be sourced as a free vector

| Mark | Why | What the chip does |
|---|---|---|
| DTS:X | The only vector anywhere is Iconify's `cbi:dts-x`, CC BY-NC-SA 4.0. Non-commercial terms cannot ride a public registry. | The dts wordmark plus `:X` set in the chip's type, which is the shape of the real mark. |
| DTS-HD High Resolution | No vector on Commons, simple-icons or Iconify. | dts symbol plus text. |
| CTA "4K Ultra HD" and "8K Ultra HD" badges | Member-only logo programme. Commons' `Ultra HD - Logo.svg` is the DIGITALEUROPE mark, a two-tone box that cannot be drawn in one ink. | The Ultra HD wordmark at the rail, tabler `badge-4k` / `badge-8k` on posters. |
| UHD Alliance "Ultra HD Premium" | Members only, by request. | Not represented. |
| IMAX Enhanced | Partner login on brand.imax.com. | The IMAX wordmark. |
| HDR10, HLG | No official mark exists; HDR10 is a spec, HLG a broadcast standard. Commons carries a fan-drawn HDR10 badge that matches the HDR10+ one. | HDR10 badge (fan-drawn, PD), HLG as text. |
| es-419 (Latin American Spanish) | No flag can stand for a continent; the `es-mx` language flag is the convention and is wrong for the house. | Text: `latino`. |

Non-commercial material seen and deliberately not vendored: Iconify `cbi:*`
(dts-x, dolby-atmos, bluray, dvd; CC BY-NC-SA 4.0), the Aeon Nox SiLVO and Arctic
Fuse 3 Kodi skins' flag packs (CC BY-NC-SA; the widest coverage anywhere, useful
only to see how they solved the small rung), and Kometa's default overlays (MIT, but
305×105 PNG pills with text-only source tiers, so nothing to vendor).

## Normalisation

Every vendored file is a single ink so the chip can recolour it:

1. Strip the XML prolog, comments, `<metadata>`, `<title>`, editor namespaces.
2. Drop `width`/`height` on the root, keep or synthesise `viewBox`.
3. Put `fill="currentColor"` on the root; shapes with no fill inherit it. Rewrite every
   explicit fill or stroke colour to `currentColor`; `none` stays.
4. Remove full-canvas backgrounds (a rect or rectangular path covering 95 % of the
   viewBox). Two-tone marks that put white letters on a black box cannot survive this
   and are not vendored (the older DTS badge, the DIGITALEUROPE Ultra HD box).
5. Flags keep their colours; they are not marks and never take the ink.

A symbol for the poster rung is either the brand's own symbol (Dolby double-D, dts) or a
glyph cut from the lockup (the Blu-ray swirl, split from `Blu-ray Disc.svg` with a tight
viewBox).

## Refetch

`vendor-marks.sh` beside this file fetches every source above into `./marks/<axis>/`
with a compliant User-Agent and a pause between Commons requests. Run it only to refresh
a source; the normalised files in the repository are the artefacts of record.

## The files in this folder

What `scripts/media-marks.ts` reads (`mise marks`) to generate
`registry/base-nova/ui/media-spec-marks.tsx`; `manifest.json` maps each mark to its
symbol and lockup file, its official hex and the chip composition rules. Every file is
already normalised as described above.

| file | mark | origin |
| --- | --- | --- |
| `dolby-symbol.svg` | Dolby double-D | simple-icons `dolby` (CC0) |
| `dts-symbol.svg` | dts | simple-icons `dts` (CC0) |
| `Dolby_Vision_2021_logo.svg` | Dolby Vision | Commons, File:Dolby Vision 2021 logo.svg |
| `Logo_Dolby_Atmos.svg` | Dolby Atmos | Commons, File:Logo Dolby Atmos.svg |
| `Dolby_TrueHD.svg` | Dolby TrueHD | Commons, File:Dolby TrueHD.svg |
| `Dolby-Digital-Plus.svg` | Dolby Digital Plus | Commons, File:Dolby-Digital-Plus.svg |
| `Logo_Dolby-Digital_2011.svg` | Dolby Digital | Commons, File:Logo Dolby-Digital 2011.svg |
| `DTS_2020_.svg` | dts (2020 wordmark) | Commons, File:DTS (2020).svg |
| `DTS-HD-MA.svg` | DTS-HD Master Audio | Commons, File:DTS-HD-MA.svg |
| `HDR_10_logo_black_.svg` | HDR10 (fan-drawn badge) | Commons, File:HDR 10 logo (black).svg |
| `HDR_10_plus_logo_black_.svg` | HDR10+ | Commons, File:HDR 10 plus logo (black).svg |
| `Ultra_HD.svg` | Ultra HD wordmark | Commons, File:Ultra HD.svg |
| `FLAC_logo_vector.svg` | FLAC | Commons, File:FLAC logo vector.svg (Xiph) |
| `Opus_logo2.svg` | Opus | Commons, File:Opus logo2.svg (Xiph) |
| `Blu-ray_Disc.svg` | Blu-ray Disc | Commons, File:Blu-ray Disc.svg |
| `bluray-symbol.svg` | the Blu-ray glyph | the two disc paths of `Blu-ray_Disc.svg`, re-boxed |
| `Ultra_HD_Blu-ray_logo.svg` | Ultra HD Blu-ray | Commons, File:Ultra HD Blu-ray logo.svg |
| `DVD_logo.svg` | DVD | Commons, File:DVD logo.svg |
| `IMAX.svg` | IMAX | Commons, File:IMAX.svg |
| `Flag_of_Spain_civil_.svg` | Spain, civil flag without arms | Commons, File:Flag of Spain (civil).svg |
| `badge-4k.svg` | 4K badge (stroke) | tabler icons `badge-4k` via Iconify (MIT) |
| `badge-8k.svg` | 8K badge (stroke) | tabler icons `badge-8k` via Iconify (MIT) |
| `badge-hd.svg` | HD badge (stroke) | tabler icons `badge-hd` via Iconify (MIT) |
| `badge-sd.svg` | SD badge (stroke) | tabler icons `badge-sd` via Iconify (MIT) |
