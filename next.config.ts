import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // A registry's demo site is where consumers report bugs from their phones: a stack
  // that resolves to a source line is worth the bytes.
  productionBrowserSourceMaps: true,
  env: {
    // Which build a report came from, baked in and shown in the debug overlay. More
    // than one round of this project has been spent reading a trace from a version
    // that was never deployed, or from a stale buffer, with no way to tell from the
    // text. A SHA in the first line ends that argument in a glance.
    NEXT_PUBLIC_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(
      0,
      7,
    ),
  },
}

export default nextConfig
