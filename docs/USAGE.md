# KillNode — Usage (Operator Manual)

Operate KillNode only on systems and networks you **own** or are **explicitly authorized** to reconfigure. Read [LEGAL_AND_ETHICS.md](./LEGAL_AND_ETHICS.md) first.

---

## Website

### Blog & admin (Prisma / SQLite)

- Public blog: `/blog` backed by SQLite (`DATABASE_URL`, default `file:./data/killnode.db` under `website/`).
- Admin: `/admin` (JWT cookie). Defaults: `admin` / `killnode2026` — override with env vars. **Production** requires `ADMIN_SESSION_SECRET` (16+ chars) and HTTPS.

### Dynamic downloads

The landing page pulls **latest GitHub Release** metadata via `GET /api/releases/latest`. Configure:

- `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`
- Optional `GITHUB_TOKEN` (server-side, never exposed to the client)

---

## Desktop — Tor & proxy mesh

### Activation sequence

1. **Activate Tor** — writes `torrc.killnode` under Electron `userData`, spawns Tor (SOCKS default **9050**).
2. **Obfuscation bridge (optional)** — if enabled in settings, attempts to spawn **Shadowsocks** (`-c <json>`) and/or **V2Ray** (`run -c <json>`) using **paths you provide**. Binaries are **not** shipped with KillNode.
3. **Local mesh** — starts:
   - **HTTP proxy** on **9742** (`proxy-chain` → `socks5://127.0.0.1:<tor>`)
   - **SOCKS5 ingress** on **9741** (minimal gateway → Tor SOCKS for outbound TCP connects)
4. **`session.defaultSession.setProxy`** — Electron’s default session is pointed at `http=127.0.0.1:9742` for renderer navigations.

### Ghost mode

Tightens Tor `MaxCircuitDirtiness` (45s vs 60s). Restart Tor after toggling if you need a clean torrc application.

### SOCKS vs HTTP for other apps

- **HTTP-aware clients:** `http://127.0.0.1:9742`
- **Native SOCKS clients:** `socks5://127.0.0.1:9741` (ingress) **or** directly `socks5://127.0.0.1:9050` once Tor is up.

---

## Desktop — Neural killswitch

Confirms, then executes **in order**:

1. Stop torrent telemetry loop and **destroy WebTorrent**.
2. **Stop local proxy stack** (HTTP + SOCKS ingress) and clear Electron session proxy rules.
3. **Stop obfuscation children** (SS / V2Ray).
4. **Stop Tor** and **SIGKILL** any remaining managed child processes.
5. **Host network severance** (platform-specific — see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)).

---

## Desktop — Secure swarm (WebTorrent)

### Threat model (read carefully)

- WebTorrent runs in the **main** process with `utp`, `dht`, `lsd`, and `webSeeds` disabled to shrink the UDP/WebRTC surface.
- When Tor is active, the client passes `proxy: socks5://127.0.0.1:<tor>` for **library HTTP** paths (trackers, metadata). **Peer wire** remains TCP-heavy; this is **not** equivalent to Tor Browser’s anonymity guarantees.

### Magnet ingestion

- Paste a magnet URI and **Add magnet**, or open a `magnet:` link (OS handler / second-instance argv).
- Payloads download under `userData/torrents`.

### Seeding & drag/drop

- **Seed files…** opens a multi-select dialog.
- **Drop files** onto the swarm card — paths are resolved via `webUtils.getPathForFile` in the preload bridge.

### Telemetry

Blood-red / cyan table shows download/upload throughput, peers, ratio. Updates push over IPC every second while the window exists.

---

## Desktop — SQLite (settings & jobs)

Key/value settings and torrent job rows live in `killnode.db` inside Electron `userData`. There is no remote sync — backup that file if you care about the metadata.

---

## Where next

- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [PHASED_DEVELOPMENT.md](./PHASED_DEVELOPMENT.md)
- [docs/README.md](./docs/README.md)
