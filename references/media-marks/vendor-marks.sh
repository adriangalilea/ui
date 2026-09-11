#!/usr/bin/env sh
# Fetch every media mark from its source into ./marks/<axis>/<slug>.svg.
# The repository holds the NORMALISED files; this refetches the raw originals.
# See SOURCES.md for licences, the trademark stance and what has no free vector.
#
# Wikimedia Commons throttles bursts and anonymous agents (HTTP 429). This script
# names itself per the Wikimedia User-Agent policy and pauses between Commons calls.
set -eu
out="${1:-marks}"
ua="${MARKS_UA:-media-marks/1.0 (https://github.com/adriangalilea/ui)}"
pause="${MARKS_PAUSE:-1.5}"

C="https://commons.wikimedia.org/wiki/Special:FilePath"
SI="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons"
IC="https://api.iconify.design"
XIPH="https://wiki.xiph.org/images"
FLAGS="https://raw.githubusercontent.com/lipis/flag-icons/main/flags"
CIRCLE="https://raw.githubusercontent.com/HatScripts/circle-flags/gh-pages/flags"

get() { # get <axis> <slug> <url>
  mkdir -p "$out/$1"
  printf '%-11s %-20s ' "$1" "$2"
  if curl -fsSL -A "$ua" --retry 3 --retry-delay 5 -o "$out/$1/$2.svg" "$3"; then echo ok; else echo FAIL; fi
  case "$3" in "$C"*) sleep "$pause" ;; esac
}

# dynamic range
get hdr        dolby-vision       "$C/Dolby%20Vision%202021%20logo.svg"
get hdr        hdr10plus          "$C/HDR%2010%20plus%20logo%20(black).svg"
get hdr        hdr10              "$C/HDR%2010%20logo%20(black).svg"        # fan-drawn; no official HDR10 mark exists

# resolution
get resolution ultra-hd           "$C/Ultra%20HD.svg"                        # wordmark; the CTA badges are member-only

# sound
get sound      dolby              "$SI/dolby.svg"                            # double-D symbol, CC0
get sound      dolby-atmos        "$C/Logo%20Dolby%20Atmos.svg"
get sound      dolby-truehd       "$C/Dolby%20TrueHD.svg"
get sound      dolby-digital-plus "$C/Dolby-Digital-Plus.svg"
get sound      dolby-digital      "$C/Logo%20Dolby-Digital%202011.svg"
get sound      dts                "$SI/dts.svg"                              # wordmark symbol, CC0
get sound      dts-2020           "$C/DTS%20(2020).svg"
get sound      dts-hd-ma          "$C/DTS-HD-MA.svg"
get sound      flac               "$XIPH/f/fc/FLAC_Logo.svg"
get sound      opus               "$XIPH/7/7f/Opus-Logo.svg"

# source tier
get source     blu-ray            "$C/Blu-ray%20Disc.svg"
get source     ultra-hd-blu-ray   "$C/Ultra%20HD%20Blu-ray%20logo.svg"
get source     dvd                "$C/DVD%20logo.svg"

# cut
get cut        imax               "$C/IMAX.svg"

# language
get lang       es                 "$FLAGS/4x3/es.svg"
get lang       es-1x1             "$FLAGS/1x1/es.svg"
get lang       es-circle          "$CIRCLE/es.svg"

# generic glyphs for values with no brand (MIT / Apache-2.0)
get glyph      badge-4k           "$IC/tabler/badge-4k.svg"
get glyph      badge-8k           "$IC/tabler/badge-8k.svg"
get glyph      badge-hd           "$IC/tabler/badge-hd.svg"
get glyph      badge-sd           "$IC/tabler/badge-sd.svg"

# Deliberately absent: Iconify cbi:* (dts-x, dolby-atmos, bluray, dvd) is CC BY-NC-SA
# and cannot ride a public registry; see SOURCES.md.
