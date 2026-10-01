// Every registry item and its demo, by name. The [item] route renders from here; the
// validator checks every registry.json item is listed.
import type { ComponentType } from "react"
import TelegramSummary from "@/registry/base-nova/blocks/telegram-summary/telegram-summary.demo"
import AgentSession from "@/registry/base-nova/lib/agent-session.demo"
import Clip from "@/registry/base-nova/lib/clip.demo"
import Keys from "@/registry/base-nova/lib/keys.demo"
import LightboxActions from "@/registry/base-nova/lib/lightbox-actions.demo"
import LightboxMotion from "@/registry/base-nova/lib/lightbox-motion.demo"
import MacosSession from "@/registry/base-nova/lib/macos-session.demo"
import Media from "@/registry/base-nova/lib/media-asset.demo"
import PersonDemo from "@/registry/base-nova/lib/person.demo"
import PrepareMedia from "@/registry/base-nova/lib/prepare-media.demo"
import QuoteCard from "@/registry/base-nova/lib/quote-card.demo"
import TerminalSession from "@/registry/base-nova/lib/terminal-session.demo"
import WebPreviewUnfurl from "@/registry/base-nova/lib/web-preview-unfurl.demo"
import Tokens from "@/registry/base-nova/theme/tokens.demo"
import Avatar from "@/registry/base-nova/ui/avatar.demo"
import CardGallery from "@/registry/base-nova/ui/card-gallery.demo"
import CardLink from "@/registry/base-nova/ui/card-link.demo"
import ClaudeCode from "@/registry/base-nova/ui/claude-code.demo"
import Code from "@/registry/base-nova/ui/code.demo"
import Codex from "@/registry/base-nova/ui/codex.demo"
import Copy from "@/registry/base-nova/ui/copy.demo"
import DeviceFrame from "@/registry/base-nova/ui/device-frame.demo"
import Editor from "@/registry/base-nova/ui/editor.demo"
import Github from "@/registry/base-nova/ui/github.demo"
import Image from "@/registry/base-nova/ui/image.demo"
import Kbd from "@/registry/base-nova/ui/kbd.demo"
import Lightbox from "@/registry/base-nova/ui/lightbox.demo"
import LiquidGlass from "@/registry/base-nova/ui/liquid-glass.demo"
import Macos from "@/registry/base-nova/ui/macos.demo"
import MediaSpec from "@/registry/base-nova/ui/media-spec.demo"
import Player from "@/registry/base-nova/ui/player.demo"
import Playhead from "@/registry/base-nova/ui/playhead.demo"
import PreviewPicker from "@/registry/base-nova/ui/preview-picker.demo"
import Quote from "@/registry/base-nova/ui/quote.demo"
import Reveal from "@/registry/base-nova/ui/reveal.demo"
import Scrims from "@/registry/base-nova/ui/scrims.demo"
import ScrollStage from "@/registry/base-nova/ui/scroll-stage.demo"
import TelegramChat from "@/registry/base-nova/ui/telegram-chat.demo"
import Terminal from "@/registry/base-nova/ui/terminal.demo"
import ThemeToggle from "@/registry/base-nova/ui/theme-toggle.demo"
import Tweet from "@/registry/base-nova/ui/tweet.demo"
import Upload from "@/registry/base-nova/ui/upload.demo"
import Video from "@/registry/base-nova/ui/video.demo"
import WebPreview from "@/registry/base-nova/ui/web-preview.demo"

export const DEMOS: Record<string, ComponentType> = {
  editor: Editor,
  "media-asset": Media,
  "prepare-media": PrepareMedia,
  video: Video,
  upload: Upload,
  image: Image,
  "card-gallery": CardGallery,
  "preview-picker": PreviewPicker,
  tokens: Tokens,
  "quote-card": QuoteCard,
  "terminal-session": TerminalSession,
  "web-preview-unfurl": WebPreviewUnfurl,
  "web-preview": WebPreview,
  tweet: Tweet,
  "card-link": CardLink,
  github: Github,
  "scroll-stage": ScrollStage,
  avatar: Avatar,
  code: Code,
  copy: Copy,
  "device-frame": DeviceFrame,
  reveal: Reveal,
  scrims: Scrims,
  "liquid-glass": LiquidGlass,
  "media-spec": MediaSpec,
  quote: Quote,
  terminal: Terminal,
  keys: Keys,
  kbd: Kbd,
  clip: Clip,
  person: PersonDemo,
  playhead: Playhead,
  player: Player,
  macos: Macos,
  "macos-session": MacosSession,
  "agent-session": AgentSession,
  "claude-code": ClaudeCode,
  codex: Codex,
  "theme-toggle": ThemeToggle,
  "telegram-chat": TelegramChat,
  "telegram-summary": TelegramSummary,
  "lightbox-motion": LightboxMotion,
  "lightbox-actions": LightboxActions,
  lightbox: Lightbox,
}
