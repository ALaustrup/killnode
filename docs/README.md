# KillNode

Monorepo for **KillNode**: a cyberpunk **Next.js 15** site (`/website`), an **Electron + TypeScript** security desktop (`/desktop`), and **documentation** (`/docs`, legal files at the repository root).

**Maintainer:** [Alaustrup](https://github.com/Alaustrup)

---

## Layout

| Path | Role |
|------|------|
| `website/` | Next.js 15 + Tailwind + shadcn-style UI, Prisma + **PostgreSQL (Neon)** blog/admin, GitHub Releases API download matrix |
| `desktop/` | Electron + Prisma + SQLite (userData), Tor, local HTTP/SOCKS mesh into Tor, optional SS/V2Ray children, WebTorrent (main), magnet handler, neural killswitch |
| `docs/` | Documentation mirrors + index |
| `.github/workflows/` | `ci.yml` (verify + Postgres) · `release-desktop.yml` (tag builds → GitHub Release assets) |

---

## Prerequisites

- **Node.js 20+**
- **npm 10+**
- **Tor** binary for desktop (Expert Bundle under `desktop/resources/tor/` or system `tor`)
- **PostgreSQL** (local) **or** a free [Neon](https://neon.tech) project for the website database

---

## Install

```bash
npm install
```

---

## Deploy website to Vercel (recommended)

### 1. Create a Neon database

Sign up at [neon.tech](https://neon.tech), create a project, then copy the two connection strings from **Connection Details**:

- **Pooled (pgBouncer)** → `DATABASE_URL`
- **Direct** → `DIRECT_URL`

### 2. Import the repo into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select `Alaustrup/killnode`.
2. In **Configure Project**, set:
   - **Root Directory:** `website`
   - **Framework:** Next.js (auto-detected)
   - **Install Command:** `cd .. && npm ci`
   - **Build Command:** `npx prisma generate && npx prisma migrate deploy && next build`
   - **Output Directory:** `.next`
3. Under **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `ADMIN_USERNAME` | your admin username |
| `ADMIN_PASSWORD` | strong password |
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 32` output |
| `GITHUB_REPO_OWNER` | `Alaustrup` |
| `GITHUB_REPO_NAME` | `killnode` |
| `GITHUB_TOKEN` | optional — increases API rate limit |

4. Click **Deploy**.

Vercel will run `prisma migrate deploy` on every deploy to keep the schema in sync. The `website/vercel.json` handles security headers and telemetry suppression automatically.

### Re-deploy after schema changes

```bash
# Push new migration; Vercel redeploys automatically on push to main
npx prisma migrate dev --name your_change   # run locally first
git add website/prisma/migrations && git commit -m "..." && git push
```

---

## Quick start (local development)

From the **repository root** after `npm install`:

### Website (Next.js + PostgreSQL)

```bash
cd website
cp .env.example .env
# Edit .env — set DATABASE_URL and DIRECT_URL to a local Postgres or Neon dev branch
npx prisma generate
npx prisma migrate deploy
npx prisma db seed       # imports sample posts from data/posts.json
cd ..
npm run dev:web          # http://localhost:3000
```

**Local Postgres via Docker (optional):**

```bash
docker run -d --name kn-pg -e POSTGRES_USER=killnode -e POSTGRES_PASSWORD=killnode \
  -e POSTGRES_DB=killnode -p 5432:5432 postgres:16
# Then in website/.env:
# DATABASE_URL="postgresql://killnode:killnode@localhost:5432/killnode"
# DIRECT_URL="postgresql://killnode:killnode@localhost:5432/killnode"
```

**Windows build** uses `website/scripts/build.mjs` to sandbox `USERPROFILE`/`HOME` and avoid EPERM on profile junctions — see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

### Desktop (Electron + Prisma in userData)

```bash
cd desktop
npx prisma generate --schema prisma/schema.prisma
npm run dev
```

The desktop database (SQLite) lives in Electron's `userData` directory and is bootstrapped from `sql-bootstrap.ts` on first run. No migrations needed.

---

## Website (`website/`)

### Database

- **Production / Vercel:** PostgreSQL via [Neon](https://neon.tech). Connection strings set as Vercel env vars.
- **Local:** local Postgres or Neon dev-branch URL in `website/.env`.
- **Client:** generated at `website/src/generated/prisma` by `npx prisma generate`.

### Production build

```bash
npm run build:web   # generate + migrate + seed + next build
npm run start:web
```

### GitHub download API

`GET /api/releases/latest` — proxies the GitHub API for `GITHUB_REPO_OWNER`/`GITHUB_REPO_NAME`. Set `GITHUB_TOKEN` to avoid the 60 req/hr unauthenticated limit.

---

## Desktop (`desktop/`)

### Prisma (SQLite in app data)

At runtime the database file is:

`%APPDATA%/killnode/killnode.db` (Windows) · `~/Library/Application Support/killnode/killnode.db` (macOS) · `~/.config/killnode/killnode.db` (Linux)

Schema DDL is bootstrapped on startup from `sql-bootstrap.ts` (kept in sync with `desktop/prisma/schema.prisma`). The generated client lives in `desktop/src/main/generated/prisma` and is **copied to `out/main/generated`** during `electron-vite build`.

### Typecheck / build / package

```bash
npm run typecheck --workspace=desktop
npm run build --workspace=desktop
npm run package --workspace=desktop   # → desktop/release/
```

**Signing (macOS):** provide `CSC_LINK` + `CSC_KEY_PASSWORD` via CI secrets. Notarization is out of scope for the default workflow.

---

## CI / Releases

- **CI** (`.github/workflows/ci.yml`): website — Postgres 16 service container, migrate/seed/lint/build. Desktop — typecheck + build on Ubuntu, Windows, macOS.
- **Desktop releases** (`.github/workflows/release-desktop.yml`): triggered on tags `v*`. Each OS runner packages and uploads `desktop/release/*` to the GitHub Release.

---

## Security model (desktop)

- Renderer: `contextIsolation: true`, `nodeIntegration: false`.
- Preload: **allow-listed** `ipcRenderer.invoke` channels + telemetry/toast listeners.
- Main: Tor, `proxy-chain` **HTTP bridge :9742 → Tor SOCKS**, **SOCKS5 ingress :9741 → Tor**, optional obfuscation child processes, WebTorrent with SOCKS-backed **tracker** HTTP(S) via `socks-proxy-agent` (peer wire remains TCP; see [USAGE.md](./USAGE.md)).

---

## Documentation

| File | Purpose |
|------|---------|
| [USAGE.md](./USAGE.md) | Operator guide (proxy mesh, killswitch, torrents) |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Build, Prisma, Tor, sudo/Kali notes |
| [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) | Ethics, liability, privacy, terms |
| [PHASED_DEVELOPMENT.md](./PHASED_DEVELOPMENT.md) | Roadmap (Phase 3 Double Ratchet, Phase 4 BrowserView) |
| [docs/README.md](./docs/README.md) | Documentation hub |

---

## Git remote

```bash
git remote add origin https://github.com/Alaustrup/killnode.git
git push -u origin main
```

---

## License

See [LICENSE](./LICENSE). Tor, WebTorrent, Prisma, Neon, and other dependencies carry their own licenses.
