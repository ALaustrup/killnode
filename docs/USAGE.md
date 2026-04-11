# KillNode — Usage Guide

This guide explains how to use every major feature of the **KillNode website** and **KillNode desktop** application. Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) first; use only on systems and networks you are authorized to control.

---

## Website

### Landing page (`/`)

- **Neural logo:** Animated SVG node; purely decorative branding.
- **Download KillNode:** Points to GitHub Releases (configure your repo URL in `website/src/app/page.tsx` if needed).
- **Blog** and **Operator console** shortcuts appear in the lower grid.

### Blog (`/blog` and `/blog/[slug]`)

- Public index lists posts from `website/data/posts.json`, newest first.
- Post pages support a **lightweight markup** convention:
  - Paragraphs separated by a blank line
  - `**bold**` for emphasis
  - Lines starting with `>` render as block quotes

### Admin dashboard (`/admin`)

1. Sign in at `/admin/login` with credentials from environment variables or demo defaults (see root `README.md`).
2. **Dashboard** lists posts with an **Edit** action.
3. **New post** (`/admin/posts/new`): title, optional slug, excerpt, body.
4. **Edit** (`/admin/posts/[slug]/edit`): update fields or **Delete** the post.
5. **Log out** clears the HTTP-only session cookie.

**Production checklist**

- Set `ADMIN_SESSION_SECRET` (16+ characters).
- Use HTTPS so session cookies are marked `Secure`.
- Change default username/password.

---

## Desktop application

### First launch

1. Install dependencies and run `npm run dev:desktop` (development) or install a packaged build from `desktop/release/` (after `npm run package:desktop`).
2. If **Tor** does not start, either:
   - Install system Tor (`apt install tor` on Debian/Kali/Ubuntu), or
   - Copy Tor Expert Bundle files into `desktop/resources/tor/` as described in `desktop/resources/tor/README.md`, or
   - Use **Browse…** to select a `tor` / `tor.exe` binary.

### System tray

- **Close** the main window: the app **hides** to the tray (background execution).
- **Show KillNode** / tray icon click: restores the window.
- **Quit** exits the process and stops the bundled Tor child (if running).

### Tor — one-click activation

- **Activate Tor** writes a minimal `torrc` under the app user data directory (SOCKS default **9050**, ControlPort **9051** with cookie auth) and spawns the Tor binary.
- **Stop** sends SIGTERM to the child process.
- Status reads **TOR · ACTIVE** / **TOR · OFFLINE** in the header.

Changing **exit region** or **Ghost mode** affects the next successful **Activate** (stop then start if Tor is already running).

### Ghost mode

- Toggles **faster circuit rotation** via Tor `MaxCircuitDirtiness` (45s vs 60s default in this build).
- **Rotating proxies** are not injected automatically: point external tools at `127.0.0.1:9050` (SOCKS5) or configure system/proxy environment variables yourself. Document your proxy provider’s rules and legality.

### Location spoofing selector

- The **Exit region hint** maps to Tor `ExitNodes` country groups (see `desktop/src/main/index.ts` for the exact `{cc}` sets).
- This influences **exit geography**, not GPS on your machine. It is not a substitute for compliance, threat modeling, or lawful use.

### Neural Killswitch

- Attempts **host-level network isolation** using platform-specific commands (see `desktop/src/main/network-killswitch.ts`).
- A confirmation dialog appears before execution.
- **Restore hint** prints generic recovery commands; you may need **Administrator** (Windows) or **root/polkit** (Linux).

### Onion link generator

- **Generate & copy** produces a **simulated** `.onion` URL (v3-style appearance) and copies it to the clipboard.
- After **60 seconds** the on-screen value is scrubbed (self-destructing display).
- **Real** onion services require Tor hidden service configuration; this tool does not publish a live HS for you.

### Preferences persistence

- Stored in `killnode-settings.json` under the app’s Electron `userData` path (OS-specific).

---

## SOCKS and browser integration

Point a SOCKS5-capable browser or profile to:

- **Host:** `127.0.0.1`
- **Port:** `9050` (unless you change the desktop Tor defaults in code)

Use **Tor Browser** for the strongest out-of-the-box defaults when anonymity is the goal.

---

## Where to go next

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — when builds or networking fail
- [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) — liability, ethics, terms
- [docs/README.md](./docs/README.md) — documentation index
