# KillNode — Troubleshooting

Quick reference for the most common issues. If your problem is not listed here, open an issue on [GitHub](https://github.com/Alaustrup/killnode/issues) with the relevant log output.

---

## Table of Contents

1. [Desktop App — Installation](#1-desktop-app--installation)
2. [Desktop App — First Launch](#2-desktop-app--first-launch)
3. [Tor & Proxy Issues](#3-tor--proxy-issues)
4. [Bridges / Pluggable Transports](#4-bridges--pluggable-transports)
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

**Packaged installers (v0.2.0+) include Tor.** If you see "Tor binary not found" with a packaged install, the installation may be corrupt — reinstall.

**Dev builds from source** do not include Tor automatically. Run the download script once:

```bash
# From desktop/ — downloads Tor Expert Bundle v15.0.9 and places it in resources/tor/
node scripts/download-tor.mjs
```

KillNode searches for the binary in this order:
1. `<app resources>/tor/tor.exe` (Windows) / `tor` (Linux/macOS) — bundled at packaging time
2. Tor Browser's `tor.exe` at `%LOCALAPPDATA%\Tor Browser\Browser\TorBrowser\Tor\tor.exe` (Windows)
3. System `tor` in `PATH` (`/usr/bin/tor`, `/usr/sbin/tor`, `/usr/local/bin/tor`)

**Linux system Tor fallback:**
```bash
sudo apt-get install tor   # Debian / Ubuntu / Kali
sudo pacman -S tor          # Arch
```
Do **not** start the `tor.service` — KillNode spawns its own instance with a custom `torrc`.

---

## 3. Tor & Proxy Issues

### "Tor failed to start" / timeout after 22 seconds

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
4. You are not on a network that actively blocks Tor — if so, enable bridges (see [Section 4](#4-bridges--pluggable-transports)).

### Bootstrap progress bar gets stuck below 100%

- Your network may be congested or blocking Tor directory servers. Try enabling bridges.
- Check for orphaned Tor processes: `tasklist | findstr tor` (Windows) or `pgrep tor` (Linux), and kill them before retrying.

### Control port errors ("Tor control cookie not found")

The control cookie is written by Tor to `<userData>/tor-data/control_auth_cookie`. If the file is missing, Tor either has not started yet or failed silently.

- Check the developer console (DevTools) for `[tor]` stderr output.
- Ensure your antivirus is not quarantining files in `%APPDATA%\killnode\tor-data\`.

### Local HTTP proxy fails immediately (port 9742)

Tor must be running and its SOCKS port accepting connections before the HTTP bridge starts. KillNode waits for SOCKS readiness — if the bridge still fails:

- Check the Log section for `[proxy-chain]` errors.
- Confirm Tor's SOCKS port by inspecting `torrc.killnode` in your `userData` directory.

### SOCKS5 gateway (port 9741) hangs for some clients

The SOCKS5 gateway buffers requests properly and supports all address types (IPv4, hostname, IPv6). If a specific client hangs:

- Try pointing it directly at Tor SOCKS (`127.0.0.1:9050`).
- Enable verbose logging in the client to see if the SOCKS handshake completes.

### Electron session not proxied (renderer requests go direct)

`session.defaultSession.setProxy` runs only after Tor's SOCKS port is reachable AND the HTTP bridge accepts connections. If you navigated to a page before Tor was ready, hard-reload the renderer after Tor is active.

### Tor is running but my IP hasn't changed

- Visit `https://check.torproject.org` inside the app (routed through Tor) — it should show "Congratulations."
- If you are testing with an external browser, ensure that browser is configured to use `127.0.0.1:9742` as its HTTP proxy.
- Tor does not change the IP for applications that bypass the proxy.

---

## 4. Bridges / Pluggable Transports

### "Bridges are enabled but Tor connected without them"

If the `lyrebird` binary is not found in `resources/tor/pluggable_transports/`, KillNode silently starts Tor without bridges and logs the skip. Run `node scripts/download-tor.mjs` to download the full Tor Expert Bundle (which includes `lyrebird`).

### Bridge lines rejected ("no such bridge")

- Ensure bridge lines are in the exact format from bridges.torproject.org:
  ```
  obfs4 1.2.3.4:12345 FINGERPRINT cert=... iat-mode=0
  ```
- Do not include the protocol prefix (`Bridge obfs4` is added by KillNode automatically).
- Old or blacklisted bridges will time out. Request fresh bridges.

### Tor takes much longer to bootstrap with bridges

This is normal — bridges are slower than direct Tor connections. obfs4 connections typically add 30–60 seconds to bootstrapping.

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
sudo setcap cap_net_admin+eip /opt/KillNode/killnode
getcap /opt/KillNode/killnode
```

### `rfkill block all` fails

```bash
sudo apt-get install rfkill
```

### "I bricked my networking"

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

### Desktop packaged app: Prisma engine missing

`electron-builder` must unpack native Prisma engine binaries from the ASAR archive. The `asarUnpack` config in `desktop/package.json` already lists `@prisma/**` and `.prisma/**`. If you customize packaging, preserve those entries.

### Monorepo: wrong Prisma models (Setting vs Post)

KillNode has **two separate Prisma schemas**:

| Schema | Output | Database |
|--------|--------|----------|
| `website/prisma/schema.prisma` | `website/src/generated/prisma` | PostgreSQL (Neon) |
| `desktop/prisma/schema.prisma` | `desktop/src/main/generated/prisma` | SQLite |

---

## 7. Developer — Next.js Website Build

### `EPERM scandir … Application Data` on Windows

Some Windows environments throw `EPERM` when Next.js's file-tracing scans `%USERPROFILE%`. Mitigations are already in place in `website/next.config.ts` and `website/scripts/build.mjs`. Use WSL or rely on the Linux CI runner for production builds.

### Admin login returns 401

Verify that `ADMIN_USERNAME` and `ADMIN_PASSWORD` in the Vercel environment do not contain trailing newlines. Remove and re-add them using the Vercel dashboard UI.

---

## 8. Developer — Electron / Desktop Build

### `electron-builder` — "Cannot compute electron version from installed node modules"

`electron-builder` requires an **exact** pinned version of `electron`:
```json
"electron": "33.4.11"   // correct — exact version
"electron": "^33.2.0"   // wrong — range not allowed
```

### macOS packaging fails

macOS code-signing and notarization require Apple Developer certificates (`CSC_LINK`, `CSC_KEY_PASSWORD`). These are not configured for the alpha — macOS builds are disabled in `release-desktop.yml` until Phase 2.

### `ModuleNotFoundError: No module named 'distutils'` during native module rebuild

Python 3.12+ removed `distutils`. Pin Python 3.11 in your CI or local environment. The `release-desktop.yml` workflow already uses `actions/setup-python@v5` with `python-version: "3.11"`.

---

## 9. CI Pipeline

### Website CI job cannot reach the database

`ci.yml` spins up a `postgres:16` service container. The `DATABASE_URL` and `DIRECT_URL` environment variables point at that container:
```
postgresql://killnode:killnode@localhost:5432/killnode
```

### Desktop CI `Typecheck desktop` fails on all platforms

The generated Prisma client is gitignored. The `typecheck` script runs `prisma generate` first:
```
"typecheck": "prisma generate --schema prisma/schema.prisma && tsc --noEmit …"
```
Both the `typecheck` and `build` CI steps supply `DATABASE_URL: "file:./data/desktop.db"` via `env:`.

### Release uploads empty or missing archives

1. Confirm the `Package KillNode` step succeeded.
2. The upload step looks for `desktop/release/*`.
3. Verify the artifacts exist at that path on the runner after packaging.

---

*Still stuck? Open an issue: [github.com/Alaustrup/killnode/issues](https://github.com/Alaustrup/killnode/issues)*
