# KillNode documentation

Welcome to the documentation hub for **KillNode**. Authoritative legal text and primary guides live at the repository root; this folder provides navigation and supplemental material.

---

## Start here

| Document | Path |
|----------|------|
| **Setup, build, deploy** | [../README.md](../README.md) |
| **Feature guide** | [../USAGE.md](../USAGE.md) |
| **Build & OS fixes** | [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) |
| **Legal, ethics, privacy, terms** | [../LEGAL_AND_ETHICS.md](../LEGAL_AND_ETHICS.md) |
| **License** | [../LICENSE](../LICENSE) |

---

## Component map

- **Website (`/website`):** Next.js 15 app — landing page, `/blog`, `/admin` with JWT session cookie (`jose`) and JSON post storage.
- **Desktop (`/desktop`):** Electron + electron-vite — main/preload/renderer architecture; Tor child process; IPC surface documented in `USAGE.md`.

---

## Mirrors (optional local copies)

For offline bundles or static site generators, you may copy root markdown into this folder. The GitHub-rendered source of truth remains the root files linked above.

---

## Third parties

- **Tor** is distributed separately under its own license. See [https://www.torproject.org/](https://www.torproject.org/).
- **shadcn/ui** patterns are used in the website under MIT-style licensing of generated components; verify upstream licenses when upgrading.
