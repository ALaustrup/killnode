# KillNode

Monorepo for **KillNode**: a cyberpunk **Next.js 15** site (`/website`), an **Electron + TypeScript** security desktop (`/desktop`), and **documentation** (`/docs`, legal files at the repository root).

**Maintainer:** [Alaustrup](https://github.com/Alaustrup)

---

## Layout

| Path | Role |
|------|------|
| `website/` | Next.js 15 + Tailwind + shadcn-style UI, Prisma + **SQLite** blog/admin, GitHub Releases API download matrix |
| `desktop/` | Electron + Prisma + SQLite (userData), Tor, local HTTP/SOCKS mesh into Tor, optional SS/V2Ray children, WebTorrent (main), magnet handler, neural killswitch |
| `docs/` | Documentation mirrors + index |
| `.github/workflows/` | `ci.yml` (verify) · `release-desktop.yml` (tag builds → GitHub Release assets) |

---

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **npm 10+**
- **Tor** binary for desktop (Expert Bundle under `desktop/resources/tor/` or system `tor`)

---

## Install

```bash
npm install
```

---

## Quick start (Alpha — local databases + clients)

From the **repository root** after `npm install`:

**Website (Next.js + SQLite blog)**

```bash
mkdir -p website/data
cd website
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..
npm run build:web
```

The Prisma datasource URL is **`file:../data/killnode.db`** in `website/prisma/schema.prisma` (resolves to `website/data/killnode.db`). The generated client is written to **`website/src/generated/prisma`**. On **Windows**, `npm run build` uses **`website/scripts/run-next-build.mjs`** to avoid `EPERM` when the toolchain scans profile junctions—see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Desktop (Electron + Prisma in userData)**

```bash
cd desktop
npx prisma generate --schema prisma/schema.prisma
npm run build
cd ..
```

The desktop client is generated to **`desktop/src/main/generated/prisma`**; **`electron-vite`** copies it to **`desktop/out/main/generated`** on build for packaged runs.

---

## Website (`website/`)

### First-time database (local)

From `website/` (or via npm scripts from root):

```bash
cd website
cp .env.example .env   # admin + GitHub API (no DATABASE_URL required)
mkdir -p data
npx prisma generate
npx prisma migrate dev   # or: npx prisma migrate deploy
npx prisma db seed       # imports sample rows from data/posts.json
```

SQLite lives at **`website/data/killnode.db`**, configured in **`website/prisma/schema.prisma`**.

### Develop

```bash
npm run dev:web
```

### Production build

```bash
# Ensures migrate + seed + Next production build (see website/package.json "build")
npm run build:web
npm run start:web
```

### GitHub download API

The landing page calls `GET /api/releases/latest`, which proxies the GitHub API for `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME`. Optional `GITHUB_TOKEN` improves rate limits.

### Prisma client output

The website uses a **workspace-local** generated client at `website/src/generated/prisma` (see `website/prisma/schema.prisma`). Run `npx prisma generate` inside `website/` whenever the schema changes.

---

## Desktop (`desktop/`)

### Prisma (SQLite in app data)

At runtime the database file is:

`%APPDATA%/killnode/killnode.db` (Windows) · `~/Library/Application Support/killnode/killnode.db` (macOS) · `~/.config/killnode/killnode.db` (Linux)

Schema DDL is bootstrapped on startup from `sql-bootstrap.ts` (kept in sync with `desktop/prisma/schema.prisma`).

The generated client lives in `desktop/src/main/generated/prisma` and is **copied next to `out/main`** during `electron-vite build`.

### Develop

```bash
npm run dev:desktop
```

### Typecheck / build

```bash
npm run typecheck --workspace=desktop
npm run build --workspace=desktop
```

### Package installers

```bash
npm run package --workspace=desktop
```

Artifacts land in `desktop/release/` (Windows `.exe` NSIS + zip, Linux **AppImage** + deb, macOS **DMG** + zip).

**Signing (macOS):** provide `CSC_LINK` (`.p12`) and `CSC_KEY_PASSWORD` via CI secrets or local env. **Notarization** is intentionally out of scope for the default workflow—enable it in your own pipeline if required.

---

## CI / Releases

- **CI** (`.github/workflows/ci.yml`): website lint + migrate/seed + build; desktop typecheck + build on Ubuntu, Windows, macOS.
- **Desktop releases** (`.github/workflows/release-desktop.yml`): triggered on tags `v*`. Each OS runner packages and uploads `desktop/release/*` to the GitHub Release.

---

## Security model (desktop)

- Renderer: `contextIsolation: true`, `nodeIntegration: false`.
- Preload: **allow-listed** `ipcRenderer.invoke` channels + telemetry/toast listeners + `webUtils.getPathForFile` for drag/drop seeding.
- Main: Tor, `proxy-chain` **HTTP bridge :9742 → Tor SOCKS**, **SOCKS5 ingress :9741 → Tor**, optional obfuscation child processes, WebTorrent with SOCKS-backed **tracker** HTTP(S) via `socks-proxy-agent` (peer wire remains TCP; see [USAGE.md](./USAGE.md)).

---

## Documentation

| File | Purpose |
|------|---------|
| [USAGE.md](./USAGE.md) | Operator guide (proxy mesh, killswitch, torrents) |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Build, Prisma, Tor, sudo/Kali notes |
| [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) | Ethics, liability, privacy, terms |
| [PHASED_DEVELOPMENT.md](./PHASED_DEVELOPMENT.md) | Roadmap (Phase 3 libp2p + Double Ratchet, Phase 4 BrowserView) |
| [docs/README.md](./docs/README.md) | Documentation hub |

---

## Git remote (example)

```bash
git remote add origin https://github.com/Alaustrup/killnode.git
git push -u origin main
```

---

## License

See [LICENSE](./LICENSE). Tor, WebTorrent, Prisma, and other dependencies carry their own licenses.
