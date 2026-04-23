# KillNode

[![CI](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml/badge.svg)](https://github.com/Alaustrup/killnode/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Alaustrup/killnode)](https://github.com/Alaustrup/killnode/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

**KillNode** is a privacy-focused desktop application for Windows and Linux that routes your traffic through Tor, manages a local HTTP/SOCKS proxy mesh, handles WebTorrent with SOCKS-backed trackers, and provides a neural killswitch to sever your network connection on demand.

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

- **Tor integration** — Tor Expert Bundle (v15.0.9) is **pre-bundled** in the installer; no separate Tor installation needed. KillNode spawns and manages the Tor process and routes the Electron session through it automatically.
- **HTTP proxy bridge** — `proxy-chain` HTTP proxy on port **9742** forwarding to Tor's SOCKS port, usable by any HTTP-aware application.
- **SOCKS5 ingress** — minimal SOCKS5 gateway on port **9741** for native SOCKS clients.
- **Ghost mode** — tightened circuit-dirtiness settings for more aggressive circuit rotation.
- **Optional obfuscation** — launch Shadowsocks or V2Ray child processes (binaries not included) for bridge-based censorship circumvention.
- **Neural killswitch** — ordered teardown: WebTorrent → proxy stack → Tor → network severance. One click to go dark.
- **WebTorrent (main process)** — add magnets, seed files, drag-and-drop. Tracker HTTP requests routed through Tor SOCKS. `utp`, `dht`, `lsd`, and `webSeeds` disabled to shrink UDP/WebRTC surface.
- **Magnet URI handler** — register KillNode as the OS handler for `magnet:` links.
- **System tray** — runs minimized; restore or quit from the tray icon.
- **SQLite settings store** — lightweight key/value store and torrent-job history in Electron `userData`, no remote database required.

---

## Documentation

| Document | Audience | Content |
|----------|----------|---------|
| [docs/INSTALL.md](./docs/INSTALL.md) | End users | Platform-by-platform installation guide |
| [USAGE.md](./USAGE.md) | End users | Help guide — Tor, proxy, killswitch, torrents |
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
│   ├── prisma/                     # SQLite schema (Setting, TorrentJob)
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

[MIT](./LICENSE). Bundled and peer dependencies (Tor, WebTorrent, Prisma, Next.js, Electron) carry their own licenses.

---

## Maintainer

[Alaustrup](https://github.com/Alaustrup)
