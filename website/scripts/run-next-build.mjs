/**
 * Windows: Next.js production builds sometimes glob-scan %USERPROFILE% and hit the
 * "Application Data" junction (EPERM). Point HOME/USERPROFILE at a project-local dir
 * for the `next build` child process only.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.join(__dirname, "..");
const fakeHome = path.join(websiteRoot, ".next-sandbox-home");

const env = { ...process.env };

if (process.platform === "win32") {
  fs.mkdirSync(fakeHome, { recursive: true });
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
