import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NeuralLogo } from "@/components/neural-logo";
import { DownloadReleases } from "@/components/download-releases";
import { ProxyBar } from "@/components/proxy-bar";

const VERSION = "v1.0.1 (Alpha)";

const FEATURES = [
  {
    label: "Tor Orchestration",
    desc: "Control-port integration: live bootstrap progress (0–100%), circuit count, SIGNAL NEWNYM, Ghost mode, exit region, and bundled lyrebird bridges.",
    accent: "cyan",
  },
  {
    label: "Neural Killswitch",
    desc: "Ordered teardown: proxy mesh → Tor → OS interface severance. Dead-man timer auto-fires on unexpected Tor disconnect.",
    accent: "red",
  },
  {
    label: "Proxy Mesh",
    desc: "HTTP bridge on :9742 and hardened SOCKS5 gateway on :9741 — IPv4, hostname, and IPv6 — both tunnel through Tor after bootstrap.",
    accent: "cyan",
  },
  {
    label: "Web Proxy Browser",
    desc: "Server-side proxy built into this website. Route any URL through KillNode's servers instantly — no install, no config.",
    accent: "red",
  },
];

export default function HomePage() {
  return (
    <div className="kn-page flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Instant proxy bar ── */}
      <div className="border-b border-neon-cyan/10 bg-black/60 px-4 py-2.5 backdrop-blur-sm md:px-6">
        <div className="mx-auto max-w-5xl">
          <ProxyBar />
        </div>
      </div>

      <main className="flex flex-1 flex-col">
        {/* ── Hero ── */}
        <section className="kn-fade-in mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-16 text-center md:px-6 md:py-24">
          <NeuralLogo className="kn-logo mb-7 h-24 w-24 md:h-36 md:w-36" />

          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.4em] text-neon-cyan/60">
            {VERSION}
          </p>

          <h1 className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            <span className="text-glow-red text-neon-red">KILL</span>
            <span className="text-glow-cyan text-neon-cyan">NODE</span>
          </h1>

          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Internet anonymity tooling built for operators. Tor orchestration, hardened proxy mesh,
            neural killswitch, and an instant web proxy — all in one package.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono text-[10px] text-muted-foreground/60">
            {["Next.js 15", "Electron", "Tor", "Control Port", "obfs4 / lyrebird", "Web Proxy"].map((tag) => (
              <span key={tag} className="kn-pill rounded border border-neon-cyan/15 px-2 py-0.5 transition-colors hover:border-neon-cyan/45 hover:text-neon-cyan/90">
                {tag}
              </span>
            ))}
          </div>

          {/* Download */}
          <div id="download" className="mt-12 flex w-full max-w-xl scroll-mt-24 flex-col items-center gap-4">
            <DownloadReleases version={VERSION} />
          </div>

          {/* Quick nav */}
          <div className="mt-12 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: "/blog", label: "Signal log", accent: "cyan" },
              { href: "/browse", label: "Proxy browser", accent: "cyan" },
              { href: "/admin/login", label: "Operator console", accent: "red" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`kn-nav-card group flex items-center gap-3 rounded border bg-card/40 px-5 py-4 text-left text-sm font-mono text-muted-foreground transition-all hover:bg-card/70 ${
                  item.accent === "cyan"
                    ? "border-neon-cyan/15 hover:border-neon-cyan/50 hover:text-neon-cyan hover:shadow-[0_0_20px_rgba(0,255,255,0.08)]"
                    : "border-neon-red/15 hover:border-neon-red/50 hover:text-neon-red hover:shadow-[0_0_20px_rgba(255,0,60,0.08)]"
                }`}
              >
                <span
                  className={`opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 ${
                    item.accent === "cyan" ? "text-neon-cyan" : "text-neon-red"
                  }`}
                >
                  →
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Feature strip ── */}
        <section className="border-y border-white/5 bg-card/20 py-14">
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <p className="mb-8 text-center font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/50">
              Core capabilities
            </p>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className={`kn-feature-card group rounded border bg-black/50 p-5 transition-all ${
                    f.accent === "cyan"
                      ? "border-neon-cyan/15 hover:border-neon-cyan/40 hover:shadow-[0_0_24px_rgba(0,255,255,0.07)]"
                      : "border-neon-red/15 hover:border-neon-red/40 hover:shadow-[0_0_24px_rgba(255,0,60,0.07)]"
                  }`}
                >
                  <dt
                    className={`mb-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      f.accent === "cyan"
                        ? "text-neon-cyan/70 group-hover:text-neon-cyan"
                        : "text-neon-red/70 group-hover:text-neon-red"
                    }`}
                  >
                    {f.label}
                  </dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground/70 group-hover:text-muted-foreground">
                    {f.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Roadmap ── */}
        <section className="mx-auto w-full max-w-5xl px-4 py-14 md:px-6">
          <p className="mb-6 font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/50">
            Roadmap
          </p>
          <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Phase 0: Foundation", done: true },
              { label: "Phase 1: Hardening", done: true },
              { label: "Phase 2: Web Proxy Browser", done: true },
              { label: "Phase 3: Messaging & Onion Routing", done: false },
            ].map((p) => (
              <div
                key={p.label}
                className={`rounded border px-4 py-3 transition-colors ${
                  p.done
                    ? "border-neon-cyan/25 text-neon-cyan/70 hover:border-neon-cyan/50 hover:text-neon-cyan"
                    : "border-white/8 text-muted-foreground/40 hover:border-white/15"
                }`}
              >
                <span className={p.done ? "mr-1.5 text-neon-cyan/50" : "mr-1.5 text-muted-foreground/30"}>
                  {p.done ? "✓" : "○"}
                </span>
                {p.label}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/40">
            Full roadmap:{" "}
            <a
              href="https://github.com/Alaustrup/killnode/blob/main/PHASED_DEVELOPMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan/50 underline hover:text-neon-cyan"
            >
              PHASED_DEVELOPMENT.md
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
