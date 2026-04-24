import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NeuralLogo } from "@/components/neural-logo";
import { DownloadReleases } from "@/components/download-releases";

const FEATURES = [
  {
    label: "Tor Orchestration",
    desc: "Real control-port integration: live bootstrap progress (0–100%), circuit count, SIGNAL NEWNYM, and Ghost mode circuit rotation.",
    accent: "cyan",
  },
  {
    label: "Neural Killswitch",
    desc: "Ordered teardown: proxy mesh → Tor → OS interface severance. Optional dead-man timer auto-fires on unexpected Tor disconnect.",
    accent: "red",
  },
  {
    label: "Proxy Mesh",
    desc: "HTTP bridge on :9742 and hardened SOCKS5 gateway on :9741 — IPv4, hostname, and IPv6 — both route into Tor after bootstrap.",
    accent: "cyan",
  },
  {
    label: "Pluggable Transports",
    desc: "Paste obfs4 bridge lines from bridges.torproject.org. Lyrebird is bundled — no separate download needed.",
    accent: "red",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-20 text-center md:px-6 md:py-28">
          <NeuralLogo className="mb-8 h-28 w-28 md:h-40 md:w-40" />

          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-neon-cyan/70">
            v0.2.0-alpha · focus refactor
          </p>

          <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="text-glow-red text-neon-red">KILL</span>
            <span className="text-glow-cyan text-neon-cyan">NODE</span>
          </h1>

          <p className="mt-6 max-w-lg text-base text-muted-foreground md:text-lg">
            Three-pillar privacy: Tor orchestration with live circuit telemetry, a hardened proxy
            mesh, and an emergency neural killswitch — built for operators who demand absolute
            network control.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2 font-mono text-[10px] text-muted-foreground/70">
            <span className="rounded border border-neon-cyan/20 px-2 py-0.5">Next.js 15</span>
            <span className="rounded border border-neon-cyan/20 px-2 py-0.5">Electron</span>
            <span className="rounded border border-neon-cyan/20 px-2 py-0.5">Tor</span>
            <span className="rounded border border-neon-cyan/20 px-2 py-0.5">Control Port</span>
            <span className="rounded border border-neon-red/20 px-2 py-0.5">obfs4 / lyrebird</span>
            <span className="rounded border border-neon-red/20 px-2 py-0.5">SQLite</span>
          </div>

          {/* Download */}
          <div id="download" className="mt-14 flex w-full max-w-xl scroll-mt-24 flex-col items-center gap-4">
            <DownloadReleases />
            <p className="max-w-md text-[10px] text-muted-foreground/60">
              Installers built by CI on tag push via{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-neon-cyan/80">
                release-desktop.yml
              </code>
              . Set{" "}
              <code className="font-mono text-neon-cyan/80">GITHUB_REPO_*</code>{" "}
              in <code className="font-mono">website/.env</code> to show your own releases.
            </p>
          </div>

          {/* Quick nav */}
          <div className="mt-14 grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/blog"
              className="group flex items-center gap-3 rounded border border-neon-cyan/20 bg-card/40 px-5 py-4 text-left text-sm font-mono text-muted-foreground transition-colors hover:border-neon-cyan/50 hover:bg-card/60 hover:text-neon-cyan"
            >
              <span className="text-neon-cyan opacity-60 transition-opacity group-hover:opacity-100">→</span>
              <span>Signal log (blog)</span>
            </Link>
            <Link
              href="/admin/login"
              className="group flex items-center gap-3 rounded border border-neon-red/20 bg-card/40 px-5 py-4 text-left text-sm font-mono text-muted-foreground transition-colors hover:border-neon-red/50 hover:bg-card/60 hover:text-neon-red"
            >
              <span className="text-neon-red opacity-60 transition-opacity group-hover:opacity-100">→</span>
              <span>Operator console</span>
            </Link>
          </div>
        </section>

        {/* Feature strip */}
        <section className="border-y border-white/5 bg-card/30 py-16">
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <p className="mb-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Core capabilities
            </p>
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className={`rounded border ${f.accent === "cyan" ? "border-neon-cyan/20" : "border-neon-red/20"} bg-black/40 p-5`}
                >
                  <dt
                    className={`mb-2 font-display text-xs font-bold uppercase tracking-widest ${f.accent === "cyan" ? "text-neon-cyan" : "text-neon-red"}`}
                  >
                    {f.label}
                  </dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">{f.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Phase strip */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6">
          <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            Roadmap
          </p>
          <div className="grid grid-cols-1 gap-4 font-mono text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            {["Phase 0: Foundation", "Phase 1: Hardening", "Phase 2: Distribution", "Phase 3/4: Messaging & Browser"].map(
              (p, i) => (
                <div
                  key={p}
                  className={`rounded border px-4 py-3 ${i < 2 ? "border-neon-cyan/30 text-neon-cyan/80" : "border-white/10 text-muted-foreground/50"}`}
                >
                  {i < 2 ? "✓ " : "○ "}{p}
                </div>
              )
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50">
            Full specification in{" "}
            <a
              href="https://github.com/Alaustrup/killnode/blob/main/PHASED_DEVELOPMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan/60 underline hover:text-neon-cyan"
            >
              PHASED_DEVELOPMENT.md
            </a>
            .
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
