import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // A registry's demo site is where consumers report bugs from their phones: a stack
  // that resolves to a source line is worth the bytes.
  productionBrowserSourceMaps: true,
}

export default nextConfig
