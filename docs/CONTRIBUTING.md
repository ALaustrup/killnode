# KillNode — Contributing Guide

Thank you for contributing to KillNode. This guide covers setting up the development environment, the coding standards, and the release process.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Running the Website Locally](#3-running-the-website-locally)
4. [Running the Desktop App Locally](#4-running-the-desktop-app-locally)
5. [Building and Packaging](#5-building-and-packaging)
6. [Code Style & Standards](#6-code-style--standards)
7. [Testing](#7-testing)
8. [Making a Pull Request](#8-making-a-pull-request)
9. [Cutting a Desktop Release](#9-cutting-a-desktop-release)
10. [Deploying the Website](#10-deploying-the-website)
11. [Environment Variables Reference](#11-environment-variables-reference)

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 20 LTS or 22 LTS | Runtime for website and desktop tooling |
| npm | 10+ | Package manager (workspaces) |
| Git | Any modern | Version control |
| Python | 3.11 | Required by `node-gyp` for native modules (`distutils` was removed in 3.12+) |
| Tor binary | any stable | Desktop dev/testing — see [docs/INSTALL.md](./INSTALL.md#5-tor-binary-setup) |
| PostgreSQL | 15+ **or** Neon account | Website local dev |

**Optional:**
- Docker — simplest way to run a local PostgreSQL instance.
- VS Code — the repo includes `extensions.json` with recommended extensions.

---

## 2. Repository Setup

```bash
git clone https://github.com/Alaustrup/killnode.git
cd killnode

# Install all workspace dependencies from the single lock file
npm install
```

This installs dependencies for both `website/` and `desktop/` workspaces. Shared packages are hoisted to the root `node_modules/`.

---

## 3. Running the Website Locally

### 3a. Environment file

```bash
cd website
cp .env.example .env
```

Edit `website/.env`:

```dotenv
# Neon (recommended) or local Postgres
DATABASE_URL="postgresql://killnode:killnode@localhost:5432/killnode"
DIRECT_URL="postgresql://killnode:killnode@localhost:5432/killnode"

# Admin credentials (local dev only — change in production)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="killnode2026"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_SESSION_SECRET="<your-32-byte-hex-secret>"

# GitHub Releases widget
GITHUB_REPO_OWNER="Alaustrup"
GITHUB_REPO_NAME="killnode"
GITHUB_TOKEN=""   # optional; increases rate limit
```

### 3b. Start a local PostgreSQL (Docker)

```bash
docker run -d \
  --name kn-pg \
  -e POSTGRES_USER=killnode \
  -e POSTGRES_PASSWORD=killnode \
  -e POSTGRES_DB=killnode \
  -p 5432:5432 \
  postgres:16
```

### 3c. Bootstrap the database

```bash
# Inside website/
npx prisma generate
npx prisma migrate deploy
npx prisma db seed       # loads sample posts from data/posts.json
```

### 3d. Start the dev server

```bash
cd ..   # back to monorepo root
npm run dev:web
# → http://localhost:3000
```

The admin panel is at `http://localhost:3000/admin/login`.

---

## 4. Running the Desktop App Locally

```bash
# From the monorepo root — generates the Prisma client then opens electron-vite dev
npm run dev:desktop
```

This runs:
1. `prisma generate --schema prisma/schema.prisma` (inside `desktop/`)
2. `electron-vite dev` — starts the renderer dev server, watches main/preload, and launches Electron.

**Environment variable:** `DATABASE_URL` is set automatically to `file:./data/desktop.db` in the desktop `.env.example`. Create `desktop/.env` if you need to override:

```dotenv
DATABASE_URL="file:./data/desktop.db"
```

The SQLite database is created automatically on first launch inside Electron's `userData` directory. The `data/` path in the env var is only used by `prisma generate` during build/dev — the runtime path is derived from `app.getPath("userData")`.

### Tor in dev mode

The download script fetches, verifies (SHA256), and extracts the Tor Expert Bundle automatically:

```bash
# Run once from desktop/ — places tor.exe / tor in resources/tor/
node scripts/download-tor.mjs
```

The script skips the download if the binary already exists (fast-path). Set `FORCE_TOR_DOWNLOAD=1` to re-download. The binary is gitignored — each developer runs the script once.

Alternatively, install system Tor (`sudo apt-get install tor`) or Tor Browser — KillNode's path search will find either.

---

## 5. Building and Packaging

### Website production build

```bash
npm run build:web    # prisma generate + next build
npm run start:web    # serve the production build locally
```

### Desktop production build (no installer)

```bash
npm run build:desktop    # prisma generate + electron-vite build
                         # output: desktop/out/
```

### Desktop package (with installer)

```bash
npm run package:desktop  # downloads + verifies Tor, builds, packages with electron-builder
                         # output: desktop/release/
```

The `package` script runs three steps in order:
1. `node scripts/download-tor.mjs` — fetches and SHA256-verifies the Tor Expert Bundle
2. `npm run build` — Prisma generate + electron-vite build
3. `electron-builder --publish never` — creates platform installers

Artifacts:
- `desktop/release/KillNode-*-win.exe` — Windows NSIS installer
- `desktop/release/KillNode-*-win.zip` — Windows portable
- `desktop/release/KillNode-*-linux.AppImage` — Linux portable
- `desktop/release/KillNode-*-linux.deb` — Debian/Ubuntu package

### TypeCheck only

```bash
npm run typecheck:desktop   # prisma generate + tsc --noEmit
npm run lint:web             # ESLint on the website
```

---

## 6. Code Style & Standards

### TypeScript

- `strict: true` is enabled in all `tsconfig.json` files. Fix all type errors before submitting a PR.
- Prefer explicit types for function parameters and return values in public APIs.
- Use `unknown` instead of `any` where possible. If `any` is necessary, add an `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment with a brief justification.

### Comments

- Comment **why**, not **what**. Do not comment obvious syntax.
- Add comments for non-obvious design decisions, security trade-offs, and workarounds (e.g., the ESM dynamic-import pattern in `torrent-service.ts`).

### ESM / CJS in the desktop main process

`electron-vite` bundles the main process as CommonJS. Do **not** use static `import` for packages that are ESM-only (`webtorrent`, `magnet-uri`). Always use dynamic `await import()` via a lazy-loading getter, as in `torrent-service.ts`. See [docs/ARCHITECTURE.md](./ARCHITECTURE.md#module-loading-esm--cjs) for the full explanation.

### Git commits

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.
Scopes: `desktop`, `website`, `ci`, `docs`.

Examples:
```
feat(desktop): add circuit-count display to status bar
fix(desktop): replace static ESM import with dynamic import() for webtorrent
docs: rewrite USAGE.md as end-user help guide
ci: pin Python 3.11 for node-gyp compatibility
```

---

## 7. Testing

The project does not yet have a formal automated test suite (Phase 1 hardening). Current validation:

| Check | Command | What it covers |
|-------|---------|----------------|
| TypeScript typecheck | `npm run typecheck:desktop` | All main-process types |
| ESLint | `npm run lint:web` | Website code style and quality |
| Next.js build | `npm run build:web` | Full website build (catches runtime import issues) |
| Desktop build | `npm run build:desktop` | Full Electron build |

Before submitting a PR, run **all four checks** and ensure they pass. CI will verify the same.

### Manual testing checklist

For changes that touch Tor, proxy, or killswitch logic, manually verify:

- [ ] Tor activates and the status bar goes green.
- [ ] `curl --proxy http://127.0.0.1:9742 https://check.torproject.org/api/ip` returns a Tor exit IP.
- [ ] Deactivating Tor clears the Electron session proxy.
- [ ] Adding a magnet link creates a torrent row with telemetry.
- [ ] The killswitch fires without errors on your target platform.

---

## 8. Making a Pull Request

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes, following the code style above.
3. Run all validation checks locally (typecheck, lint, build).
4. Push your branch and open a PR against `main`.
5. The CI workflow will automatically run on your PR. All checks must pass.
6. Address review comments and update your branch.

**PR description should include:**
- What changed and why.
- How to test the change manually.
- Any security implications.

---

## 9. Cutting a Desktop Release

Only the maintainer pushes release tags. Process:

1. Update the version in `desktop/package.json` (and optionally `website/package.json` if the website is also updated).
2. Commit the version bump:
   ```bash
   git add desktop/package.json
   git commit -m "chore: bump desktop version to 0.2.0"
   git push origin main
   ```
3. Tag and push:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
4. The `release-desktop.yml` workflow runs automatically and:
   - Packages Windows and Linux installers.
   - Uploads them to a new GitHub Release for that tag.
5. The website's download widget picks up the new release automatically (via `/api/releases/latest`).

---

## 10. Deploying the Website

### Initial setup (one-time)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. The `vercel.json` at the monorepo root configures everything automatically — do **not** set a custom root directory in Vercel's UI.
3. Add the required environment variables in the Vercel dashboard (see [Section 11](#11-environment-variables-reference)).
4. Deploy.

### Re-deploying

Every push to `main` triggers an automatic Vercel deployment. No manual action needed.

### Applying database schema changes

Vercel's build command does **not** run `prisma migrate deploy` (removed to avoid Neon cold-start timeouts). Apply migrations manually before pushing:

```bash
# Local machine with direct Neon connection string
cd website
DIRECT_URL="<neon-direct-url>" npx prisma migrate deploy
```

Then push your code — the next Vercel deployment will run `prisma generate` and pick up the updated schema.

---

## 11. Environment Variables Reference

### Website (`website/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL pooled connection (Neon pgBouncer) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection (for Prisma Migrate) |
| `ADMIN_USERNAME` | No | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | No | Admin login password (default: `killnode2026`) |
| `ADMIN_SESSION_SECRET` | Yes (prod) | 32+ byte hex secret for JWT signing |
| `GITHUB_REPO_OWNER` | Yes | GitHub user/org owning the killnode repo |
| `GITHUB_REPO_NAME` | Yes | Repository name (`killnode`) |
| `GITHUB_TOKEN` | No | GitHub PAT for higher API rate limits |

### Desktop (`desktop/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (build) | SQLite path used by `prisma generate` (e.g., `file:./data/desktop.db`) — runtime path is set by the app from `app.getPath("userData")` |

### CI secrets (GitHub Actions)

| Secret | Used by | Description |
|--------|---------|-------------|
| `GITHUB_TOKEN` | `release-desktop.yml` | Auto-provided by Actions — uploads release assets |
| `CSC_LINK` | `release-desktop.yml` | Base64-encoded code-signing certificate (Phase 2) |
| `CSC_KEY_PASSWORD` | `release-desktop.yml` | Password for the signing certificate (Phase 2) |
