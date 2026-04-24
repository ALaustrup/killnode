"use client";

import { useState, useRef, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BrowsePage() {
  const [input, setInput] = useState("");
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Parse ?url= from the page query string so shareable links work
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("url");
    if (u) {
      setInput(u);
      navigate(u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildProxyUrl(raw: string): string {
    let url = raw.trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    return "/api/browse?url=" + encodeURIComponent(url);
  }

  function navigate(raw: string) {
    const url = raw.trim();
    if (!url) return;
    setError(null);
    setLoading(true);
    setProxyUrl(buildProxyUrl(url));
    // Update the page URL without full navigation so browser history works
    const pageUrl = "/browse?url=" + encodeURIComponent(url);
    window.history.replaceState(null, "", pageUrl);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(input);
  }

  function onIframeLoad() {
    setLoading(false);
  }

  function onIframeError() {
    setLoading(false);
    setError("Failed to load the page. The site may be blocking proxy access.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        {/* Header bar */}
        <section className="border-b border-neon-red/20 bg-black/60 px-4 py-4 backdrop-blur-sm md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 flex items-center gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-neon-red/60">
                killnode · proxy browser
              </p>
              <span className="rounded border border-neon-cyan/20 px-2 py-0.5 font-mono text-[9px] text-neon-cyan/60">
                server-side
              </span>
            </div>

            {/* URL bar */}
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-neon-red/50 select-none">
                  ⬡
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="example.com  or  https://example.com/path"
                  className="w-full rounded border border-neon-cyan/25 bg-card/60 py-2.5 pl-8 pr-4 font-mono text-sm text-foreground placeholder-muted-foreground/40 outline-none focus:border-neon-cyan/60 focus:ring-1 focus:ring-neon-cyan/20"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="shrink-0 rounded border border-neon-cyan/45 bg-transparent px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:shadow-[0_0_16px_rgba(0,255,255,0.15)] disabled:opacity-40"
                disabled={!input.trim() || loading}
              >
                {loading ? "Loading…" : "Browse"}
              </button>
            </form>

            {/* Status line */}
            {proxyUrl && !loading && !error && (
              <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground/50">
                Proxied via KillNode servers →{" "}
                <span className="text-neon-cyan/70">{input}</span>
              </p>
            )}
            {error && (
              <p className="mt-2 font-mono text-[10px] text-neon-red/70">{error}</p>
            )}
          </div>
        </section>

        {/* Proxy iframe / empty state */}
        {proxyUrl ? (
          <div className="relative flex-1">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-red/30 border-t-neon-cyan" />
                  <p className="font-mono text-xs text-muted-foreground/60">Routing through proxy…</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={proxyUrl}
              title="KillNode Proxy Browser"
              className="h-full w-full border-0"
              style={{ minHeight: "calc(100vh - 140px)" }}
              onLoad={onIframeLoad}
              onError={onIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        ) : (
          <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 md:px-6">
            {/* How it works */}
            <div className="mb-10 rounded border border-neon-cyan/15 bg-card/20 p-6">
              <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-neon-cyan">
                How it works
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Enter URL",
                    desc: "Type any website address. No software installation required.",
                    accent: "cyan",
                  },
                  {
                    step: "02",
                    title: "Server routes request",
                    desc: "KillNode's servers fetch the page. Your ISP only sees traffic to killnode.vercel.app.",
                    accent: "red",
                  },
                  {
                    step: "03",
                    title: "Browse freely",
                    desc: "The page renders in your browser. All links stay proxied automatically.",
                    accent: "cyan",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <span
                      className={`shrink-0 font-display text-2xl font-black ${item.accent === "cyan" ? "text-neon-cyan/30" : "text-neon-red/30"}`}
                    >
                      {item.step}
                    </span>
                    <div>
                      <p
                        className={`mb-1 font-mono text-xs font-bold uppercase tracking-widest ${item.accent === "cyan" ? "text-neon-cyan" : "text-neon-red"}`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick access */}
            <div className="mb-8">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
                Quick access
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "https://check.torproject.org",
                  "https://dnsleaktest.com",
                  "https://whatismyipaddress.com",
                  "https://ipleak.net",
                  "https://browserleaks.com",
                ].map((url) => (
                  <button
                    key={url}
                    onClick={() => {
                      setInput(url);
                      navigate(url);
                    }}
                    className="rounded border border-neon-cyan/15 bg-card/20 px-3 py-1.5 font-mono text-[10px] text-muted-foreground/60 transition-colors hover:border-neon-cyan/40 hover:text-neon-cyan"
                  >
                    {url.replace("https://", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded border border-neon-red/20 bg-neon-red/5 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-neon-red/70">
                ⚠ Legal notice
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70">
                This proxy routes requests through KillNode&apos;s servers. Use only for lawful
                purposes on networks you are authorized to access. Login-protected sites,
                JavaScript-heavy SPAs, and sites with strict CSP policies may not render correctly.
                No browsing data is logged or stored. Read{" "}
                <a
                  href="https://github.com/Alaustrup/killnode/blob/main/LEGAL_AND_ETHICS.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-cyan/70 underline hover:text-neon-cyan"
                >
                  LEGAL_AND_ETHICS.md
                </a>{" "}
                before use.
              </p>
            </div>
          </section>
        )}
      </main>

      {!proxyUrl && <SiteFooter />}
    </div>
  );
}
