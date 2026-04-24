"use client";

import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BrowsePage() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill input from ?url= param (shareable links / back-nav)
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("url");
    if (u) setInput(u);
    inputRef.current?.focus();
  }, []);

  function navigate(raw: string) {
    let url = raw.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    // Full-page navigation to the proxy — no iframe needed
    window.location.href = "/api/browse?url=" + encodeURIComponent(url);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(input);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        {/* Proxy bar */}
        <section className="border-b border-neon-red/20 bg-black/70 px-4 py-5 backdrop-blur-sm md:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex items-center gap-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-neon-red/60">
                killnode · proxy browser
              </p>
              <span className="rounded border border-neon-cyan/20 px-2 py-0.5 font-mono text-[9px] text-neon-cyan/60">
                server-side · no install
              </span>
            </div>

            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-neon-red/40 select-none">
                  ⬡
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="example.com  or  https://example.com/path"
                  className="w-full rounded border border-neon-cyan/20 bg-card/60 py-3 pl-9 pr-4 font-mono text-sm text-foreground placeholder-muted-foreground/30 outline-none transition-all focus:border-neon-cyan/60 focus:ring-1 focus:ring-neon-cyan/15"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                className="shrink-0 rounded border border-neon-cyan/40 bg-transparent px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/10 hover:border-neon-cyan/70 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Browse
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:px-6">
          {/* How it works */}
          <div className="mb-8 rounded border border-neon-cyan/10 bg-card/15 p-5">
            <h2 className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.35em] text-neon-cyan/70">
              How it works
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Enter URL",
                  desc: "Type any website address. No software installation required.",
                  color: "cyan",
                },
                {
                  step: "02",
                  title: "Server routes request",
                  desc: "KillNode's servers fetch the page. Your ISP only sees traffic to killnode.vercel.app.",
                  color: "red",
                },
                {
                  step: "03",
                  title: "Browse freely",
                  desc: "A navigation bar is injected into every page so you can keep browsing within the proxy.",
                  color: "cyan",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span
                    className={`shrink-0 font-display text-3xl font-black leading-none ${item.color === "cyan" ? "text-neon-cyan/20" : "text-neon-red/20"}`}
                  >
                    {item.step}
                  </span>
                  <div>
                    <p
                      className={`mb-1 font-mono text-[10px] font-bold uppercase tracking-widest ${item.color === "cyan" ? "text-neon-cyan" : "text-neon-red"}`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground/70">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick access */}
          <div className="mb-8">
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.35em] text-muted-foreground/40">
              Quick access — IP &amp; anonymity tests
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
                  onClick={() => navigate(url)}
                  className="group rounded border border-neon-cyan/10 bg-card/20 px-3 py-1.5 font-mono text-[10px] text-muted-foreground/50 transition-all hover:border-neon-cyan/40 hover:bg-card/40 hover:text-neon-cyan"
                >
                  {url.replace("https://", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Limitations */}
          <div className="mb-6 rounded border border-neon-red/15 bg-neon-red/[0.04] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-neon-red/60">
              Known limitations
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground/60">
              <li>Login sessions generally do not work — cookies are scoped to this domain, not the proxied site.</li>
              <li>JavaScript-heavy single-page apps (React, Vue, Angular) may render partially or slowly.</li>
              <li>WebSocket connections are not proxied.</li>
              <li>Sites with very strict CSP policies may refuse to render correctly.</li>
            </ul>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] leading-relaxed text-muted-foreground/40">
            Use only for lawful purposes on networks you are authorised to access. No browsing data is logged or stored by KillNode. Read{" "}
            <a
              href="https://github.com/Alaustrup/killnode/blob/main/LEGAL_AND_ETHICS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan/50 underline hover:text-neon-cyan/80"
            >
              LEGAL_AND_ETHICS.md
            </a>{" "}
            before use.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
