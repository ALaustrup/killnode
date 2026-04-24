# KillNode

[![CI](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml/badge.svg)](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Alaustrup/killnode)](https://github.com/Alaustrup/killnode/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**KillNode** is a privacy-focused desktop application for Windows and Linux built around three core pillars: **Tor Orchestration** (including real control-port usage, Pluggable Transports, and live circuit telemetry), a local **Proxy Mesh** (HTTP + SOCKS5 gateways into Tor), and a **Neural Killswitch** that severs your network on demand.

The project is a **monorepo** containing:

| Workspace | Description |
|-----------|-------------|
| [`website/`](./website/) | Next.js 15 marketing site, blog, and admin surface — deployed at [killnode.vercel.app](https://killnode.vercel.app) |
| [`desktop/`](./desktop/) | Electron + TypeScript desktop application |
| [`docs/`](./docs/) | Extended documentation |

> **Alpha release.** Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) before using. macOS builds are planned for Phase 2.

---

## Download

Grab the latest installer from [GitHub Releases](https://github.com/Alaustrup/killnode/releases/latest) or visit the [website download page](https://killnode.vercel.app).

| Platform | Installer | Portable |
|----------|-----------|---------|
| Windows | `KillNode-*-win.exe` (NSIS) | `KillNode-*-win.zip` |
| Linux | `KillNode-*-linux.deb` | `KillNode-*-linux.AppImage` |
| macOS | — *(Phase 2)* | — |

For step-by-step installation instructions see **[docs/INSTALL.md](./docs/INSTALL.md)**.

---

## Features

### Tor Orchestrator
- **Pre-bundled Tor** — Tor Expert Bundle (v15.0.9) ships inside the installer; no separate installation needed.
- **Real control-port integration** — cookie authentication on port 9051; `SIGNAL NEWNYM` (New Identity), `GETINFO bootstrap-phase` (live 0–100% progress bar), `GETINFO circuit-status` (live circuit count).
- **Pluggable Transports / obfs4 bridges** — paste bridge lines from [bridges.torproject.org](https://bridges.torproject.org); KillNode writes `UseBridges 1 / ClientTransportPlugin obfs4 exec lyrebird / Bridge obfs4 …` into the torrc automatically. `lyrebird` is bundled inside the Tor Expert Bundle — no extra binary needed.
- **Ghost mode** — sets `MaxCircuitDirtiness 45` for aggressive circuit rotation.
- **Exit region hint** — steer exit nodes to Americas / Europe / Asia / EU-strict.

### Proxy Mesh
- **HTTP bridge** — `proxy-chain` on port **9742** → Tor SOCKS; usable by any HTTP-aware application.
- **Hardened SOCKS5 gateway** — port **9741** → Tor SOCKS; supports IPv4, hostname, and IPv6; proper error codes and buffered reads.
- **Electron session proxy** — applied automatically after Tor bootstraps.

### Neural Killswitch
- **One-click ordered teardown** — proxy stack → Tor → OS-level network severance.
- **Dead-man timer** — optional (30 s / 60 s / 120 s / 5 min). If Tor disconnects unexpectedly and does not come back within N seconds, the killswitch fires automatically.
- **Dirty-shutdown detection** — on next launch, KillNode warns if Tor was active when the app last exited unexpectedly.

### App
- **System tray** — runs minimized; restore or quit from the tray icon.
- **SQLite settings store** — lightweight key/value store in Electron `userData`; no remote database required.

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [docs/INSTALL.md](./docs/INSTALL.md) | End users | Platform-by-platform installation guide |
| [USAGE.md](./USAGE.md) | End users | Help guide — Tor Orchestrator, Proxy Mesh, Killswitch, Bridges |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | All | Common errors and fixes |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Developers | System design and code layout |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Developers | How to build, test, and contribute |
| [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) | All | Ethics agreement, liability disclaimer, privacy policy |
| [PHASED_DEVELOPMENT.md](./PHASED_DEVELOPMENT.md) | All | Roadmap — Phase 1 hardening → Phase 4 BrowserView |

---

## Quick start (developers)

### Prerequisites

- **Node.js 20+** and **npm 10+**
- **Git**
- A Tor binary for desktop testing (Tor Expert Bundle or system `tor`)
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
│   ├── resources/tor/              # Tor binary placeholder (not shipped)
│   └── src/
│       ├── main/                   # Electron main process (Node 22)
│       ├── preload/                # IPC bridge (contextBridge)
│       └── renderer/               # Frontend UI (Vite)
├── docs/                           # Extended documentation
├── website/
│   ├── prisma/                     # PostgreSQL schema (Post)
│   └── src/
│       ├── app/                    # Next.js App Router pages + API routes
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
git tag v0.2.0
git push origin v0.2.0
```

---

## Deployment (website)

The website is deployed to [Vercel](https://vercel.com) from the monorepo root. The `vercel.json` at the root sets the correct build command (`cd website && npx prisma generate && next build`) and output directory.

Required Vercel environment variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `ADMIN_SESSION_SECRET` | 32-byte hex secret (`openssl rand -hex 32`) |
| `GITHUB_REPO_OWNER` | `Alaustrup` |
| `GITHUB_REPO_NAME` | `killnode` |
| `GITHUB_TOKEN` | Optional — raises GitHub API rate limit for download widget |

See **[docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)** for the full deployment walkthrough.

---

## Security model

- **Renderer:** `contextIsolation: true`, `nodeIntegration: false`.
- **Preload:** explicit allow-list of `ipcRenderer.invoke` channels; no arbitrary Node access exposed to the renderer.
- **Main process:** all privileged operations (Tor, proxy, filesystem, network) isolated here.
- **WebTorrent:** `utp`, `dht`, `lsd`, `webSeeds` disabled; tracker HTTP(S) via `socks-proxy-agent`. Peer wire remains TCP — this is not equivalent to Tor Browser anonymity. See [USAGE.md](./USAGE.md#threat-model) for full details.

---

## License

[MIT](./LICENSE). Bundled and peer dependencies (Tor Expert Bundle, Prisma, Next.js, Electron, proxy-chain, socks) carry their own licenses.

---

## Maintainer

[Alaustrup](https://github.com/Alaustrup)
