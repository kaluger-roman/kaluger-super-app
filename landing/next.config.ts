import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // The repo root has its own package-lock.json (lint-staged). Without this, Next.js takes the
  // outermost lockfile's directory, the repo root, as the workspace root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
