# KillNode

Monorepo for the **KillNode** project: a cyberpunk-themed **Next.js 15** marketing/blog/admin site (`/website`), an **Electron + TypeScript** desktop control surface (`/desktop`), and **documentation** (`/docs` and legal files at the repository root).

**Author / GitHub:** [Alaustrup](https://github.com/Alaustrup)  
**Suggested repository name:** `killnode`

---

## Repository layout

| Path | Purpose |
|------|---------|
| `website/` | Next.js 15 + TypeScript + Tailwind + shadcn/ui — landing, `/blog`, `/admin` |
| `desktop/` | Electron + TypeScript — Tor orchestration UI, killswitch, ghost mode, tray |
| `docs/` | Documentation index and mirrors of key guides |
| `LEGAL_AND_ETHICS.md` | Ethical usage, disclaimer, privacy, terms (read before use) |

---

## Prerequisites

- **Node.js** 20 LTS or newer (see `.nvmrc`)
- **npm** 10+
- **Tor** (for desktop): either a system install (`tor` package on Debian/Kali/Ubuntu) or files from the [Tor Project](https://www.torproject.org/) Expert Bundle copied per `desktop/resources/tor/README.md`

---

## Install

From the repository root:

```bash
npm install
```

This installs dependencies for **all workspaces** (`website`, `desktop`).

---

## Website (`/website`)

### Development

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### Default admin credentials (demo only)

| | |
|---|---|
| **Username** | `admin` |
| **Password** | `killnode2026` |

Override with environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` — **required in production** (minimum 16 characters)

### Production build

```bash
npm run build:web
npm run start:web
```

Blog posts are stored in `website/data/posts.json` on the server filesystem. Ensure the process user can read/write that path.

### Deploying (example: Node on Linux)

1. Set environment variables (especially `ADMIN_SESSION_SECRET`).
2. Run `npm ci && npm run build:web` on the server.
3. Start with `npm run start:web` behind a reverse proxy (nginx, Caddy) with TLS.

For container deployment, mount a volume for `website/data` if you want persistent posts.

---

## Desktop (`/desktop`)

### Development

```bash
npm run dev:desktop
```

Starts **electron-vite** in development mode (main, preload, renderer).

### Typecheck

```bash
cd desktop && npm run typecheck
```

### Production build (unpackaged)

```bash
npm run build:desktop
```

Outputs under `desktop/out/`.

### Packaged installers (Windows / Linux / macOS)

```bash
npm run package:desktop
```

Artifacts appear under `desktop/release/`. **Tor is not redistributed** in this repo; place binaries under `desktop/resources/tor/` before packaging, or rely on a system `tor` — see `desktop/resources/tor/README.md` and `USAGE.md`.

**Administrator / root** privileges are often required for the **Neural Killswitch** and sometimes for full interface control on Linux.

---

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs website **lint + build** and desktop **typecheck + build** on Ubuntu, Windows, and macOS.

---

## Documentation

| Document | Description |
|----------|-------------|
| [USAGE.md](./USAGE.md) | Feature-by-feature guide (web + desktop) |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Build, network, and OS-specific fixes |
| [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) | Ethical agreement, liability disclaimer, privacy, terms |
| [docs/README.md](./docs/README.md) | Documentation hub |

---

## GitHub repository setup

1. Create a new repository named `killnode` under your GitHub account.
2. From this folder:

```bash
git init
git add .
git commit -m "chore: initial KillNode monorepo (website, desktop, docs)"
git branch -M main
git remote add origin https://github.com/Alaustrup/killnode.git
git push -u origin main
```

3. Enable **Branch protection** on `main` (require PR reviews and passing CI).
4. Add a **Security policy** (`SECURITY.md`) if you accept vulnerability reports.

---

## License

See [LICENSE](./LICENSE). Third-party components (e.g. Tor) have their own licenses.
