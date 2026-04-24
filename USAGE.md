# KillNode v1.0.1 Alpha — User Guide

> **Legal reminder:** Use KillNode only on systems and networks you own or are explicitly authorized to administer. Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) before proceeding.

---

## Table of Contents

1. [Web Proxy Browser (no install)](#1-web-proxy-browser-no-install)
2. [First Launch (desktop)](#2-first-launch-desktop)
3. [Interface Overview](#3-interface-overview)
4. [Tor Orchestrator](#4-tor-orchestrator)
   - [Activating Tor](#activating-tor)
   - [Bootstrap Progress](#bootstrap-progress)
   - [Ghost Mode](#ghost-mode)
   - [New Identity](#new-identity)
   - [Exit Region](#exit-region)
   - [Bridges (Pluggable Transports)](#bridges-pluggable-transports)
5. [Proxy Mesh](#5-proxy-mesh)
   - [Using Proxies from External Apps](#using-proxies-from-external-apps)
6. [Neural Killswitch](#6-neural-killswitch)
   - [Dead-Man Timer](#dead-man-timer)
   - [Restoring Network Access](#restoring-network-access)
7. [Settings Reference](#7-settings-reference)
8. [System Tray](#8-system-tray)
9. [Data & Privacy](#9-data--privacy)
10. [Threat Model](#10-threat-model)
11. [Website & Admin](#11-website--admin)

---

## 1. Web Proxy Browser (no install)

The fastest way to bypass a blocked site: visit **[killnode.vercel.app/browse](https://killnode.vercel.app/browse)** from any browser.

### How it works

1. Type any URL (e.g. `example.com`) and click **Browse**.
2. KillNode's servers fetch the page on your behalf.
3. Your ISP only sees traffic to `killnode.vercel.app` — the actual destination is hidden.
4. All links, images, and sub-resources are rewritten to keep routing through the proxy.

### Built-in navigation bar

Every proxied page has a floating navigation bar injected at the top:

| Control | Action |
|---------|--------|
| URL input | Type a new address and press Enter or click **Go** |
| `←` / `→` | Browser history back / forward |
| **KN** link | Return to the `/browse` start page |

### Quick-access tools

The `/browse` start page includes one-click buttons for:

- `check.torproject.org` — confirms Tor routing
- `dnsleaktest.com` — checks for DNS leaks
- `whatismyipaddress.com` — shows your visible IP
- `ipleak.net` — combined IP + WebRTC leak test
- `browserleaks.com` — browser fingerprint analysis

### Limitations

- Sites requiring login generally do not work (cookies are scoped to `killnode.vercel.app`).
- JavaScript-heavy single-page apps may render partially.
- WebSocket connections are not proxied.
- For full Tor anonymity, use the desktop app.

---

## 2. First Launch (desktop)

When KillNode starts for the first time it:

1. Creates its **SQLite database** in your OS user-data directory (see [Data & Privacy](#8-data--privacy)).
2. Bootstraps the database schema automatically — no manual setup required.
3. Loads saved settings (Ghost mode, exit region, bridge lines, dead-man timer) from the last session.
4. Sits in the **system tray** until you open the main window.

**Tor is pre-bundled in the installer** — no separate Tor installation is needed. KillNode manages its own Tor process using the verified Tor Expert Bundle (v15.0.9) that ships inside `resources/tor/`. If you are running a dev build from source, see [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md#tor-in-dev-mode) for how to set up the Tor binary locally.

---

## 3. Interface Overview

The main window has three cards:

| Card | What it does |
|------|-------------|
| **Tor Orchestrator** | Activate/stop Tor, view live bootstrap progress and circuit count, request a new identity, configure Ghost mode, exit region, and obfs4 bridges. |
| **Proxy Mesh** | Displays the HTTP (`:9742`) and SOCKS5 (`:9741`) local proxy addresses with copy buttons; shows Electron session proxy status. |
| **Neural Killswitch** | One-click ordered network teardown; optional dead-man auto-fire timer; restore-hint button. |

The header shows the global Tor status pill and a live circuit count pill.

---

## 4. Tor Orchestrator

### Activating Tor

1. Click **Activate** in the Tor Orchestrator card.
2. KillNode writes `torrc.killnode` to your user-data directory (SOCKS port 9050, control port 9051, CookieAuthentication 1) and spawns `tor`.
3. The bootstrap progress bar fills as Tor connects to the network (typically 10–30 s).
4. Once bootstrapped, KillNode:
   - Starts the HTTP proxy bridge on port **9742**.
   - Starts the SOCKS5 gateway on port **9741**.
   - Applies `http://127.0.0.1:9742` as the Electron session proxy.
5. The status pill turns **TOR · ACTIVE** and the circuit count pill appears.

To stop, click **Stop**. This shuts down the proxy stack, stops Tor, and clears the Electron session proxy.

### Bootstrap Progress

While Tor connects, a progress bar shows the bootstrap percentage (0–100%) polled from the control port every 800 ms. It disappears when Tor is fully connected.

### Ghost Mode

Toggle **Ghost mode** before starting Tor (or restart Tor after toggling).

- **On:** sets `MaxCircuitDirtiness 45` — circuits rotate more aggressively.
- **Off:** Tor default (`MaxCircuitDirtiness 600`).

### New Identity

Click **New Identity** while Tor is running to send `SIGNAL NEWNYM` over the control port. Tor will try to use new circuits for subsequent requests. Note: NEWNYM has a minimum cooldown enforced by Tor (about 10 seconds).

### Exit Region

Select an exit-node region from the dropdown:

| Option | Exit nodes |
|--------|-----------|
| Any exit | No restriction |
| Americas | `{us}` |
| Europe | `{de},{nl},{fr},{se}` |
| Asia | `{jp},{sg}` |
| EU strict | `{de},{ch}` |

The setting takes effect on the next Tor start.

### Bridges (Pluggable Transports)

Use bridges if your network actively blocks Tor connections.

1. Check **Bridges (obfs4 / lyrebird)**.
2. Paste one or more `obfs4` bridge lines into the textarea (one per line).
   - Get bridges from [bridges.torproject.org](https://bridges.torproject.org) → select **obfs4**.
3. Start Tor — KillNode adds the following directives to `torrc.killnode` automatically:

```
UseBridges 1
ClientTransportPlugin obfs4 exec <resources>/tor/pluggable_transports/lyrebird[.exe]
Bridge obfs4 <your bridge line>
```

`lyrebird` is the obfs4 transport binary bundled inside the Tor Expert Bundle — **no extra download needed**.

If no `lyrebird` binary is found (dev build without the full Expert Bundle), bridging is silently skipped and Tor starts without bridges.

---

## 5. Proxy Mesh

When Tor is active, two local proxy listeners accept connections:

| Protocol | Address | Port | Use for |
|----------|---------|------|---------|
| HTTP/HTTPS | `127.0.0.1` | **9742** | Browsers, curl, wget, HTTP-aware clients |
| SOCKS5 | `127.0.0.1` | **9741** | Native SOCKS clients (supports IPv4, hostname, IPv6) |
| SOCKS5 (Tor direct) | `127.0.0.1` | **9050** | Connect directly to Tor's SOCKS port |

Use the **Copy** buttons next to each address to copy it to the clipboard.

The **Session** line shows whether Electron's internal session proxy is active (`Session: proxied ✓`).

### Using Proxies from External Apps

**Firefox:**
> Preferences → Network Settings → Manual proxy → HTTP Proxy `127.0.0.1:9742`.

**curl:**
```bash
curl --proxy http://127.0.0.1:9742 https://check.torproject.org/api/ip
```

**System-wide (Linux):**
```bash
export http_proxy=http://127.0.0.1:9742
export https_proxy=http://127.0.0.1:9742
```

---

## 6. Neural Killswitch

The killswitch performs an **ordered, irreversible teardown**. Use it when you need to go dark immediately.

### What it does (in order)

1. **Stop HTTP proxy bridge** (9742) and clear Electron session proxy.
2. **Stop SOCKS5 gateway** (9741).
3. **Stop Tor** — SIGTERM and reap managed children.
4. **Kill remaining managed children**.
5. **Host network severance** — platform-specific:
   - **Windows:** disables adapters via `netsh`.
   - **Linux:** `nmcli networking off` → `ip link set <iface> down` → `rfkill block all` (wireless).
   - **macOS:** `networksetup -setnetworkserviceenabled … off`.

### How to trigger it

Click **FIRE KILLSWITCH** in the Neural Killswitch card. A confirmation dialog appears — click **Sever network** to proceed.

### Dead-Man Timer

The dead-man timer auto-fires the killswitch if Tor disconnects unexpectedly and does not reconnect within the configured window.

| Setting | Behaviour |
|---------|-----------|
| **off** (default) | No auto-fire |
| **30 s** | Killswitch fires 30 seconds after an unexpected Tor exit |
| **60 s** | 60-second grace window |
| **120 s** | 2-minute grace window |
| **5 min** | 5-minute grace window |

The timer is **disarmed** if you stop Tor intentionally (via the **Stop** button) or if Tor is restarted before the window expires.

### Dirty-Shutdown Detection

If KillNode crashes or is force-killed while Tor is running, the next launch will show a toast warning:
> "⚠ Unclean shutdown detected — Tor was active. Verify your network state."

This means Tor may still be running as an orphaned process. Check with your system's process list and kill it manually if needed.

### Restoring Network Access

After the killswitch fires, use **Restore hint** to see recovery commands, or run them manually:

```bash
# Linux
nmcli networking on
ip link set eth0 up     # replace with your interface name

# Windows (elevated PowerShell)
Enable-NetAdapter -Name "*"

# macOS
networksetup -setnetworkserviceenabled Wi-Fi on
```

> **Note:** `nmcli networking off` requires elevated privileges on Linux. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#5-neural-killswitch--linux--kali) for polkit and `cap_net_admin` options.

---

## 7. Settings Reference

All settings persist to the SQLite database in `userData`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Tor custom path | string | — | Override the Tor binary path (leave blank to use bundled) |
| Ghost mode | boolean | off | `MaxCircuitDirtiness 45` for faster circuit rotation |
| Exit region | string | any | Steer exit nodes by geography |
| Bridges enabled | boolean | off | Activate obfs4 bridges via lyrebird |
| Bridge lines | string | — | Newline-separated `obfs4` bridge lines |
| Dead-man timer | "0"–"300" | "0" | Seconds before auto-killswitch on unexpected Tor exit |

---

## 8. System Tray

KillNode minimizes to the system tray instead of closing when you click the window close button.

| Tray action | Result |
|-------------|--------|
| Single click | Restore the main window |
| Right-click | Context menu: Show / Quit |
| Quit (tray or menu) | Graceful shutdown — stops proxy stack and Tor |

---

## 9. Data & Privacy

### Where data is stored

| OS | Path |
|----|------|
| Windows | `%APPDATA%\killnode\` |
| Linux | `~/.config/killnode/` |
| macOS | `~/Library/Application Support/killnode/` |

Inside that directory:

| File / Folder | Contents |
|---------------|---------|
| `killnode.db` | SQLite database — settings key/value store |
| `torrc.killnode` | Generated Tor config (recreated on every Tor start) |
| `tor-data/` | Tor's internal state directory (consensus cache, hidden-service keys) |
| `tor-data/control_auth_cookie` | Tor control-port auth cookie (read by KillNode; never transmitted) |

### What is transmitted

- All traffic routed through the app's proxies goes via **Tor** when Tor is active.
- No telemetry or analytics are transmitted by KillNode itself. If you use the website at [killnode.vercel.app](https://killnode.vercel.app), standard web server access logs may apply.

---

## 10. Threat Model

KillNode provides meaningful privacy protections for specific threat scenarios, but it is **not** equivalent to Tor Browser.

### Desktop app

| What is protected | How |
|------------------|-----|
| In-app (renderer) navigations | Electron session proxied through Tor |
| External HTTP clients | HTTP proxy bridge on 9742 → Tor |
| External SOCKS clients | SOCKS5 gateway on 9741 → Tor |
| Bridge usage metadata | obfs4 + lyrebird obscures Tor traffic fingerprint |

| What is **not** protected | Why |
|--------------------------|-----|
| DNS outside the proxy | Applications that bypass the proxy resolve DNS directly |
| Other system processes | KillNode does not enforce a system-wide firewall rule |
| Browser fingerprinting | Tor Browser's anonymity set is not replicated here |
| WebRTC leaks | Out-of-scope for the proxy architecture |

### Web Proxy Browser (`/browse`)

| What is protected | How |
|------------------|-----|
| ISP visibility of destination | Request originates from Vercel servers, not your machine |
| DNS of destination | No DNS lookup for the destination from your network |

| What is **not** protected | Why |
|--------------------------|-----|
| Vercel server visibility | Vercel sees the destination URL in the query string |
| Login sessions | Cookies cannot be scoped to the proxied domain |
| WebSockets | Not proxied |
| JavaScript fingerprinting on proxied pages | JS runs in your browser with your real fingerprint |

**Bottom line:** KillNode is a focused privacy tool, not an anonymity guarantee. For high-stakes operational security, use Tails OS or Tor Browser on a dedicated air-gapped machine.

---

## 11. Website & Admin

The [KillNode website](https://killnode.vercel.app) provides the public-facing blog and a download widget that always links to the latest GitHub Release.

### Admin surface

The admin panel is at `/admin/login`. It is intended for the maintainer only.

- Default credentials: `admin` / `killnode2026` — **change these in production** via environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- Set a strong `ADMIN_SESSION_SECRET` (32+ random hex bytes) in your environment.
- The admin panel lets you create, edit, and delete blog posts.

### Download widget

The landing page calls `GET /api/releases/latest` which proxies the GitHub Releases API. It automatically picks up new release assets when you push a `v*` tag.

---

*Still stuck? See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue on [GitHub](https://github.com/Alaustrup/killnode/issues).*
