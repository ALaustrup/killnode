# KillNode — Architecture

Technical reference for the KillNode monorepo. Intended for contributors and security reviewers.

---

## Table of Contents

1. [Monorepo Overview](#1-monorepo-overview)
2. [Website (`website/`)](#2-website-website)
   - [Stack](#stack)
   - [App Router Layout](#app-router-layout)
   - [API Routes](#api-routes)
   - [Authentication](#authentication)
   - [Database (PostgreSQL / Neon)](#database-postgresql--neon)
   - [Deployment (Vercel)](#deployment-vercel)
3. [Desktop (`desktop/`)](#3-desktop-desktop)
   - [Stack](#stack-1)
   - [Process Model](#process-model)
   - [IPC Architecture](#ipc-architecture)
   - [Main Process Services](#main-process-services)
   - [Database (SQLite / Prisma)](#database-sqlite--prisma)
   - [Module Loading (ESM / CJS)](#module-loading-esm--cjs)
   - [Build Pipeline](#build-pipeline)
4. [CI / CD](#4-ci--cd)
5. [Security Model](#5-security-model)
6. [Dependency Tree (key packages)](#6-dependency-tree-key-packages)

---

## 1. Monorepo Overview

```
killnode/                        npm workspaces monorepo
├── package.json                 root — workspace definitions + top-level scripts
├── package-lock.json            single lock file for all workspaces
├── website/                     @killnode/website — Next.js 15
├── desktop/                     @killnode/desktop — Electron 33
├── docs/                        documentation
└── .github/workflows/           CI (ci.yml) + releases (release-desktop.yml)
```

**npm workspaces** hoist shared dependencies to the root `node_modules`. Both workspaces reference the root `node_modules` via symlinks. The `--workspace` flag targets a specific package: `npm run build --workspace=desktop`.

---

## 2. Website (`website/`)

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS 3, shadcn-style components |
| Database ORM | Prisma 6 |
| Database | PostgreSQL (Neon cloud) |
| Auth | `jose` JWT — HTTP-only session cookie |
| Deployment | Vercel |
| Analytics | `@vercel/analytics` (no PII) |

### App Router Layout

```
website/src/app/
├── layout.tsx                   root layout (font, global CSS, analytics)
├── page.tsx                     landing page (hero, download widget, features)
├── not-found.tsx                global 404
├── globals.css                  Tailwind base styles
├── blog/
│   ├── page.tsx                 blog index (all published posts)
│   └── [slug]/page.tsx          individual post (static-rendered at build time)
└── admin/
    ├── login/
    │   ├── page.tsx             server component wrapper
    │   └── admin-login-client.tsx  client component (form, fetch)
    └── (protected)/             route group — layout checks session cookie
        ├── layout.tsx           auth guard (redirects to /admin/login if no valid session)
        ├── page.tsx             admin dashboard (post list)
        └── posts/
            ├── new/page.tsx     create post form
            └── [slug]/edit/page.tsx  edit post form
```

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Validate credentials, issue JWT session cookie |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/posts` | GET | List all posts (public) |
| `/api/posts` | POST | Create post (authenticated) |
| `/api/posts/[slug]` | GET | Get single post (public) |
| `/api/posts/[slug]` | PUT | Update post (authenticated) |
| `/api/posts/[slug]` | DELETE | Delete post (authenticated) |
| `/api/releases/latest` | GET | Proxy GitHub Releases API → returns latest release metadata |

### Authentication

- `jose` is used to sign and verify JWTs.
- The session cookie is `HttpOnly`, `Secure` (in production), `SameSite=Lax`.
- Session validation on protected routes is done in two places:
  - **Edge middleware** (`src/middleware.ts`): lightweight check using `auth-edge.ts` — runs on Vercel Edge Network before the route even loads.
  - **Route-group layout** (`admin/(protected)/layout.tsx`): server-side re-check for defence in depth.
- Credentials are compared using constant-time comparison to prevent timing attacks.

### Database (PostgreSQL / Neon)

```prisma
// website/prisma/schema.prisma
model Post {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  excerpt   String   @default("")
  content   String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- **`DATABASE_URL`:** pooled connection (pgBouncer) — used for all runtime queries.
- **`DIRECT_URL`:** direct (non-pooled) connection — used by Prisma Migrate for advisory-lock operations. Not required during Vercel builds (migrations run separately).
- Generated client output: `website/src/generated/prisma/`.
- Seed data: `website/data/posts.json` → loaded by `website/prisma/seed.ts`.

### Deployment (Vercel)

Configuration is split across two files:

| File | Purpose |
|------|---------|
| `vercel.json` (root) | Build command, output directory, security headers, env |
| `website/vercel.json` | Additional website-specific overrides |
| `.vercelignore` (root) | Excludes `desktop/release/` and other large artifacts |

Build command on Vercel:
```bash
cd website && npx prisma generate && next build
```

Migrations are **not** run during Vercel builds — they must be applied manually against Neon before deploying schema changes.

---

## 3. Desktop (`desktop/`)

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33.4.11 (Node.js 22 / Chromium 130) |
| Bundler | electron-vite 2 (Vite 5 for renderer, Rollup for main/preload) |
| Language | TypeScript 5 throughout |
| Database ORM | Prisma 6 |
| Database | SQLite (via Prisma sqlite provider) |
| Tor | Spawned child process (`tor` binary from Tor Expert Bundle) |
| Tor control | Native TCP socket to control port 9051 (cookie auth) |
| Proxy | `proxy-chain` (HTTP), hardened SOCKS5 gateway |
| Packaging | `electron-builder` 25 |

### Process Model

Electron uses a multi-process architecture:

```
┌─────────────────────────────────────────┐
│  Main Process (Node.js 22)              │
│  index.ts                               │
│  ├── tor-manager.ts      Tor lifecycle  │
│  ├── tor-readiness.ts    SOCKS probe    │
│  ├── local-proxy.ts      HTTP bridge    │
│  ├── socks5-gateway.ts   SOCKS5 ingress │
│  ├── torrent-service.ts  WebTorrent     │
│  ├── proxy-controller.ts Orchestrates   │
│  ├── killswitch-orchestrator.ts         │
│  ├── network-killswitch.ts  OS hooks    │
│  ├── obfuscation-bridge.ts  SS/V2Ray    │
│  ├── settings-service.ts    SQLite KV   │
│  ├── process-registry.ts    Child mgmt  │
│  ├── sql-bootstrap.ts    DB init        │
│  ├── onion-link.ts       .onion helpers │
│  ├── tray-manager.ts     System tray   │
│  └── prisma.ts           Prisma client  │
│                                         │
│  IPC (contextBridge) ←──────────────→  │
│                                         │
│  Preload Process                        │
│  preload/index.ts        allow-listed   │
│                          ipcRenderer    │
│                                         │
│  Renderer Process (Chromium)            │
│  renderer/src/main.ts   Three-card UI        │
│  renderer/src/style.css UI styles       │
└─────────────────────────────────────────┘
```

### IPC Architecture

The preload script exposes a **strictly allow-listed** `window.kn` API via `contextBridge.exposeInMainWorld`. The renderer can only call channels that are explicitly listed in `preload/index.ts`.

Renderer → Main (invoke):
```
kn:tor:start          Start Tor
kn:tor:stop           Stop Tor
kn:tor:status         Current Tor status
kn:tor:newident       SIGNAL NEWNYM (new circuits)
kn:tor:bootstrap      Bootstrap progress + circuit count
kn:proxy:status       Proxy port info and session state
kn:killswitch         Fire neural killswitch
kn:restore-hint       Recovery command hint
kn:settings:get       Read all settings
kn:settings:set       Write partial settings update
kn:dialog:tor         Native file picker for tor binary
```

Main → Renderer (on):
```
kn:toast              Show a toast notification
kn:tor:status-push    Push Tor running status change
kn:dead-man-fired     Dead-man timer has fired
kn:dirty-shutdown     Unclean exit detected on launch
```

No `nodeIntegration` is enabled in the renderer. All Node.js operations run in the main process behind the IPC boundary.

### Main Process Services

| File | Responsibility |
|------|----------------|
| `tor-manager.ts` | Writes `torrc.killnode`, spawns `tor`, handles process events |
| `tor-readiness.ts` | Polls the configured SOCKS port until it accepts TCP |
| `local-proxy.ts` | `proxy-chain` HTTP bridge: `:9742` → `socks5://127.0.0.1:<tor>` |
| `socks5-gateway.ts` | Minimal SOCKS5 server: `:9741` → Tor SOCKS for outbound TCP |
| `torrent-service.ts` | WebTorrent client lifecycle, magnet ingestion, seeding, telemetry |
| `proxy-controller.ts` | Orchestrates the activation sequence (Tor → readiness → proxies → session proxy) |
| `killswitch-orchestrator.ts` | Ordered teardown: torrent → proxies → obfuscation → Tor → network severance |
| `network-killswitch.ts` | Platform-specific network severance (`netsh`, `nmcli`/`ip`, `networksetup`) |
| `obfuscation-bridge.ts` | Spawns Shadowsocks and/or V2Ray child processes |
| `settings-service.ts` | Key/value store on top of the `Setting` Prisma model |
| `process-registry.ts` | Tracks all managed child processes; bulk-kills on shutdown |
| `sql-bootstrap.ts` | Creates database file and applies DDL on first launch (no migrations) |
| `tray-manager.ts` | System tray icon, context menu, window show/hide |
| `prisma.ts` | Singleton `PrismaClient` with SQLite database path wired to Electron `userData` |

### Database (SQLite / Prisma)

```prisma
// desktop/prisma/schema.prisma
model Setting {
  key   String @id
  value String
}
```

- The database file lives in Electron's `userData` directory (`killnode.db`).
- **No migrations** — DDL is applied from `sql-bootstrap.ts` on first launch. The schema and bootstrap SQL must be kept in sync manually.
- Generated client output: `desktop/src/main/generated/prisma/`.
- The Vite plugin `copyDesktopPrismaClient` in `electron.vite.config.ts` copies `src/main/generated` → `out/main/generated` on every build so the packaged app can resolve the client.
- `asarUnpack` in `desktop/package.json` unpacks `@prisma/**` and `.prisma/**` from the ASAR archive so the native Prisma query engine is accessible at runtime.

### Build Pipeline

```
npm run dev:desktop
  └── prisma generate --schema prisma/schema.prisma
  └── electron-vite dev
        ├── Vite dev server for renderer (HMR)
        ├── Rollup watch for main (CJS bundle → out/main/)
        └── Rollup watch for preload (CJS bundle → out/preload/)

npm run build:desktop
  └── prisma generate
  └── electron-vite build
        ├── Rollup main → out/main/index.js
        ├── Rollup preload → out/preload/index.js
        └── Vite renderer → out/renderer/
        └── copyDesktopPrismaClient plugin: src/main/generated → out/main/generated

npm run package:desktop
  └── node scripts/download-tor.mjs
        ├── Detects platform (win32 / linux / darwin)
        ├── Downloads Tor Expert Bundle v15.0.9 from torproject.org mirror chain
        ├── Verifies SHA256 against known checksum — aborts on mismatch
        └── Extracts to desktop/resources/tor/  (gitignored)
  └── npm run build:desktop
  └── electron-builder --publish never
        ├── Windows: NSIS installer + ZIP  (includes resources/tor/tor.exe)
        ├── Linux: AppImage + .deb         (includes resources/tor/tor)
        └── Output: desktop/release/
```

---

## 4. CI / CD

### `ci.yml` — Continuous Integration

Runs on push/PR to `main` and `develop`.

**Website job** (ubuntu-latest):
1. Spins up `postgres:16` service container.
2. Installs dependencies (`npm ci`).
3. Runs `prisma generate + migrate deploy + db seed` against the local Postgres.
4. Runs ESLint (`npm run lint:web`).
5. Runs `next build`.

**Desktop job** (matrix: ubuntu-latest, windows-latest, macos-latest):
1. Installs dependencies.
2. Typechecks (`tsc --noEmit` — after `prisma generate`).
3. Builds (`electron-vite build`).

No packaging or release artifacts are produced by CI; it is a pure validation gate.

### `release-desktop.yml` — Desktop Release

Triggered on any `v*` tag push.

**Matrix** (currently Windows + Linux; macOS disabled until Phase 2):
1. Checks out code.
2. Pins Python 3.11 (for `node-gyp` compatibility with `distutils`).
3. Installs Node.js 20 + dependencies.
4. Runs `npm run package` inside `desktop/` (`--publish never` prevents auto-publish).
5. Uploads `desktop/release/*` to the GitHub Release via `softprops/action-gh-release@v2`.

Cutting a release:
```bash
git tag v0.2.0 -m "Alpha 2"
git push origin v0.2.0
```

---

## 5. Security Model

### Renderer isolation

| Setting | Value | Why |
|---------|-------|-----|
| `contextIsolation` | `true` | Renderer JS cannot access Node.js globals |
| `nodeIntegration` | `false` | No `require` in renderer |
| `sandbox` | Electron default (enabled) | Renderer runs in Chromium sandbox |

### IPC channel allow-list

Only channels explicitly listed in `preload/index.ts` can be invoked by the renderer. There is no wildcard forwarding of `ipcRenderer.invoke`.

### Content Security Policy

Served by Vercel via `vercel.json` headers:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com;
connect-src 'self' https://api.github.com https://vitals.vercel-insights.com;
frame-ancestors 'none';
```

### Network threat model

See [USAGE.md — Threat Model](../USAGE.md#9-threat-model) for what is and is not protected.

---

## 6. Dependency Tree (key packages)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `electron` | 33.4.11 | Desktop runtime | MIT |
| `electron-vite` | ^2.3.0 | Dev server + bundler | MIT |
| `electron-builder` | ^25.1.8 | Installer packaging | MIT |
| `webtorrent` | ^2.5.1 | BitTorrent client (ESM-only) | MIT |
| `magnet-uri` | ^7.0.5 | Magnet link parser (ESM-only) | MIT |
| `proxy-chain` | ^2.4.1 | HTTP → SOCKS proxy bridge | Apache-2.0 |
| `socks-proxy-agent` | ^8.0.4 | SOCKS agent for Node.js `http` | MIT |
| `socks` | ^2.8.3 | SOCKS protocol primitives | MIT |
| `@prisma/client` | ^6.3.0 | Database ORM client | Apache-2.0 |
| `prisma` | ^6.3.0 | Prisma CLI + schema tooling | Apache-2.0 |
| `next` | ^15.0.3 | Web framework | MIT |
| `jose` | ^5.9.6 | JWT signing / verification | MIT |
| `tailwindcss` | ^3.4.14 | Utility-first CSS | MIT |

Full dependency graph: see `package-lock.json` at the repository root.
