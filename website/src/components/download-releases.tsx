"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Asset = { name: string; url: string; size: number };

type Payload = {
  tag: string;
  name: string;
  publishedAt: string;
  htmlUrl: string;
  assets: Asset[];
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Preferred primary asset order */
function pickPrimary(assets: Asset[]): Asset | undefined {
  const order = [/\.exe$/i, /\.AppImage$/i, /\.dmg$/i, /\.zip$/i];
  for (const re of order) {
    const found = assets.find((a) => re.test(a.name));
    if (found) return found;
  }
  return assets[0];
}

interface DownloadReleasesProps {
  /** Override the displayed version label (defaults to GitHub release tag) */
  version?: string;
}

export function DownloadReleases({ version }: DownloadReleasesProps) {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/releases/latest", { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`);
        }
        const j = (await res.json()) as Payload;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load releases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-56 animate-pulse rounded-md bg-neon-red/10" />
        <p className="font-mono text-[10px] text-neon-cyan/50">Pulling release telemetry…</p>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        {version && (
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan/60">
            {version}
          </p>
        )}
        <p className="font-mono text-xs text-neon-red/70">
          Release feed offline{err ? `: ${err}` : ""}.
        </p>
        <Button variant="cta" size="lg" asChild>
          <a
            href="https://github.com/Alaustrup/killnode/releases"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↓ Download {version ?? "latest"} →
          </a>
        </Button>
      </div>
    );
  }

  const primary = pickPrimary(data.assets);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      {/* Version badge */}
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan/60">
        <span className="text-neon-cyan">{version ?? data.tag ?? "—"}</span>
        {data.publishedAt ? ` · ${data.publishedAt.slice(0, 10)}` : ""}
      </p>

      {/* Primary CTA */}
      {primary && (
        <Button variant="cta" size="lg" className="w-full max-w-xs sm:w-auto" asChild>
          <a href={primary.url} target="_blank" rel="noopener noreferrer">
            ↓ {primary.name}
          </a>
        </Button>
      )}

      {/* All assets */}
      {data.assets.length > 0 && (
        <div className="w-full overflow-hidden rounded border border-neon-red/20 bg-black/50">
          <p className="border-b border-white/5 px-4 py-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
            All builds
          </p>
          <ul className="divide-y divide-white/5 px-4 py-1">
            {data.assets.map((a) => (
              <li key={a.url} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <a
                  href={a.url}
                  className="font-mono text-[11px] text-neon-cyan hover:underline"
                  rel="noopener noreferrer"
                >
                  {a.name}
                </a>
                <span className="font-mono text-[10px] text-neon-red/60">{formatBytes(a.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.htmlUrl && (
        <a
          href={data.htmlUrl}
          className="text-[11px] text-neon-cyan/60 hover:text-neon-cyan hover:underline"
          rel="noopener noreferrer"
        >
          Release notes on GitHub →
        </a>
      )}
    </div>
  );
}
