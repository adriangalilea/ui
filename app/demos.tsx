// Every registry item and its demo, by name. The [item] route renders from here; the
// validator checks every registry.json item is listed.
import type { ComponentType } from "react"
import TelegramSummary from "@/registry/base-nova/blocks/telegram-summary/telegram-summary.demo"
import LightboxActions from "@/registry/base-nova/lib/lightbox-actions.demo"
import LightboxMotion from "@/registry/base-nova/lib/lightbox-motion.demo"
import TerminalSession from "@/registry/base-nova/lib/terminal-session.demo"
import Tokens from "@/registry/base-nova/theme/tokens.demo"
import Code from "@/registry/base-nova/ui/code.demo"
import Copy from "@/registry/base-nova/ui/copy.demo"
import Lightbox from "@/registry/base-nova/ui/lightbox.demo"
import Reveal from "@/registry/base-nova/ui/reveal.demo"
import Scrims from "@/registry/base-nova/ui/scrims.demo"
import ScrollStage from "@/registry/base-nova/ui/scroll-stage.demo"
import TelegramChat from "@/registry/base-nova/ui/telegram-chat.demo"
import Terminal from "@/registry/base-nova/ui/terminal.demo"
import ThemeToggle from "@/registry/base-nova/ui/theme-toggle.demo"

export const DEMOS: Record<string, ComponentType> = {
  tokens: Tokens,
  "terminal-session": TerminalSession,
  "scroll-stage": ScrollStage,
  code: Code,
  copy: Copy,
  reveal: Reveal,
  scrims: Scrims,
  terminal: Terminal,
  "theme-toggle": ThemeToggle,
  "telegram-chat": TelegramChat,
  "telegram-summary": TelegramSummary,
  "lightbox-motion": LightboxMotion,
  "lightbox-actions": LightboxActions,
  lightbox: Lightbox,
}
