import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdf-parse must be loaded from node_modules at runtime, not bundled —
  // bundling it breaks the /api/extract-pdf route in production builds.
  serverExternalPackages: ["pdf-parse"],
  // Pin Turbopack to this project so a stray package-lock.json in the
  // home directory (Windows/WSL) can't pull the root upward.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
