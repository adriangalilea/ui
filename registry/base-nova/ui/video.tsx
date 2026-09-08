"use client"

import {
  type ComponentProps,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/utils"
import { Image } from "@/registry/base-nova/ui/image"
import { useMediaIntent } from "@/registry/base-nova/ui/image-intent"

export type VideoProps = Omit<
  ComponentProps<"video">,
  "width" | "height" | "className" | "autoPlay" | "src"
> & {
  src: string
  width: number
  height: number
  /** A normal native player, or a silent cover that plays on hover/focus (visibility on touch). */
  mode?: "player" | "preview"
  /** Preview trigger. Covers in an article may play whenever visible. */
  playOn?: "intent" | "visible"
  label: string
  blurDataURL?: string
  className?: string
  videoClassName?: string
  /** Explicitly share hover/focus with a containing card, without CSS ancestor discovery. */
  interactionRef?: RefObject<HTMLElement | null>
}

export function Video({ src, ...props }: VideoProps) {
  return <VideoSource key={src} src={src} {...props} />
}

function VideoSource({
  src,
  width,
  height,
  poster,
  blurDataURL,
  mode = "player",
  playOn = "intent",
  label,
  className,
  videoClassName,
  interactionRef,
  children,
  onPlaying,
  onPause,
  onEnded,
  onError,
  ...props
}: VideoProps) {
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const wanted = useRef(false)
  const intent = useMediaIntent(frame, interactionRef)
  const { setManual } = intent
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const preview = mode === "preview"

  const shouldPlay = preview && intent.active(playOn)
  useEffect(() => {
    if (!preview) return
    const el = video.current
    if (!el) return
    wanted.current = shouldPlay
    let current = true
    if (shouldPlay) {
      setFailed(false)
      el.play().catch((error) => {
        if (current && error.name !== "AbortError") {
          setFailed(true)
          setPlaying(false)
          setManual(false)
        }
      })
    } else {
      el.pause()
      setPlaying(false)
      // No delayed pause can race with a new hover. The poster owns the fade.
      if (el.readyState > 0) el.currentTime = 0
    }
    return () => {
      current = false
      wanted.current = false
      el.pause()
    }
  }, [preview, shouldPlay, setManual])

  return (
    <div
      ref={frame}
      data-slot="video"
      data-playing={playing}
      className={cn(
        "not-prose relative isolate block max-w-full overflow-hidden bg-foreground/4 aspect-(--video-aspect)",
        className,
      )}
      style={
        { "--video-aspect": `${width} / ${height}` } as React.CSSProperties
      }
    >
      {poster && (
        <Image
          src={poster}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          blurDataURL={blurDataURL}
          className="pointer-events-none absolute inset-0"
          imageClassName={cn("object-cover", videoClassName)}
        />
      )}
      <video
        {...props}
        ref={video}
        src={src}
        poster={poster}
        width={width}
        height={height}
        aria-label={label}
        playsInline
        muted={preview || props.muted}
        controls={!preview}
        preload={props.preload ?? (preview ? "none" : "metadata")}
        className={cn(
          "relative block size-full object-cover transition-opacity duration-300 motion-reduce:transition-none",
          preview && !playing && "opacity-0",
          videoClassName,
        )}
        onPlaying={(e) => {
          if (preview && !wanted.current) {
            e.currentTarget.pause()
            return
          }
          setPlaying(true)
          onPlaying?.(e)
        }}
        onPause={(e) => {
          setPlaying(false)
          onPause?.(e)
        }}
        onEnded={(e) => {
          setPlaying(false)
          if (preview) setManual(false)
          onEnded?.(e)
        }}
        onError={(e) => {
          setFailed(true)
          setPlaying(false)
          onError?.(e)
        }}
      >
        {children}
      </video>
      {preview && (
        <button
          type="button"
          aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          aria-pressed={playing}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setManual(!playing)
          }}
          className="absolute right-2 bottom-2 rounded-full bg-black/60 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {failed ? "retry" : playing ? "pause" : "play"}
        </button>
      )}
    </div>
  )
}
