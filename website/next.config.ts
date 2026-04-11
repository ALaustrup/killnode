import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client"],

  /**
   * Monorepo root — keeps output file tracing scoped to the repo rather than
   * letting Next.js infer a root that walks Windows profile junctions (EPERM).
   * On Vercel this is a no-op (Linux filesystem, no junctions).
   */
  outputFileTracingRoot: path.resolve(__dirname, ".."),

  /** Security headers are also set via vercel.json for Vercel; this catches self-hosted cases. */
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
  ],
};

export default nextConfig;
