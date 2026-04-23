# KillNode — Troubleshooting

Quick reference for the most common issues. If your problem is not listed here, open an issue on [GitHub](https://github.com/Alaustrup/killnode/issues) with the relevant log output.

---

## Table of Contents

1. [Desktop App — Installation](#1-desktop-app--installation)
2. [Desktop App — First Launch](#2-desktop-app--first-launch)
3. [Tor & Proxy Issues](#3-tor--proxy-issues)
4. [WebTorrent / Swarm](#4-webtorrent--swarm)
5. [Neural Killswitch — Linux / Kali](#5-neural-killswitch--linux--kali)
6. [Developer — Prisma & Database](#6-developer--prisma--database)
7. [Developer — Next.js Website Build](#7-developer--nextjs-website-build)
8. [Developer — Electron / Desktop Build](#8-developer--electron--desktop-build)
9. [CI Pipeline](#9-ci-pipeline)

---

## 1. Desktop App — Installation

### Windows: "Windows protected your PC" (SmartScreen)

The alpha installer is not code-signed yet (Phase 2). SmartScreen blocks unsigned executables by default.

**Workaround:**
1. Click **More info** on the SmartScreen dialog.
2. Click **Run anyway**.
3. Proceed with the installer.

### Windows: Installer fails / rolls back

- Run the installer as Administrator.
- Check that you have ≥ 500 MB free disk space.
- Temporarily disable antivirus real-time protection during install (re-enable afterward).

### Linux (AppImage): "Permission denied" on launch

AppImage files need the execute bit set:

```bash
chmod +x KillNode-*-linux.AppImage
./KillNode-*-linux.AppImage
```

### Linux (.deb): Dependencies missing after `dpkg -i`

```bash
sudo dpkg -i KillNode-*-linux.deb
sudo apt-get install -f    # install missing dependencies automatically
```

### Linux: FUSE not available (AppImage fails with "fuse: failed to exec fusermount3")

```bash
# Ubuntu / Debian
sudo apt-get install libfuse2

# Arch
sudo pacman -S fuse2
```

Alternatively, extract and run without FUSE:

```bash
./KillNode-*-linux.AppImage --appimage-extract
./squashfs-root/AppRun
```

---

## 2. Desktop App — First Launch

### App opens but shows a blank white window

The renderer failed to load. Open **DevTools** (`Ctrl+Shift+I`) and check the Console tab for errors. Common causes:

- Electron cannot find the bundled renderer assets (`out/renderer/`). Reinstall or rebuild.
- A native module (`@prisma/client`) failed to load. See [Prisma engine missing](#desktop-packaged-app-prisma-engine-missing).

### "Cannot find module './generated/prisma'" on launch

The Prisma client was not bundled correctly.

- **Packaged app:** reinstall — the installer should include the generated client.
- **Dev build:** run `npm run dev:desktop` from the monorepo root (it runs `prisma generate` first).

### App launches but Tor button does nothing

Tor binary not found. KillNode looks for it at:
1. `<app resources>/tor/tor` (or `tor.exe` on Windows) — provided via `resources/tor/` at build time.
2. System `tor` in `PATH`.

**Fix:** Place the Tor Expert Bundle binary in the `resources/tor/` directory of the installed app, or install `tor` system-wide:

```bash
# Ubuntu / Debian
sudo apt-get install tor

# Arch
sudo pacman -S tor
```

---

## 3. Tor & Proxy Issues

### "Tor failed to start" / timeout after 60 seconds

**Check:**
1. The Tor binary is present and executable (see above).
2. No other process is using port **9050**:
   ```bash
   # Linux / macOS
   lsof -i :9050
   # Windows (PowerShell)
   netstat -ano | findstr 9050
   ```
3. A firewall is not blocking Tor's outbound connections on port 443 / 9001.
4. You are not on a network that actively blocks Tor. If so, use obfuscation bridges.

### Local HTTP proxy fails immediately (port 9742)

Tor must be running and its SOCKS port accepting connections before the HTTP bridge starts. KillNode waits for SOCKS readiness — if the bridge still fails:

- Check the **Log** panel for `[proxy-chain]` errors.
- Confirm Tor's SOCKS port by looking at `torrc.killnode` in your `userData` directory.

### SOCKS5 ingress (port 9741) hangs for some clients

The minimal SOCKS5 parser handles standard `CONNECT` flows. Exotic clients that send non-standard handshake sequences may hang.

**Workaround:** Point the client directly at Tor's SOCKS port (`127.0.0.1:9050`) instead.

### Electron session not proxied (renderer requests go direct)

`session.defaultSession.setProxy` runs only after:
1. Tor's SOCKS port is reachable **AND**
2. The HTTP bridge on 9742 accepts connections.

If you navigated to a page before Tor was ready, hard-reload the renderer page after Tor is active.

### Tor is running but my IP hasn't changed

- Visit `https://check.torproject.org` inside the app (routed through Tor) — it should show "Congratulations."
- If you're testing with an external browser, ensure that browser is configured to use `127.0.0.1:9742` as its HTTP proxy.
- Tor does not change the IP for applications that bypass the proxy.

---

## 4. WebTorrent / Swarm

### Magnet link added but download speed is 0 for minutes

- Trackers may be unreachable if Tor is blocking certain ports. Most trackers use port 80 or 443.
- Check the **Log** panel for `[webtorrent]` tracker errors.
- Try a magnet with well-seeded public trackers.
- DHT is disabled — the torrent relies entirely on tracker announces.

### "Torrent already active" message

The info-hash is already in the client. If you want to re-add after removal, the in-memory client may still hold it. Restart the app to clear the client state.

### Magnet links from browser don't open KillNode

- **Windows:** go to Settings → Apps → Default Apps → search "magnet" and set KillNode as the default.
- **Linux:** run `xdg-mime default killnode.desktop x-scheme-handler/magnet` and test with `xdg-open "magnet:..."`.
- Protocol registration only works reliably with the **packaged** app. During `electron-vite dev`, the handler may point at the wrong binary.

### Drag and drop doesn't work

Drag and drop uses `webUtils.getPathForFile` in the preload bridge. Ensure you are running the **packaged** app or a full dev build — the API is not available in browser-only renderer previews.

---

## 5. Neural Killswitch — Linux / Kali

### `nmcli networking off` — "Error: insufficient privileges"

NetworkManager operations need `polkit` authorization or root. Options:

**Option A — run with sudo (authorized systems only):**
```bash
sudo ./KillNode-*.AppImage
```

**Option B — add a polkit rule (persistent, no sudo needed):**
Create `/etc/polkit-1/rules.d/99-killnode.rules`:
```javascript
polkit.addRule(function(action, subject) {
  if (action.id.indexOf("org.freedesktop.NetworkManager") === 0 &&
      subject.isInGroup("sudo")) {
    return polkit.Result.YES;
  }
});
```

**Option C — grant `CAP_NET_ADMIN` to the binary (`.deb` install only):**
```bash
# Find the installed main executable
sudo setcap cap_net_admin+eip /opt/KillNode/killnode

# Verify
getcap /opt/KillNode/killnode
```
> `cap_net_admin` lets the process bring network interfaces up/down without full root. Only use on machines you control.

### `setcap` returns "Operation not supported"

The filesystem containing the binary is likely mounted `nosuid` or `noexec` (common on live USBs). Install to a normal `ext4` partition.

### `rfkill block all` fails

Install `rfkill`:
```bash
sudo apt-get install rfkill
```
Some hardware wireless kill switches are firmware-gated and cannot be toggled from userspace regardless.

### "I bricked my networking"

Use a physical console, another network interface, or recovery mode:
```bash
# Linux
nmcli networking on
ip link set eth0 up     # replace with your interface name

# Or restart NetworkManager
sudo systemctl restart NetworkManager
```

---

## 6. Developer — Prisma & Database

### `prisma generate` fails on Windows (EPERM / rename `query_engine`)

- Close all editors or AV software scanning `node_modules`.
- Run the terminal as Administrator once to unblock engine extraction.
- Re-run `npx prisma generate` inside the specific workspace (`website/` or `desktop/`).

### Desktop: "Cannot find module './generated/prisma'" in dev

The generated Prisma client is not committed to Git (it is in `.gitignore`). Run:

```bash
npm run dev:desktop    # runs prisma generate automatically before electron-vite
```

Or explicitly:
```bash
cd desktop
npx prisma generate --schema prisma/schema.prisma
```

### Desktop packaged app: Prisma engine missing

`electron-builder` must unpack native Prisma engine binaries from the ASAR archive. The `asarUnpack` config in `desktop/package.json` already lists `@prisma/**` and `.prisma/**`. If you customize packaging, preserve those entries.

### Monorepo: wrong Prisma models (Setting vs Post)

KillNode has **two separate Prisma schemas** generating into different output directories:

| Schema | Output | Database |
|--------|--------|----------|
| `website/prisma/schema.prisma` | `website/src/generated/prisma` | PostgreSQL (Neon) |
| `desktop/prisma/schema.prisma` | `desktop/src/main/generated/prisma` | SQLite |

Always regenerate **both** when working across the monorepo:
```bash
# From the monorepo root:
npm run typecheck:desktop   # includes prisma generate for desktop
cd website && npx prisma generate
```

### Website: Prisma cannot connect to database (`P1001`)

- Confirm `DATABASE_URL` and `DIRECT_URL` are set in `website/.env`.
- For local dev, use the **pooled** Neon connection string for both variables (the direct, non-pooled endpoint is only reachable from servers with a fixed IP in some regions).
- For a local PostgreSQL: `DATABASE_URL="postgresql://killnode:killnode@localhost:5432/killnode"`.

### Website: `P1002` (advisory lock timeout on Vercel)

Neon's compute endpoint has a cold-start pause. The Vercel `buildCommand` intentionally omits `prisma migrate deploy` — run migrations manually against the Neon database or from a local machine with the direct connection string before deploying.

---

## 7. Developer — Next.js Website Build

### `EPERM scandir … Application Data` on Windows

Some Windows environments throw `EPERM` when Next.js's file-tracing scans `%USERPROFILE%` and encounters the `Application Data → AppData\Roaming` junction.

Mitigations already in place:
1. `website/next.config.ts` sets `outputFileTracingRoot` to the monorepo root.
2. `website/scripts/build.mjs` runs `next build` with `USERPROFILE`, `HOME`, and `LOCALAPPDATA` sandboxed to `website/.next-sandbox-home/`.

If problems persist, use WSL or rely on the Linux CI runner for production builds.

### ESLint errors in generated Prisma client

`eslint.config.mjs` ignores `src/generated/**`. If you see lint errors from generated files, confirm that ignore is present and run `npm run lint:web` again.

### Admin login returns 401

Verify the Vercel environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD` do not contain trailing newlines (a common issue when set via `echo "..." | vercel env add`). Remove and re-add them using the Vercel dashboard UI, or rely on the code defaults (`admin` / `killnode2026`) for the alpha.

### Website build: "buildCommand should NOT be longer than 256 characters"

The `buildCommand` in `vercel.json` exceeds Vercel's limit. Keep it short — the current config is:
```
cd website && npx prisma generate && next build
```
Do not add `echo` statements or chained steps to the `buildCommand`.

---

## 8. Developer — Electron / Desktop Build

### `electron-builder` — "Cannot compute electron version from installed node modules"

`electron-builder` requires an **exact** pinned version of `electron`, not a semver range. Check `desktop/package.json`:
```json
"electron": "33.4.11"   // correct — exact version
"electron": "^33.2.0"   // wrong — range not allowed
```

### `electron-builder` auto-publishes to GitHub

If `GH_TOKEN` is in the environment, `electron-builder` will attempt to publish a release automatically. The `package` script uses `--publish never` to prevent this:
```
"package": "npm run build && electron-builder --publish never"
```
Do not remove `--publish never` from the script.

### `ERR_REQUIRE_ESM` at runtime (webtorrent / magnet-uri)

`webtorrent` v2+ and `magnet-uri` v7+ are pure ES Modules. They cannot be `require()`'d from a CommonJS bundle. The fix — using dynamic `await import()` in `torrent-service.ts` — is already in place. If you see this error after modifying `torrent-service.ts`, ensure you have not reintroduced a static `import WebTorrent from "webtorrent"` or `createRequire(…)`.

### macOS packaging fails (notarization / DMG)

macOS code-signing and notarization require Apple Developer certificates (`CSC_LINK`, `CSC_KEY_PASSWORD`). These are not configured for the alpha. macOS builds are **disabled** in `release-desktop.yml` until Phase 2.

### `ModuleNotFoundError: No module named 'distutils'` during native module rebuild

Python 3.12+ removed `distutils`. Pin Python 3.11 in your CI or local environment. The `release-desktop.yml` workflow already uses `actions/setup-python@v5` with `python-version: "3.11"`.

---

## 9. CI Pipeline

### Website CI job cannot reach the database

`ci.yml` spins up a `postgres:16` service container. The `DATABASE_URL` and `DIRECT_URL` environment variables point at that container:
```
postgresql://killnode:killnode@localhost:5432/killnode
```
If the job still fails, check that the service container health-check passed (look for `postgres` in the Services section of the job log).

### Desktop CI `Typecheck desktop` fails on all platforms

The generated Prisma client (`desktop/src/main/generated/prisma`) is gitignored. The `typecheck` script runs `prisma generate` first:
```
"typecheck": "prisma generate --schema prisma/schema.prisma && tsc --noEmit …"
```
Both the `typecheck` and `build` CI steps supply `DATABASE_URL: "file:./data/desktop.db"` via `env:` so Prisma generate can resolve the datasource URL.

### Release uploads empty or missing archives

1. Confirm the `Package KillNode` step succeeded (check the step log for `electron-builder` output).
2. The upload step looks for `desktop/release/*`. Verify the artifacts exist at that path on the runner after packaging.
3. The `working-directory: desktop` setting means `electron-builder` writes to `desktop/release/` relative to the monorepo root — the upload glob should still find them.

---

*Still stuck? Open an issue: [github.com/Alaustrup/killnode/issues](https://github.com/Alaustrup/killnode/issues)*
