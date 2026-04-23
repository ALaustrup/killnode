# KillNode — User Guide

> **Legal reminder:** Use KillNode only on systems and networks you own or are explicitly authorized to administer. Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) before proceeding.

---

## Table of Contents

1. [First Launch](#1-first-launch)
2. [Interface Overview](#2-interface-overview)
3. [Tor & Network Privacy](#3-tor--network-privacy)
   - [Activating Tor](#activating-tor)
   - [Ghost Mode](#ghost-mode)
   - [Using the Proxy from External Apps](#using-the-proxy-from-external-apps)
   - [Obfuscation Bridges (Advanced)](#obfuscation-bridges-advanced)
4. [Neural Killswitch](#4-neural-killswitch)
5. [Secure Swarm (WebTorrent)](#5-secure-swarm-webtorrent)
   - [Adding a Magnet Link](#adding-a-magnet-link)
   - [Opening Magnet Links from the Browser](#opening-magnet-links-from-the-browser)
   - [Seeding Files](#seeding-files)
   - [Removing a Torrent](#removing-a-torrent)
   - [Telemetry Panel](#telemetry-panel)
6. [Settings](#6-settings)
7. [System Tray](#7-system-tray)
8. [Data & Privacy](#8-data--privacy)
9. [Threat Model](#9-threat-model)
10. [Website & Admin](#10-website--admin)

---

## 1. First Launch

When KillNode starts for the first time it:

1. Creates its **SQLite database** in your OS user-data directory (see [Data & Privacy](#8-data--privacy)).
2. Bootstraps the database schema automatically — no manual setup required.
3. Loads saved settings (proxy ports, Ghost mode toggle, obfuscation paths) from the last session.
4. Sits in the **system tray** until you open the main window.

**Tor is pre-bundled in the installer** — no separate Tor installation is needed. KillNode manages its own Tor process using the verified Tor Expert Bundle (v15.0.9, tor 0.4.9.5) that ships inside `resources/tor/`. If you are running a dev build from source, see [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md#tor-in-dev-mode) for how to set up the Tor binary locally.

---

## 2. Interface Overview

The main window is divided into panels:

| Panel | What it does |
|-------|-------------|
| **Status bar** | Shows Tor status (stopped / starting / running), proxy addresses, and active circuit count. |
| **Tor controls** | Activate / Deactivate Tor; toggle Ghost mode. |
| **Proxy info** | Displays the HTTP and SOCKS5 addresses for connecting external apps. |
| **Swarm** | WebTorrent panel — add magnets, seed files, view download/upload telemetry. |
| **Killswitch** | One-click ordered network teardown. |
| **Settings** | Proxy ports, obfuscation paths, and persistence options. |
| **Log** | Live main-process log stream for debugging. |

---

## 3. Tor & Network Privacy

### Activating Tor

1. Click **Activate Tor** in the Tor controls panel.
2. KillNode writes a `torrc.killnode` config file to your user-data directory, then spawns `tor` pointing at that config.
3. A readiness probe polls Tor's SOCKS port until it accepts connections (typically 10–30 seconds on a cold start).
4. Once ready, KillNode:
   - Starts the **HTTP proxy bridge** on port **9742** → forwards to Tor SOCKS.
   - Starts the **SOCKS5 ingress** on port **9741** → forwards to Tor SOCKS.
   - Points Electron's default session at `http://127.0.0.1:9742` so all renderer navigations go through Tor.
5. The status bar turns green and shows the active SOCKS port.

To stop, click **Deactivate Tor**. This stops Tor and shuts down both local proxy listeners.

### Ghost Mode

Toggle **Ghost Mode** before or after activating Tor.

- **On:** sets `MaxCircuitDirtiness 45` in the Tor config (circuits rotate more aggressively).
- **Off:** Tor default (`MaxCircuitDirtiness 600`).

If Tor is already running when you toggle Ghost Mode, restart Tor for the new torrc to take effect.

### Using the Proxy from External Apps

Once Tor is active, any application on the same machine can route traffic through KillNode's local proxies:

| Protocol | Address | Port | Use for |
|----------|---------|------|---------|
| HTTP/HTTPS | `127.0.0.1` | **9742** | Browsers, curl, wget, HTTP-aware clients |
| SOCKS5 | `127.0.0.1` | **9741** | Native SOCKS clients |
| SOCKS5 (Tor direct) | `127.0.0.1` | **9050** | Connect directly to Tor's SOCKS port |

**Example — Firefox:**
> Preferences → Network Settings → Manual proxy → HTTP Proxy `127.0.0.1:9742`, use for all protocols.

**Example — curl:**
```bash
curl --proxy http://127.0.0.1:9742 https://check.torproject.org/api/ip
```

**Example — system-wide (Linux):**
```bash
export http_proxy=http://127.0.0.1:9742
export https_proxy=http://127.0.0.1:9742
```

### Obfuscation Bridges (Advanced)

KillNode can spawn external **Shadowsocks** and/or **V2Ray** child processes as censorship circumvention bridges. These binaries are **not included** — you must obtain and configure them separately.

To enable:
1. Open **Settings**.
2. Provide the full path to your `ss-local` (Shadowsocks) and/or `v2ray` binary.
3. Provide the JSON config file paths for each.
4. Toggle the obfuscation switch **before** activating Tor.

KillNode passes `-c <config.json>` to Shadowsocks and `run -c <config.json>` to V2Ray. The processes are registered with the internal process registry and are terminated when Tor is deactivated or when the killswitch fires.

---

## 4. Neural Killswitch

The killswitch performs an **ordered, irreversible teardown** of all network components. Use it when you need to go dark immediately.

### What it does (in order)

1. **Stop telemetry loop** — halts the WebTorrent stats broadcast.
2. **Destroy WebTorrent client** — closes all active torrents and peer connections.
3. **Stop HTTP proxy bridge** (port 9742) and clear Electron's session proxy rules.
4. **Stop SOCKS5 ingress** (port 9741).
5. **Stop obfuscation children** (Shadowsocks, V2Ray) if running.
6. **Stop Tor** — sends terminate signal and waits for process exit.
7. **SIGKILL remaining children** — any managed child processes still alive are force-killed.
8. **Host network severance** — platform-specific:
   - **Windows:** disables network adapters via `netsh`.
   - **Linux:** calls `nmcli networking off`, then `ip link set <iface> down`, then optionally `rfkill block all` for wireless.
   - **macOS:** uses `networksetup` to turn off each service.

### How to trigger it

Click **Neural Killswitch** in the main window. You will be asked to confirm. After confirmation the sequence runs automatically.

### Restoring network access after killswitch

The app displays recovery hints after firing. General recovery:

```bash
# Linux
nmcli networking on
ip link set eth0 up          # replace eth0 with your interface name

# Windows (elevated PowerShell)
Enable-NetAdapter -Name "*"

# macOS
networksetup -setnetworkserviceenabled Wi-Fi on
```

> **Note:** On Linux, `nmcli networking off` and `ip link` may require elevated privileges. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#neural-killswitch--linux--kali) for `cap_net_admin` setup.

---

## 5. Secure Swarm (WebTorrent)

### Adding a Magnet Link

1. Copy a `magnet:?xt=urn:btih:…` URI.
2. Paste it into the **Magnet URI** field in the Swarm panel.
3. Click **Add magnet**.
4. The torrent appears in the list immediately; metadata (name, size) populates once the first peers are contacted.

Downloads are saved to `<userData>/torrents/`. See [Data & Privacy](#8-data--privacy) for the path on your OS.

### Opening Magnet Links from the Browser

KillNode registers itself as the OS handler for `magnet:` URIs during installation. Clicking a magnet link in your browser should launch (or focus) KillNode and start the download automatically.

If the association is not registered or points to the wrong binary:
- **Windows:** re-run the installer, or set the default app for `magnet:` in Settings → Default Apps.
- **Linux:** the `.desktop` file registers the handler. Re-install the `.deb` or run `xdg-mime default killnode.desktop x-scheme-handler/magnet`.

### Seeding Files

1. Click **Seed files…** in the Swarm panel to open a file picker (multi-select supported).
2. Alternatively, **drag and drop** files directly onto the Swarm panel.
3. KillNode computes the info-hash and announces to trackers. The magnet link for the new torrent appears in the telemetry row.

### Removing a Torrent

Click the **✕** button on any torrent row. This destroys the WebTorrent handle and removes it from the active client. The download directory is **not** deleted automatically — manage downloaded files through your file manager.

### Telemetry Panel

The live telemetry table shows:

| Column | Meaning |
|--------|---------|
| Name | Torrent name (or info-hash if metadata not yet fetched) |
| Progress | Percentage downloaded (0–100%) |
| ↓ Speed | Current download rate (bytes/s) |
| ↑ Speed | Current upload rate (bytes/s) |
| Peers | Number of active peer connections |
| Ratio | Uploaded ÷ Downloaded |
| Done | ✓ when all pieces verified |

Telemetry updates every **1 second** via IPC while the window is open.

---

## 6. Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Tor SOCKS port | `9050` | The port Tor listens on locally |
| HTTP proxy port | `9742` | The `proxy-chain` HTTP bridge port |
| SOCKS5 ingress port | `9741` | The SOCKS5 gateway port |
| Ghost mode | Off | Aggressive circuit rotation (MaxCircuitDirtiness 45s) |
| Shadowsocks binary path | — | Path to `ss-local` executable |
| Shadowsocks config | — | Path to Shadowsocks JSON config |
| V2Ray binary path | — | Path to `v2ray` executable |
| V2Ray config | — | Path to V2Ray JSON config |

Settings are persisted to the SQLite database in `userData` and restored on next launch.

---

## 7. System Tray

KillNode minimizes to the system tray rather than closing when you click the window close button.

| Tray action | Result |
|-------------|--------|
| Single click | Restore the main window |
| Right-click | Context menu: Show / Quit |
| Quit (tray or menu) | Graceful shutdown — stops Tor, proxy stack, and WebTorrent |

---

## 8. Data & Privacy

### Where data is stored

| OS | Path |
|----|------|
| Windows | `%APPDATA%\killnode\` |
| Linux | `~/.config/killnode/` |
| macOS | `~/Library/Application Support/killnode/` |

Inside that directory:

| File / Folder | Contents |
|---------------|---------|
| `killnode.db` | SQLite database — settings key/value store, torrent-job history |
| `torrents/` | Downloaded torrent payloads |
| `torrc.killnode` | Generated Tor config (recreated on every Tor start) |
| `tor-data/` | Tor's internal state directory (hidden service keys, consensus cache) |

### What is transmitted

- All traffic routed through the app's proxies goes via **Tor** when Tor is active. The Tor Project's own policies and design govern what relays can observe.
- **Tracker HTTP(S) requests** from WebTorrent are routed through the Tor SOCKS proxy via `socks-proxy-agent`.
- **Peer wire connections** (BitTorrent TCP) are **not** routed through Tor — they use the host network stack directly. Do not use WebTorrent if you require full peer anonymity.
- No telemetry or analytics are transmitted by KillNode itself. If you use the website at [killnode.vercel.app](https://killnode.vercel.app), standard web server access logs may apply.

### Backup

If you care about torrent-job history or custom settings, back up the `killnode.db` file. There is no cloud sync.

---

## 9. Threat Model

KillNode provides **meaningful privacy protections** for specific threat scenarios, but it is **not** equivalent to Tor Browser and has documented gaps:

| What is protected | How |
|------------------|-----|
| Renderer (in-app) navigations | Electron session proxied through Tor |
| Tracker announces (WebTorrent) | HTTP(S) via `socks-proxy-agent` → Tor SOCKS |
| External HTTP clients (browser, curl) | HTTP proxy bridge on 9742 → Tor |
| External SOCKS clients | SOCKS5 ingress on 9741 → Tor |

| What is **not** protected | Why |
|--------------------------|-----|
| BitTorrent peer wire | TCP connections go direct — your IP is visible to peers |
| WebRTC / UDP | `utp`, `dht`, `lsd`, `webSeeds` disabled but WebRTC is not used in the main-process WebTorrent; renderer WebRTC may still leak if enabled |
| DNS outside the proxy | Applications that bypass the proxy resolve DNS directly |
| Other system processes | KillNode does not enforce a system-wide firewall rule (killswitch severs the interface, not per-app) |
| Browser fingerprinting | Tor Browser's anonymity set is not replicated here |

**Bottom line:** KillNode is a privacy tool, not an anonymity guarantee. For high-stakes operational security, use Tails OS or Tor Browser on a dedicated air-gapped machine.

---

## 10. Website & Admin

The [KillNode website](https://killnode.vercel.app) provides the public-facing blog and a download widget that always links to the latest GitHub Release.

### Admin surface

The admin panel is at `/admin/login`. It is intended for the maintainer only. If you are self-hosting:

- Default credentials: `admin` / `killnode2026` — **change these in production** via environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- Set a strong `ADMIN_SESSION_SECRET` (32+ random hex bytes) in your environment.
- The admin panel lets you create, edit, and delete blog posts.
- Posts use a markdown-style rich text editor; the `slug` field must be URL-safe.

### Download widget

The landing page calls `GET /api/releases/latest` which proxies the GitHub Releases API. It automatically picks up new release assets when you push a `v*` tag. If the widget shows "no release found", check that:

1. A GitHub Release (not draft) exists for the latest tag.
2. `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` are set correctly in the Vercel environment.
3. The `GITHUB_TOKEN` secret (if set) has not expired.

---

*Still stuck? See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or open an issue on [GitHub](https://github.com/Alaustrup/killnode/issues).*
