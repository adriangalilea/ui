"use client"

import { Sample } from "@/app/samples"
import artJson from "@/public/macos/awake/art.json"
import heroJson from "@/public/macos/awake/hero.json"
import {
  type Art,
  sceneClock,
  type Timeline,
} from "@/registry/base-nova/lib/macos-session"
import { ClaudeCode } from "@/registry/base-nova/ui/claude-code"
import { Codex } from "@/registry/base-nova/ui/codex"
import { Macos } from "@/registry/base-nova/ui/macos"
import { Player } from "@/registry/base-nova/ui/player"

// #region macos
const HERO = heroJson as Timeline
const CLOCK = sceneClock(HERO)
const AGENTS = { claude: ClaudeCode, codex: Codex }
// #endregion

export default function PlayerDemo() {
  return (
    <Sample
      name="macos"
      label="a macos stage · its captions are the chapters"
      with="macos"
    >
      <Player clip={CLOCK.clip} label="awake's hero scene">
        <Macos
          timeline={HERO}
          art={artJson as Art}
          agents={AGENTS}
          accent="#e7a13c"
          device="macbook"
          alt="awake: Claude Code at work, ⌃⌥⌘A keeps the Mac awake, the lid closes, the work gets done"
        />
      </Player>
    </Sample>
  )
}
