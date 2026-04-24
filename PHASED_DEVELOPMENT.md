# KillNode — Phased Development Roadmap

This document is a **technical north star**, not a delivery promise. Priorities shift with threat models, maintainer bandwidth, and legal review.

---

## Phase 0 — Foundation ✓ shipped

- Next.js 15 website with Prisma/PostgreSQL (Neon) blog, admin surface, and GitHub API download matrix.
- Electron desktop with basic Tor process management, local HTTP/SOCKS mesh, and neural killswitch.
- CI and tag-based desktop releases via GitHub Actions.

---

## Phase 1 — Hardening ✓ shipped (v1.0.1 Alpha)

- **Real Tor control-port integration:** cookie auth on port 9051; `SIGNAL NEWNYM`, live bootstrap progress (0–100%), live circuit count.
- **Pluggable Transports (obfs4 / lyrebird):** bundled in the Tor Expert Bundle — no extra binary needed. Bridge lines pasted from bridges.torproject.org via the desktop UI.
- **Hardened SOCKS5 gateway:** buffered reads, IPv6 (atyp 0x04), proper error reply codes.
- **Dead-man killswitch timer:** optional auto-fire (30 s / 60 s / 120 s / 5 min) on unexpected Tor exit.
- **Dirty-shutdown detection:** warns on next launch if Tor was active during an unclean exit.
- **Tor Expert Bundle bundled** in the installer — no separate Tor installation needed.
- **Database:** removed `TorrentJob` model; stripped WebTorrent, Onion Synth, and Shadowsocks/V2Ray sidecars.

---

## Phase 2 — Web Proxy Browser ✓ shipped (v1.0.1 Alpha)

- **Server-side proxy browser at `/browse`:** routes all requests through Vercel's servers; your ISP only sees traffic to `killnode.vercel.app`.
- **Comprehensive URL rewriting:** HTML attributes (`href`, `src`, `action`, `srcset`, `data-src`, lazy-loading data-*), inline CSS `url()`, CSS `@import`, meta-refresh.
- **Dynamic JS interception:** patched `window.fetch`, `XMLHttpRequest`, `HTMLImageElement.src`, `Element.setAttribute`, and `window.open`; plus a `MutationObserver` that catches runtime DOM mutations.
- **Injected navigation bar:** persistent URL input, Back, Forward, and return link on every proxied page.
- **SSRF protection:** blocks loopback, private RFC-1918 ranges, link-local, AWS metadata, `.local`/`.internal`.
- **Blog post sync:** `readPosts()` merges `data/posts.json` with DB at read time — posts always appear without a seed step.
- Optional Apple notarization and signed update channel (electron-updater) deferred to Phase 3.

---

## Phase 3 — P2P messaging (Signal-style crypto over Tor)

**Goal:** metadata-resistant messaging with modern forward secrecy, layered on Tor onion services—not a clone of any single product, but **Signal Protocol–grade** guarantees where feasible.

### Identity and initial handshake (X3DH-style profile)

- **Long-term identity keys:** X25519 keypairs generated locally; optional hardware-backed storage (platform TBD).
- **Pre-keys:** one-time and signed pre-key bundles published via **Tor onion service** descriptors or out-of-band QR/URL transfer (no clearnet directory required for strict mode).
- **Initial key agreement:** X3DH-like triple or quadruple Diffie–Hellman to derive a shared secret, then feed it into the ratchet bootstrap (implementation may use **libsodium** `crypto_scalarmult` / `crypto_kx` or **tweetnacl** equivalents; exact API surface to be chosen during design review).

### Double Ratchet (session)

- **Symmetric ratchet:** per-message keys via a KDF chain (e.g., HKDF-SHA256 or libsodium `crypto_kdf`) on each send/receive.
- **DH ratchet:** periodic new X25519 DH steps to provide break-in recovery and forward secrecy after compromise.
- **Out-of-order handling:** skipped-message key windows with bounded storage and explicit “gap” policy (drop vs. buffer vs. safety send).
- **Authentication:** encrypt-then-MAC or AEAD (ChaCha20-Poly1305 or XChaCha20-Poly1305) for every payload; transcript binding where needed.

### Transport & discovery

- **`libp2p`** (Noise handshakes, muxing) or a minimal custom framing layer over **Tor onion v3** streams for rendezvous—libp2p is optional glue; the cryptographic core remains the Signal-style ratchet above.
- **No central directory** profile: bootstrap only from onion addresses, signed contact bundles, or operator-provided allow-lists.

### Storage and persistence

- Session state (ratchet chains, skipped keys, device metadata) stored in **SQLite** with **SQLCipher** or OS keychain-wrapped master keys (Linux: **libsecret** / **kwallet** bridge TBD); plaintext session blobs on disk are unacceptable for “production” claims.

### Metadata minimization

- Padding strategies, optional cover traffic, and strict rate limits on discovery endpoints to reduce traffic analysis surface.

**Risks:** browser/Electron fingerprint surfaces, Tor latency, and legal regimes governing encrypted communications. This phase requires **independent cryptographic review** before any “production” claim.

---

## Phase 4 — Anti-fingerprinting BrowserView

**Goal:** first-party browsing inside Electron with aggressive policy control and documented gaps versus Tor Browser.

### Process and session model

- **`BrowserView` (or `WebContentsView`) per tab group:** isolate renderer crashes and memory; assign **`partition` session** strings per identity (e.g., `persist:identity-uuid`) so cookies, cache, and service workers never cross profiles.
- **Dedicated `session` objects:** no shared default session between “anonymous” and “normal” profiles; optional ephemeral (`partition:temp:…`) sessions for one-shot browsing.

### `session.webRequest` pipeline

- **Blocklists:** declarative rules for ads, trackers, third-party analytics, known malware domains; support for subscription lists (hosts / AdblockPlus-style) with merge semantics.
- **HTTPS upgrades:** redirect HTTP→HTTPS where safe; optional HSTS preload list ingestion.
- **Header hygiene:** strip or normalize `Referer`, `User-Agent`, `Accept-Language`, and fingerprinting headers per policy tier.
- **MIME / mixed content:** block active mixed content; optional upgrade-or-block for passive content.

### WebRTC, plugins, and permissions

- **WebRTC:** `session.setPermissionCheckHandler` / `setPermissionRequestHandler` to deny `media` and related unless explicitly allowed; document that **mDNS / ICE candidate leakage** must be audited—default deny for P2P surfaces.
- **Plugins & PDF:** disable NPAPI/PPAPI-era surfaces; prefer built-in PDF or block.
- **Geolocation, notifications, idle detection:** default deny unless operator enables per profile.

### Anti-fingerprinting (realistic scope)

- **Fonts / canvas / WebGL:** optional noise injection or block lists; **not** claimed to match Tor Browser’s anonymity set—KillNode must publish a **delta table** (what is spoofed, what is not).
- **User-Agent:** harmonized profiles per session partition; rotation policy documented.
- **Timezone / locale:** align with Tor circuit geography or fixed “neutral” profile (operator choice).

**Non-goals:** pretending to match Tor Browser’s anonymity set—KillNode documents deltas explicitly and avoids misleading marketing.

---

## Governance

Each phase should ship with **LEGAL_AND_ETHICS.md** updates, threat-model notes in `/docs`, and CI gates appropriate to the risk (lint, typecheck, integration smoke tests, reproducible packaging).

When in doubt, **reduce attack surface** instead of expanding features.
