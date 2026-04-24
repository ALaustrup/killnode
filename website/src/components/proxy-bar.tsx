"use client";

import { useState } from "react";

export function ProxyBar() {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let url = input.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    window.location.href = "/api/browse?url=" + encodeURIComponent(url);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="group flex items-center gap-2"
      aria-label="Proxy browser"
    >
      {/* Label */}
      <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-[0.3em] text-neon-red/50 sm:inline">
        Proxy
      </span>
      <span className="hidden text-neon-cyan/20 sm:inline">|</span>

      {/* Input */}
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Browse any URL anonymously…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border border-neon-cyan/15 bg-black/40 py-1.5 pl-3 pr-3 font-mono text-xs text-foreground placeholder-muted-foreground/25 outline-none transition-all focus:border-neon-cyan/50 focus:bg-black/70 focus:ring-1 focus:ring-neon-cyan/10"
        />
      </div>

      {/* Go button */}
      <button
        type="submit"
        disabled={!input.trim()}
        className="shrink-0 rounded border border-neon-cyan/25 bg-transparent px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon-cyan/70 transition-all hover:border-neon-cyan/60 hover:bg-neon-cyan/8 hover:text-neon-cyan hover:shadow-[0_0_12px_rgba(0,255,255,0.1)] disabled:cursor-not-allowed disabled:opacity-25"
      >
        Go
      </button>
    </form>
  );
}
