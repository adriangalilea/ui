import type { Metadata } from "next"
import { Courier_Prime, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SiteTheme, ThemeRoot } from "./theme"

const fontSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const fontTypewriter = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-typewriter",
})

export const metadata: Metadata = {
  title: "ui",
  description: "web components as a shadcn registry",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning because next-themes writes the class onto <html>
    // before React hydrates, which is the entire point: the server cannot know the
    // theme, so the markup it sent is expected to differ by that one attribute.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} ${fontTypewriter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeRoot>
          {children}
          <SiteTheme />
        </ThemeRoot>
      </body>
    </html>
  )
}
