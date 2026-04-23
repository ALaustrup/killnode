#!/usr/bin/env node
/**
 * desktop/scripts/download-tor.mjs
 *
 * Downloads, verifies (SHA256), and extracts the official Tor Expert Bundle
 * into desktop/resources/tor/ before electron-builder packaging.
 *
 * Behaviour:
 *   - If resources/tor/<binary> already exists → skip (fast-path for dev).
 *   - Set FORCE_TOR_DOWNLOAD=1 to always re-download (used in CI release builds).
 *   - Verifies SHA256 against Tor Project published checksums — aborts on mismatch.
 *   - Uses only Node.js built-ins, zero extra npm dependencies.
 *
 * To update Tor version:
 *   1. Change TOR_VERSION below.
 *   2. Fetch new checksums from:
 *      https://archive.torproject.org/tor-package-archive/torbrowser/<version>/sha256sums-unsigned-build.txt
 *   3. Update KNOWN_CHECKSUMS with the hashes for the three platform files.
 */

import { createHash }                        from "node:crypto";
import { createWriteStream, existsSync,
         mkdirSync, rmSync, createReadStream } from "node:fs";
import { get }                                from "node:https";
import { join, dirname }                      from "node:path";
import { fileURLToPath }                      from "node:url";
import { execSync }                           from "node:child_process";
import { platform }                           from "node:process";

// ── Version pin ────────────────────────────────────────────────────────────────
const TOR_VERSION = "15.0.9";

// SHA256 checksums from sha256sums-unsigned-build.txt — verify at:
// https://archive.torproject.org/tor-package-archive/torbrowser/15.0.9/sha256sums-unsigned-build.txt
const KNOWN_CHECKSUMS = {
  "tor-expert-bundle-windows-x86_64-15.0.9.tar.gz": "adebc1b7c65dc1b5e471064ed17585464af6f6198c3fe5c8c9108138b59ccf65",
  "tor-expert-bundle-linux-x86_64-15.0.9.tar.gz":   "7ea13e14cddafb36c6347a9c4f4e639f6010364c16acfd519157c29e226277f2",
  "tor-expert-bundle-macos-x86_64-15.0.9.tar.gz":   "979d288b901995f67378d1301262a593b78a38de4d1fad40d566a939004fa29f",
};

const PLATFORM_MAP = {
  win32:  { name: "windows-x86_64", binary: "tor.exe" },
  linux:  { name: "linux-x86_64",   binary: "tor"     },
  darwin: { name: "macos-x86_64",   binary: "tor"     },
};

// ── Paths ──────────────────────────────────────────────────────────────────────
const __dirname     = dirname(fileURLToPath(import.meta.url));
const RESOURCES_TOR = join(__dirname, "..", "resources", "tor");
// Primary mirror — falls back to archive if needed
const DIST_MIRRORS  = [
  `https://www.torproject.org/dist/torbrowser/${TOR_VERSION}`,
  `https://dist.torproject.org/torbrowser/${TOR_VERSION}`,
  `https://archive.torproject.org/tor-package-archive/torbrowser/${TOR_VERSION}`,
];

// ── Logging ────────────────────────────────────────────────────────────────────
const log  = (msg) => process.stdout.write(`[tor-download] ${msg}\n`);
const die  = (msg) => { process.stderr.write(`[tor-download] ERROR: ${msg}\n`); process.exit(1); };

// ── HTTP helpers ───────────────────────────────────────────────────────────────
function followRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (u, remaining) => {
      get(u, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && remaining > 0) {
          attempt(res.headers.location, remaining - 1);
          res.resume();
          return;
        }
        resolve(res);
      }).on("error", reject);
    };
    attempt(url, maxRedirects);
  });
}

async function downloadToFile(fileName, destPath) {
  let lastError;
  for (const base of DIST_MIRRORS) {
    const url = `${base}/${fileName}`;
    log(`  Trying: ${url}`);
    try {
      const res = await followRedirects(url);
      if (res.statusCode !== 200) {
        log(`  HTTP ${res.statusCode} — trying next mirror`);
        res.resume();
        continue;
      }
      const total    = parseInt(res.headers["content-length"] ?? "0", 10);
      let   received = 0;
      await new Promise((resolve, reject) => {
        const out = createWriteStream(destPath);
        res.on("data", (chunk) => {
          received += chunk.length;
          if (total) {
            const pct = Math.round((received / total) * 100);
            process.stdout.write(`\r[tor-download]   ${pct}% (${(received / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB)`);
          }
        });
        res.pipe(out);
        out.on("finish", () => { process.stdout.write("\n"); resolve(); });
        out.on("error", reject);
        res.on("error", reject);
      });
      return; // success
    } catch (err) {
      lastError = err;
      log(`  Connection failed (${err.message ?? err}) — trying next mirror`);
    }
  }
  die(`All mirrors failed. Last error: ${lastError?.message ?? lastError}`);
}

// ── SHA256 ─────────────────────────────────────────────────────────────────────
function sha256ofFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (d) => hash.update(d));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const info = PLATFORM_MAP[platform];
  if (!info) die(`Unsupported platform: ${platform}`);

  const binaryPath = join(RESOURCES_TOR, info.binary);
  const force      = process.env["FORCE_TOR_DOWNLOAD"] === "1";

  if (!force && existsSync(binaryPath)) {
    log(`Tor binary already present at resources/tor/${info.binary} — skipping download.`);
    log("Set FORCE_TOR_DOWNLOAD=1 to re-download.");
    return;
  }

  const fileName    = `tor-expert-bundle-${info.name}-${TOR_VERSION}.tar.gz`;
  const archivePath = join(RESOURCES_TOR, fileName);

  const expectedHash = KNOWN_CHECKSUMS[fileName];
  if (!expectedHash) die(`No known checksum for ${fileName}. Update KNOWN_CHECKSUMS in this script.`);

  mkdirSync(RESOURCES_TOR, { recursive: true });

  // Download (tries mirrors in order)
  log(`Downloading Tor Expert Bundle v${TOR_VERSION} for ${platform}...`);
  await downloadToFile(fileName, archivePath);
  log("  Download complete.");

  // Verify
  log("Verifying SHA256...");
  const actualHash = await sha256ofFile(archivePath);
  if (actualHash !== expectedHash) {
    rmSync(archivePath, { force: true });
    die(
      `SHA256 mismatch!\n  expected: ${expectedHash}\n  got:      ${actualHash}\n` +
      `Archive deleted. Do NOT use this binary.`
    );
  }
  log(`  SHA256 OK: ${actualHash}`);

  // Extract — the bundle archive has a top-level tor/ directory; strip it
  log(`Extracting into resources/tor/...`);
  try {
    execSync(
      `tar -xzf "${archivePath}" --strip-components=1 -C "${RESOURCES_TOR}"`,
      { stdio: "inherit" }
    );
  } catch (err) {
    rmSync(archivePath, { force: true });
    die(`Extraction failed: ${err.message}`);
  }

  // Make binary executable on Unix
  if (platform !== "win32") {
    try {
      execSync(`chmod +x "${binaryPath}"`, { stdio: "inherit" });
    } catch {
      // best-effort
    }
  }

  // Clean up the archive
  rmSync(archivePath, { force: true });

  // Verify the binary is present
  if (!existsSync(binaryPath)) {
    die(`Extraction appeared to succeed but ${info.binary} not found in resources/tor/. ` +
        `The archive structure may have changed — check the extraction manually.`);
  }

  log(`Done. Tor ${TOR_VERSION} ready at resources/tor/${info.binary}`);
}

main().catch((err) => die(err.message ?? String(err)));
