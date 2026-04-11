/**
 * Cross-platform Next.js production build wrapper.
 *
 * On Linux/macOS (CI, Vercel): calls `next build` directly.
 * On Windows (local): sandboxes USERPROFILE/HOME to avoid EPERM on
 *   profile junctions (Application Data → AppData\Roaming).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.join(__dirname, "..");
const env = { ...process.env };

if (process.platform === "win32") {
  const fakeHome = path.join(websiteRoot, ".next-sandbox-home");
  fs.mkdirSync(path.join(fakeHome, "AppData", "Local"), { recursive: true });
  env.USERPROFILE = fakeHome;
  env.HOME = fakeHome;
  env.LOCALAPPDATA = path.join(fakeHome, "AppData", "Local");
}

const result = spawnSync("npx", ["next", "build"], {
  cwd: websiteRoot,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
