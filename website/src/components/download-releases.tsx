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

export function DownloadReleases() {
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
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        const j = (await res.json()) as Payload;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load releases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="max-w-md font-mono text-xs text-[#00FFFF]/80">Pulling release telemetry from GitHub…</p>
    );
  }

  if (err || !data) {
    return (
      <div className="max-w-lg text-xs text-muted-foreground">
        <p className="text-[#FF0000]/90">Release feed offline: {err ?? "unknown"}</p>
        <Button variant="cta" size="lg" className="mt-4" asChild>
          <a href="https://github.com/Alaustrup/killnode/releases" rel="noopener noreferrer">
            Open releases (fallback)
          </a>
        </Button>
      </div>
    );
  }

  const primary =
    data.assets.find((a) => /\.exe$/i.test(a.name)) ||
    data.assets.find((a) => /\.AppImage$/i.test(a.name)) ||
    data.assets.find((a) => /\.dmg$/i.test(a.name)) ||
    data.assets[0];

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00FFFF]/70">
        latest · {data.tag || "—"} · {data.publishedAt?.slice(0, 10) ?? ""}
      </p>
      {primary && (
        <Button variant="cta" size="lg" asChild>
          <a href={primary.url} rel="noopener noreferrer">
            Download {primary.name}
          </a>
        </Button>
      )}
      {data.assets.length > 1 && (
        <ul className="w-full space-y-2 border border-[#FF0000]/25 bg-black/50 p-4 text-left font-mono text-[10px] text-muted-foreground">
          {data.assets.map((a) => (
            <li key={a.url} className="flex flex-wrap items-center justify-between gap-2">
              <a href={a.url} className="text-[#00FFFF] hover:underline" rel="noopener noreferrer">
                {a.name}
              </a>
              <span className="text-[#FF0000]/70">{formatBytes(a.size)}</span>
            </li>
          ))}
        </ul>
      )}
      {data.htmlUrl && (
        <a href={data.htmlUrl} className="text-xs text-[#00FFFF]/80 hover:underline" rel="noopener noreferrer">
          View release notes →
        </a>
      )}
    </div>
  );
}
