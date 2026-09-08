// Every registry item and its demo, by name. The [item] route renders from here; the
// validator checks every registry.json item is listed.
import type { ComponentType } from "react"
import TelegramSummary from "@/registry/base-nova/blocks/telegram-summary/telegram-summary.demo"
import LightboxActions from "@/registry/base-nova/lib/lightbox-actions.demo"
import LightboxMotion from "@/registry/base-nova/lib/lightbox-motion.demo"
import Media from "@/registry/base-nova/lib/media-asset.demo"
import PrepareMedia from "@/registry/base-nova/lib/prepare-media.demo"
import QuoteCard from "@/registry/base-nova/lib/quote-card.demo"
import TerminalSession from "@/registry/base-nova/lib/terminal-session.demo"
import WebPreviewUnfurl from "@/registry/base-nova/lib/web-preview-unfurl.demo"
import Tokens from "@/registry/base-nova/theme/tokens.demo"
import Avatar from "@/registry/base-nova/ui/avatar.demo"
import CardGallery from "@/registry/base-nova/ui/card-gallery.demo"
import Code from "@/registry/base-nova/ui/code.demo"
import Copy from "@/registry/base-nova/ui/copy.demo"
import DeviceFrame from "@/registry/base-nova/ui/device-frame.demo"
import Editor from "@/registry/base-nova/ui/editor.demo"
import Image from "@/registry/base-nova/ui/image.demo"
import Lightbox from "@/registry/base-nova/ui/lightbox.demo"
import LiquidGlass from "@/registry/base-nova/ui/liquid-glass.demo"
import PreviewPicker from "@/registry/base-nova/ui/preview-picker.demo"
import Quote from "@/registry/base-nova/ui/quote.demo"
import Reveal from "@/registry/base-nova/ui/reveal.demo"
import Scrims from "@/registry/base-nova/ui/scrims.demo"
import ScrollStage from "@/registry/base-nova/ui/scroll-stage.demo"
import TelegramChat from "@/registry/base-nova/ui/telegram-chat.demo"
import Terminal from "@/registry/base-nova/ui/terminal.demo"
import ThemeToggle from "@/registry/base-nova/ui/theme-toggle.demo"
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
  "scroll-stage": ScrollStage,
  avatar: Avatar,
  code: Code,
  copy: Copy,
  "device-frame": DeviceFrame,
  reveal: Reveal,
  scrims: Scrims,
  "liquid-glass": LiquidGlass,
  quote: Quote,
  terminal: Terminal,
  "theme-toggle": ThemeToggle,
  "telegram-chat": TelegramChat,
  "telegram-summary": TelegramSummary,
  "lightbox-motion": LightboxMotion,
  "lightbox-actions": LightboxActions,
  lightbox: Lightbox,
}
