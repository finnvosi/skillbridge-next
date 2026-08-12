import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler is auto-enabled by Next 16 when present; it currently
  // crashes prerendering internal routes (_global-error/_not-found) with a
  // `useContext null` error on this Node/React combo. Disable until fixed.
  reactCompiler: false,
  reactStrictMode: false,
  // In dev, proxy /api/v1 to the local Express API on :3001 (started by
  // `pnpm dev:full`). In production the frontend calls NEXT_PUBLIC_API_URL
  // directly (the API is deployed as a separate Vercel project).
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3001/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
