# KillNode

[![CI](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml/badge.svg)](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Alaustrup/killnode)](https://github.com/Alaustrup/killnode/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**KillNode v1.0.1 Alpha** — Internet anonymity tooling for operators. The project combines a **desktop application** for full Tor orchestration, a **neural killswitch**, and a **proxy mesh**; with a **website** that includes a built-in **server-side web proxy browser** accessible from any browser without installation.

The project is a **monorepo** containing:

| Workspace | Description |
|-----------|-------------|
| [`website/`](./website/) | Next.js 15 site, blog, proxy browser (`/browse`), and admin panel — deployed at [killnode.vercel.app](https://killnode.vercel.app) |
| [`desktop/`](./desktop/) | Electron + TypeScript desktop application |
| [`docs/`](./docs/) | Extended documentation |

> **Alpha release.** Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) before using.

---

## Download

Grab the latest installer from [GitHub Releases](https://github.com/Alaustrup/killnode/releases/latest) or visit the [website download page](https://killnode.vercel.app).

| Platform | Installer | Portable |
|----------|-----------|---------|
| Windows | `KillNode-*-win.exe` (NSIS) | `KillNode-*-win.zip` |
| Linux | `KillNode-*-linux.deb` | `KillNode-*-linux.AppImage` |
| macOS | — *(Phase 3)* | — |

For step-by-step installation instructions see **[docs/INSTALL.md](./docs/INSTALL.md)**.

---

## Features

### Web Proxy Browser (website — no install)

Available at [killnode.vercel.app/browse](https://killnode.vercel.app/browse). Routes all requests through KillNode's servers — your ISP only sees traffic to `killnode.vercel.app`.

- **URL rewriting** — all `href`, `src`, `action`, `srcset`, and CSS `url()` references are rewritten to proxy through the `/api/browse` endpoint.
- **Dynamic interception** — `window.fetch` and `XMLHttpRequest.prototype.open` are patched in an injected inline script so JavaScript-initiated requests also route through the proxy.
- **Floating navigation bar** — injected into every proxied page; persistent URL input, Back, Forward, return to `/browse`.
- **Quick-access tools** — one-click buttons for check.torproject.org, dnsleaktest.com, ipleak.net, browserleaks.com.
- **SSRF protection** — private/loopback IPs, RFC-1918 ranges, AWS metadata, `.local` / `.internal` domains are blocked at the route handler.

### Tor Orchestrator (desktop)
- **Pre-bundled Tor** — Tor Expert Bundle (v15.0.9) ships inside the installer; no separate installation needed.
- **Real control-port integration** — cookie authentication on port 9051; `SIGNAL NEWNYM` (New Identity), `GETINFO bootstrap-phase` (live 0–100% progress bar), `GETINFO circuit-status` (live circuit count).
- **Pluggable Transports / obfs4 bridges** — paste bridge lines from [bridges.torproject.org](https://bridges.torproject.org); KillNode writes `UseBridges 1 / ClientTransportPlugin obfs4 exec lyrebird / Bridge obfs4 …` into the torrc. `lyrebird` is bundled — no extra binary needed.
- **Ghost mode** — sets `MaxCircuitDirtiness 45` for aggressive circuit rotation.
- **Exit region hint** — steer exit nodes to Americas / Europe / Asia / EU-strict.

### Proxy Mesh (desktop)
- **HTTP bridge** — `proxy-chain` on port **9742** → Tor SOCKS; usable by any HTTP-aware application.
- **Hardened SOCKS5 gateway** — port **9741** → Tor SOCKS; supports IPv4, hostname, and IPv6; proper error codes and buffered reads.
- **Electron session proxy** — applied automatically after Tor bootstraps.

### Neural Killswitch (desktop)
- **One-click ordered teardown** — proxy stack → Tor → OS-level network severance.
- **Dead-man timer** — optional (30 s / 60 s / 120 s / 5 min). If Tor disconnects unexpectedly and does not recover within N seconds, the killswitch fires automatically.
- **Dirty-shutdown detection** — on next launch, KillNode warns if Tor was active when the app last exited unexpectedly.

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [docs/INSTALL.md](./docs/INSTALL.md) | End users | Platform-by-platform installation guide |
| [USAGE.md](./USAGE.md) | End users | Help guide — Proxy Browser, Tor Orchestrator, Proxy Mesh, Killswitch, Bridges |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | All | Common errors and fixes |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Developers | System design and code layout |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Developers | How to build, test, and contribute |
| [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) | All | Ethics agreement, liability disclaimer, privacy policy |
| [PHASED_DEVELOPMENT.md](./PHASED_DEVELOPMENT.md) | All | Roadmap |

---

## Quick start (developers)

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Git**
- A PostgreSQL database for local website dev (or a free [Neon](https://neon.tech) project)

### Install

```bash
git clone https://github.com/Alaustrup/killnode.git
cd killnode
npm install
```

### Run the website locally

```bash
cd website
cp .env.example .env
# Edit .env — fill in DATABASE_URL, DIRECT_URL, ADMIN_SESSION_SECRET
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ..
npm run dev:web          # → http://localhost:3000
```

### Run the desktop app locally

```bash
# From the monorepo root:
npm run dev:desktop      # generates Prisma client then opens electron-vite dev
```

The SQLite database is bootstrapped automatically on first launch inside Electron's `userData` directory — no setup required.

### Package the desktop app

```bash
npm run package:desktop  # → desktop/release/
```

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** for the full developer workflow.

---

## Monorepo layout

```
killnode/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + build on every push/PR
│       └── release-desktop.yml     # package + publish on v* tags
├── desktop/
│   ├── prisma/                     # SQLite schema (Setting key/value store)
│   ├── resources/tor/              # Bundled Tor Expert Bundle
│   └── src/
│       ├── main/                   # Electron main process (Node 22)
│       ├── preload/                # IPC bridge (contextBridge)
│       └── renderer/               # Frontend UI (Vite)
├── docs/                           # Extended documentation
├── website/
│   ├── data/posts.json             # Blog post seed file (always loaded)
│   ├── prisma/                     # PostgreSQL schema (Post)
│   └── src/
│       ├── app/                    # Next.js App Router pages + API routes
│       │   ├── api/browse/         # Server-side proxy endpoint
│       │   └── browse/             # Proxy browser UI page
│       ├── components/             # React components
│       └── lib/                    # Auth, DB, session utilities
├── vercel.json                     # Vercel deployment config
├── README.md
├── USAGE.md
├── TROUBLESHOOTING.md
├── LEGAL_AND_ETHICS.md
└── PHASED_DEVELOPMENT.md
```

---

## CI / CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push / PR to `main`, `develop` | Runs website lint + build (with Postgres service) and desktop typecheck + build on Ubuntu, Windows, macOS |
| `release-desktop.yml` | Push a `v*` tag | Packages the desktop app with `electron-builder` on Windows and Linux runners, uploads installers to GitHub Releases |

To cut a new release:

```bash
git tag v1.0.1
git push origin v1.0.1
```

---

## Deployment (website)

The website is deployed to [Vercel](https://vercel.com) from the monorepo root. The `vercel.json` sets the build command and output directory. Blog posts in `data/posts.json` are always served regardless of seed status — `readPosts()` merges the JSON file with the database at read time.

Required Vercel environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `ADMIN_SESSION_SECRET` | 32-byte hex secret (`openssl rand -hex 32`) |
| `GITHUB_REPO_OWNER` | `Alaustrup` |
| `GITHUB_REPO_NAME` | `killnode` |
| `GITHUB_TOKEN` | Optional — raises GitHub API rate limit for download widget |

---

## Security model

- **Renderer:** `contextIsolation: true`, `nodeIntegration: false`.
- **Preload:** explicit allow-list of `ipcRenderer.invoke` channels; no arbitrary Node access exposed to the renderer.
- **Main process:** all privileged operations (Tor, proxy, filesystem, network) isolated here.
- **Control port:** cookie authentication only; port 9051 bound to `127.0.0.1`.
- **Web proxy:** SSRF protection blocks all private/loopback/link-local ranges; only `http:` and `https:` schemes allowed.

---

## License

[MIT](./LICENSE). Bundled and peer dependencies (Tor Expert Bundle, Prisma, Next.js, Electron, proxy-chain, socks) carry their own licenses.

---

## Maintainer

[Alaustrup](https://github.com/Alaustrup)
