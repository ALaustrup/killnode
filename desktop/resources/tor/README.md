# Bundled Tor (operator-supplied)

KillNode does **not** redistribute the Tor binary inside this repository (size, licensing mirrors, and your jurisdiction). For **one-click Tor** inside the packaged app, place official **Tor Expert Bundle** (or platform `tor` binary) files here before running `npm run package`:

| Platform | Expected paths (after copy) |
|----------|-----------------------------|
| **Windows** | `tor/tor.exe` plus required DLLs from the expert bundle |
| **Linux** | `tor/tor` (executable) and libraries next to it |
| **macOS** | `tor/tor` inside a `.app` layout or standalone binary as documented in `USAGE.md` |

At runtime the app looks under `process.resourcesPath/tor/` (see `src/main/tor-manager.ts`).

Alternatively, install system Tor (`apt install tor` on Debian/Kali) and set the **custom Tor path** in the UI (stored in user preferences).

Verify fingerprints and updates from [https://www.torproject.org/](https://www.torproject.org/).
