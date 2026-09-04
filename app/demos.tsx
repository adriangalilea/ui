// Every registry item and its demo, by name. The [item] route renders from here; the
// validator checks every registry.json item is listed.
import type { ComponentType } from "react"
import TelegramSummary from "@/registry/base-nova/blocks/telegram-summary/telegram-summary.demo"
import LightboxActions from "@/registry/base-nova/lib/lightbox-actions.demo"
import LightboxMotion from "@/registry/base-nova/lib/lightbox-motion.demo"
import SessionDsl from "@/registry/base-nova/lib/session-dsl.demo"
import Tokens from "@/registry/base-nova/theme/tokens.demo"
import Lightbox from "@/registry/base-nova/ui/lightbox.demo"
import Reveal from "@/registry/base-nova/ui/reveal.demo"
import Scrims from "@/registry/base-nova/ui/scrims.demo"
import ScrollStage from "@/registry/base-nova/ui/scroll-stage.demo"
import TelegramChat from "@/registry/base-nova/ui/telegram-chat.demo"
import Terminal from "@/registry/base-nova/ui/terminal.demo"

export const DEMOS: Record<string, ComponentType> = {
  tokens: Tokens,
  "session-dsl": SessionDsl,
  "scroll-stage": ScrollStage,
  reveal: Reveal,
  scrims: Scrims,
  terminal: Terminal,
  "telegram-chat": TelegramChat,
  "telegram-summary": TelegramSummary,
  "lightbox-motion": LightboxMotion,
  "lightbox-actions": LightboxActions,
  lightbox: Lightbox,
}
