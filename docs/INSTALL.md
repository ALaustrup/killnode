# KillNode — Installation Guide

This guide covers installing the KillNode desktop application on **Windows** and **Linux**. macOS support is planned for Phase 2.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Download](#2-download)
3. [Windows Installation](#3-windows-installation)
4. [Linux Installation](#4-linux-installation)
   - [AppImage (no install)](#appimage-no-install)
   - [.deb Package (Debian / Ubuntu)](#deb-package-debian--ubuntu)
5. [Tor Binary Setup](#5-tor-binary-setup)
6. [First Launch Checklist](#6-first-launch-checklist)
7. [Uninstalling](#7-uninstalling)
8. [Installing from Source](#8-installing-from-source)

---

## 1. System Requirements

| Component | Minimum |
|-----------|---------|
| OS | Windows 10 64-bit, Ubuntu 20.04+, Debian 11+, Kali 2023+ |
| RAM | 512 MB free |
| Disk | 400 MB (app) + space for torrent downloads |
| Network | Internet connection (Tor requires outbound TCP on port 443 or 9001) |

> **Note:** KillNode is an x64 application. ARM builds are not provided in the alpha.

---

## 2. Download

Go to the [GitHub Releases page](https://github.com/Alaustrup/killnode/releases/latest) or use the download links on [killnode.vercel.app](https://killnode.vercel.app).

| Platform | File | Notes |
|----------|------|-------|
| Windows (installer) | `KillNode-1.0.0-win.exe` | NSIS installer, recommended |
| Windows (portable) | `KillNode-1.0.0-win.zip` | Extract and run — no install required |
| Linux (portable) | `KillNode-1.0.0-linux.AppImage` | Single executable, no install required |
| Linux (package) | `KillNode-1.0.0-linux.deb` | Debian/Ubuntu/Kali package manager |

Verify the version number matches the [latest release tag](https://github.com/Alaustrup/killnode/releases/latest) before proceeding.

---

## 3. Windows Installation

### NSIS Installer (recommended)

1. Download `KillNode-*-win.exe`.
2. Double-click the installer.
3. If **Windows SmartScreen** shows "Windows protected your PC":
   - Click **More info**.
   - Click **Run anyway**.
   *(The alpha release is not code-signed; Phase 2 will include a valid certificate.)*
4. Follow the installer wizard — accept the license, choose an install directory, and click **Install**.
5. Optionally tick **Create desktop shortcut** and/or **Launch KillNode** at the end.

The installer registers KillNode as the default handler for `magnet:` URI links automatically.

### Portable ZIP

1. Download `KillNode-*-win.zip`.
2. Extract the archive to any folder (e.g., `C:\Tools\KillNode\`).
3. Run `KillNode.exe` from the extracted folder.
4. To register the `magnet:` URI handler manually:
   - Settings → Apps → Default Apps → search "magnet" → set KillNode.

### Adding Tor (Windows)

KillNode needs the Tor binary in `<install dir>\resources\tor\`. See [Section 5 — Tor Binary Setup](#5-tor-binary-setup).

---

## 4. Linux Installation

### AppImage (no install)

The AppImage is a self-contained bundle that runs on most modern Linux distributions.

```bash
# 1. Make executable
chmod +x KillNode-*-linux.AppImage

# 2. Run
./KillNode-*-linux.AppImage
```

**If you see "fuse: failed to exec fusermount3"**, install FUSE:
```bash
sudo apt-get install libfuse2   # Debian/Ubuntu
sudo pacman -S fuse2             # Arch
```

Or run without FUSE (extract first):
```bash
./KillNode-*-linux.AppImage --appimage-extract
./squashfs-root/AppRun
```

**Register the `magnet:` URI handler (AppImage):**
```bash
# Create a .desktop file
cat > ~/.local/share/applications/killnode.desktop <<'EOF'
[Desktop Entry]
Name=KillNode
Exec=/path/to/KillNode-1.0.0-linux.AppImage %u
Type=Application
MimeType=x-scheme-handler/magnet;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications
xdg-mime default killnode.desktop x-scheme-handler/magnet
```
Replace `/path/to/KillNode-1.0.0-linux.AppImage` with the actual path.

### .deb Package (Debian / Ubuntu)

```bash
# Install
sudo dpkg -i KillNode-*-linux.deb

# Fix any missing dependencies
sudo apt-get install -f

# Run
killnode
# or launch from your application menu
```

The `.deb` package installs the binary to `/opt/KillNode/` and registers the `magnet:` handler via its `.desktop` file automatically.

**Granting network administration rights (for Neural Killswitch on Linux):**

The killswitch uses `nmcli` and `ip link` to sever network interfaces, which typically requires elevated privileges. To allow KillNode to operate without `sudo`:

```bash
sudo setcap cap_net_admin+eip /opt/KillNode/killnode
```

> See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md#5-neural-killswitch--linux--kali) for full details and polkit alternatives.

---

## 5. Tor Binary Setup

KillNode manages its own Tor process. It looks for the binary in this order:

1. `<app resources>/tor/tor` (Windows: `…/tor/tor.exe`)
2. System `tor` in `PATH`

### Option A — Use system Tor (Linux, simplest)

```bash
# Debian / Ubuntu / Kali
sudo apt-get install tor

# Arch
sudo pacman -S tor
```

KillNode will find `tor` in `PATH` automatically. Do **not** start the system `tor` service (`sudo systemctl disable --now tor`) — KillNode spawns its own instance with a custom `torrc`.

### Option B — Tor Expert Bundle (Windows / portable Linux)

1. Download the **Tor Expert Bundle** for your platform from [torproject.org/download/tor](https://www.torproject.org/download/tor/).
2. Extract it.
3. Copy the `tor` (or `tor.exe`) binary and any required libraries (e.g., `libcrypto`, `libssl`) into the `resources/tor/` directory inside the KillNode installation folder:

```
<KillNode install dir>/
└── resources/
    └── tor/
        ├── tor.exe          (Windows)
        └── tor              (Linux)
```

> On Windows this is typically `C:\Program Files\KillNode\resources\tor\`.
> On Linux (AppImage), it is `./squashfs-root/resources/tor/`.

---

## 6. First Launch Checklist

After installing, run through this checklist before use:

- [ ] KillNode opens and the main window appears (or tray icon is visible).
- [ ] The **Log** panel shows no fatal startup errors.
- [ ] Click **Activate Tor** — status changes to "starting…" then green/active within 30 seconds.
- [ ] The proxy addresses (9742 HTTP, 9741 SOCKS5) appear in the Proxy Info panel.
- [ ] Open a browser, set the HTTP proxy to `127.0.0.1:9742`, and visit [check.torproject.org](https://check.torproject.org). It should say "Congratulations. This browser is configured to use Tor."
- [ ] Add a test magnet link in the Swarm panel and confirm it appears in the torrent list.

---

## 7. Uninstalling

### Windows

- **Installer:** Control Panel → Programs → Uninstall → KillNode.
- **Portable ZIP:** Delete the extracted folder. Remove the `magnet:` handler from Default Apps if desired.
- **User data** (settings, downloaded torrents) is in `%APPDATA%\killnode\` — delete manually if desired.

### Linux

```bash
# AppImage
rm KillNode-*-linux.AppImage
rm ~/.local/share/applications/killnode.desktop
update-desktop-database ~/.local/share/applications

# .deb
sudo apt-get remove killnode

# User data
rm -rf ~/.config/killnode/
```

---

## 8. Installing from Source

For contributors and advanced users who want to build KillNode themselves. See **[docs/CONTRIBUTING.md](./CONTRIBUTING.md)** for the full developer setup guide.

Quick summary:

```bash
# Prerequisites: Node.js 20+, npm 10+, Git

git clone https://github.com/Alaustrup/killnode.git
cd killnode
npm install

# Run in development mode (no packaging)
npm run dev:desktop

# Build and package installers
npm run package:desktop
# Outputs to desktop/release/
```

Tor binary must still be placed in `desktop/resources/tor/` or installed system-wide.
