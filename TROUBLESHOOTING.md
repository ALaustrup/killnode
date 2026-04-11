# KillNode — Troubleshooting

---

## Prisma / SQLite

### `prisma generate` fails on Windows (`EPERM` / rename `query_engine`)

- Close editors/AV scanning `node_modules`.
- Run the terminal **as Administrator** once to unblock engine extraction.
- Re-run `npx prisma generate` from the specific package (`website/` or `desktop/`).

### Website: “no such table: Post”

- The website schema pins SQLite to `website/data/killnode.db` (`file:../data/killnode.db` in `website/prisma/schema.prisma`).
- Run `mkdir -p website/data` (PowerShell: `New-Item -ItemType Directory -Force website/data`) then `cd website && npx prisma migrate deploy`.

### Monorepo: wrong Prisma models (Setting vs Post)

KillNode generates **two clients** into different folders:

- `website/src/generated/prisma`
- `desktop/src/main/generated/prisma`

Never run `prisma generate` for one schema and expect the other package to work until you regenerate **both**.

### Desktop packaged app: Prisma engine missing

Ensure `electron-builder` keeps native engines unpackable (`asarUnpack` already lists `@prisma/**` and `.prisma/**`). If you customize packaging, preserve `node_modules/.prisma` alongside the app.

---

## Next.js build (`EPERM scandir … Application Data` or profile junctions)

Some Windows environments throw `EPERM` when tooling scans `%USERPROFILE%` and hits the **`Application Data` → `AppData\Roaming` junction** (permission denied on `scandir`).

Mitigations shipped in this repo:

1. **`website/next.config.ts`** sets `outputFileTracingRoot` to the **monorepo root** (`KillNode/`) so Next does not mis-infer a tracing root on Windows workspaces.
2. **`website/scripts/run-next-build.mjs`** runs `next build` with `USERPROFILE` / `HOME` / `LOCALAPPDATA` pointed at **`website/.next-sandbox-home/`** (gitignored) for that subprocess only—avoiding profile junction traversal.
3. **`website/package.json`** `build` invokes that script after Prisma steps.

If problems persist: elevated shell, WSL, or rely on Linux CI (`ci.yml`) for production builds.

### ESLint and generated Prisma

`eslint.config.mjs` ignores **`src/generated/**`** so `next build` does not lint the Prisma client output (it uses `require()` and triggers `@typescript-eslint/no-require-imports`). Do not remove that ignore while the client is generated into `src/generated/prisma`.

---

## Electron / desktop

### Main process: `Cannot find module './generated/prisma'`

Run `npx prisma generate --schema prisma/schema.prisma` inside `desktop/`, then `npm run build --workspace=desktop`. The Vite plugin copies `src/main/generated` → `out/main/generated`.

### WebTorrent errors on start

Ensure writable `userData/torrents`. If a corporate proxy intercepts TLS, tracker announces may fail — inspect the main-process terminal for `[webtorrent]` errors.

### Magnet links open the wrong binary (Windows dev)

During `electron-vite dev`, protocol registration may point at the wrong executable. Use packaged builds for handler testing, or manually re-register the `magnet` association.

---

## Proxy / Tor

### Local HTTP proxy fails immediately

Tor must be listening on the configured SOCKS port (default **9050**). KillNode waits for that port to accept TCP before starting the HTTP bridge; if startup still fails, confirm Tor logs and firewall rules.

### SOCKS5 ingress hangs

The minimal SOCKS5 parser expects reasonably framed packets; exotic clients may require buffering upgrades. For maximum compatibility, point SOCKS clients directly at Tor’s port **9050** instead of **9741**.

### Electron session not proxied

`session.defaultSession.setProxy` runs only **after** Tor’s SOCKS port is reachable **and** the HTTP bridge on **9742** accepts connections. Check the in-app log after **Activate Tor**.

---

## Neural killswitch — Linux / Kali

### `nmcli networking off` permission denied

NetworkManager and some `ip link` operations need privileges. Options:

- Run KillNode with **sudo** (only where authorized), or
- Use **polkit** rules for `nmcli`, or
- Grant the packaged binary **Linux capabilities** so interface operations work **without** full root at runtime (see below).

### `cap_net_admin` on the KillNode binary (no full sudo at runtime)

If your killswitch uses `ip link set … down` / similar, you can attach **`CAP_NET_ADMIN`** to the Electron/KillNode binary so a normal user session can bring interfaces down (still a powerful capability—use only on dedicated test machines).

Example (adjust paths to your installed `KillNode` or `AppImage` extracted binary):

```bash
# Find the main executable (AppImage: extract with --appimage-extract, then use AppRun or chrome-sandbox sibling paths as appropriate)
sudo setcap cap_net_admin+eip /opt/KillNode/killnode

# Verify
getcap /opt/KillNode/killnode
```

Notes:

- **AppImage** sandboxes may block `setcap` on the mount; you may need a **installed** `.deb` or unpacked directory on a normal filesystem.
- **`cap_net_admin`** allows network stack changes; it is **not** a substitute for authorization to isolate a network you do not own.
- If `setcap` fails with “Operation not supported”, the filesystem may be `nosuid`/`noexec` (e.g. some live USB layouts)—install to `ext4` on disk.

### `rfkill` path fails

Install `rfkill` or rely on `nmcli`. Some hardware killswitches are firmware-gated and cannot be toggled from userspace.

### I bricked my networking

Use another interface, physical console, or recovery mode. The in-app **Restore hint** prints generic recovery commands (`nmcli networking on`, `ip link set … up`, etc.).

---

## CI

### Website job cannot find database

`ci.yml` creates `website/data` before `prisma migrate deploy`. The schema URL points at `file:../data/killnode.db`; no `DATABASE_URL` env var is required for the website package.

### Release uploads empty archives

Confirm `npm run package --workspace=desktop` succeeded on that runner and that `desktop/release/*` contains the expected `.exe`, `.AppImage`, or `.dmg`.

---

Still stuck? Re-read [USAGE.md](./USAGE.md) and verify your threat model matches what KillNode actually implements—not what you wish it implemented.
