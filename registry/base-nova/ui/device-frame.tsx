import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import "./device-frame.css"

type DesktopFrameProps = ComponentProps<"div"> & { screenClassName?: string }

/** A 16:10 laptop display with a shallow base. */
export function MacbookFrame({
  children,
  className,
  screenClassName,
  notch = true,
  ...props
}: DesktopFrameProps & { notch?: boolean }) {
  return (
    <div
      {...props}
      data-device="macbook"
      className={cn("device-desktop", className)}
    >
      <div className="device-lid">
        <div className={cn("device-display", screenClassName)}>{children}</div>
        {notch && <span aria-hidden className="device-notch" />}
        <span aria-hidden className="device-camera" />
      </div>
      <div aria-hidden className="device-base" />
      <span aria-hidden className="device-rubber left" />
      <span aria-hidden className="device-rubber right" />
    </div>
  )
}

/** A 16:9 desktop display with its own stand, independent of app content. */
export function StudioDisplayFrame({
  children,
  className,
  screenClassName,
  ...props
}: DesktopFrameProps) {
  return (
    <div
      {...props}
      data-device="studio"
      className={cn("device-desktop", className)}
    >
      <div className="device-lid">
        <div className={cn("device-display", screenClassName)}>{children}</div>
        <span aria-hidden className="device-camera" />
      </div>
      <div aria-hidden className="device-stand" />
      <div aria-hidden className="device-foot" />
    </div>
  )
}

/** Hardware only. App navigation and content belong to the child. */
export function IphoneFrame({
  children,
  bare = false,
  screenClassName,
  className,
  ...props
}: ComponentProps<"div"> & {
  bare?: boolean
  screenClassName?: string
  children?: ReactNode
}) {
  return (
    <div
      {...props}
      data-device={bare ? undefined : "iphone"}
      className={cn("device-frame", className)}
    >
      {!bare && (
        <>
          <span className="device-button action" />
          <span className="device-button vol-up" />
          <span className="device-button vol-down" />
          <span className="device-button power" />
          <span aria-hidden className="device-earpiece" />
          <span aria-hidden className="device-antenna left top" />
          <span aria-hidden className="device-antenna right top" />
          <span aria-hidden className="device-antenna left bottom" />
          <span aria-hidden className="device-antenna right bottom" />
        </>
      )}
      <div className={cn("device-screen", screenClassName)}>
        {!bare && <IphoneStatusBar />}
        {children}
      </div>
    </div>
  )
}

export function IphoneStatusBar() {
  return (
    <div aria-hidden="true">
      <div className="device-island">
        <span className="device-lens" />
      </div>
      <div className="device-status">
        <span>9:41</span>
        <span className="radios">
          <svg aria-hidden="true" viewBox="0 0 17 11" width="17" height="11">
            <g fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="1" />
              <rect x="4.5" y="5" width="3" height="6" rx="1" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
              <rect x="13.5" y="0" width="3" height="11" rx="1" />
            </g>
          </svg>
          <svg aria-hidden="true" viewBox="0 0 26 11" width="26" height="11">
            <rect
              x="0.6"
              y="0.6"
              width="21"
              height="9.8"
              rx="2.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.5"
            />
            <rect
              x="23.4"
              y="3.6"
              width="2"
              height="3.8"
              rx="1"
              fill="currentColor"
              opacity="0.5"
            />
            <rect
              x="2.2"
              y="2.2"
              width="14"
              height="6.6"
              rx="1.6"
              fill="currentColor"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
