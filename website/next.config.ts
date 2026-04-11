import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (`KillNode/`); prevents Next from mis-inferring a root that walks Windows profile junctions (EPERM on `Application Data`). */
const monorepoRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["prisma"],
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
