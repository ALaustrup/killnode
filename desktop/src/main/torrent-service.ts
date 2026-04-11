import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { app, type BrowserWindow } from "electron";
import { SocksProxyAgent } from "socks-proxy-agent";
import WebTorrent from "webtorrent";
import type { PrismaClient } from "./generated/prisma";

const require = createRequire(import.meta.url);
const magnetDecode = require("magnet-uri") as (uri: string) => {
  infoHash?: string | Buffer | Uint8Array;
  name?: string | Buffer;
};

// WebTorrent ships without TypeScript declarations; see webtorrent.d.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let currentProxy: string | undefined;

function infoHashHex(parsed: ReturnType<typeof magnetDecode>): string | null {
  const ih = parsed.infoHash as string | Buffer | Uint8Array | undefined;
  if (!ih) return null;
  if (typeof ih === "string") return ih.toLowerCase();
  return Buffer.from(ih).toString("hex").toLowerCase();
}

function wireTorrentTelemetry(t: { on: (ev: string, fn: () => void) => void }) {
  const bump = () => broadcastTelemetry();
  t.on("download", bump);
  t.on("upload", bump);
  t.on("done", bump);
}

function buildTrackerProxyOpts(proxyUrl?: string): Record<string, unknown> {
  if (!proxyUrl) return {};
  const agent = new SocksProxyAgent(proxyUrl);
  return {
    proxyOpts: {
      httpAgent: agent,
      httpsAgent: agent,
      socksProxy: agent,
    },
  };
}

function getOrCreateClient(proxy?: string): any {
  if (client && proxy !== currentProxy) {
    client.destroy();
    client = null;
  }
  currentProxy = proxy;
  if (!client) {
    client = new WebTorrent({
      utp: false,
      dht: false,
      lsd: false,
      webSeeds: false,
      natUpnp: false,
      natPmp: false,
      seedOutgoingConnections: true,
      tracker: {
        ...buildTrackerProxyOpts(proxy),
      },
    });
    client.on("torrent", (t: { on: (ev: string, fn: () => void) => void }) => {
      wireTorrentTelemetry(t);
      broadcastTelemetry();
    });
  }
  return client;
}

let telemetryTimer: NodeJS.Timeout | null = null;
let telemetryTarget: BrowserWindow | null = null;

export function setTelemetryWindow(win: BrowserWindow | null) {
  telemetryTarget = win;
}

function broadcastTelemetry() {
  if (!telemetryTarget || telemetryTarget.isDestroyed()) return;
  telemetryTarget.webContents.send("kn:torrent:telemetry", listTelemetry());
}

export function startTelemetryLoop(): void {
  if (telemetryTimer) return;
  telemetryTimer = setInterval(() => broadcastTelemetry(), 1000);
}

export function stopTelemetryLoop(): void {
  if (telemetryTimer) {
    clearInterval(telemetryTimer);
    telemetryTimer = null;
  }
}

export type TorrentTelemetry = {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  ratio: number;
  numPeers: number;
  done: boolean;
};

export function listTelemetry(): TorrentTelemetry[] {
  if (!client) return [];
  return client.torrents.map((t: {
    infoHash: string;
    name?: string;
    progress: number;
    downloadSpeed: number;
    uploadSpeed: number;
    downloaded: number;
    uploaded: number;
    numPeers: number;
    done: boolean;
  }) => {
    const downloaded = t.downloaded || 0;
    const uploaded = t.uploaded || 0;
    const ratio = downloaded > 0 ? uploaded / downloaded : uploaded > 0 ? Infinity : 0;
    return {
      infoHash: t.infoHash,
      name: t.name || t.infoHash,
      progress: t.progress,
      downloadSpeed: t.downloadSpeed,
      uploadSpeed: t.uploadSpeed,
      downloaded,
      uploaded,
      ratio: Number.isFinite(ratio) ? ratio : 999,
      numPeers: t.numPeers,
      done: t.done,
    };
  });
}

export async function addMagnetFromUri(
  prisma: PrismaClient,
  magnetLink: string,
  proxy?: string
): Promise<{ ok: boolean; message: string; infoHash?: string }> {
  const parsed = magnetDecode(magnetLink);
  const infoHash = infoHashHex(parsed);
  if (!infoHash) {
    return { ok: false, message: "Invalid magnet (missing info hash)." };
  }
  const dir = path.join(app.getPath("userData"), "torrents");
  fs.mkdirSync(dir, { recursive: true });
  const wt = getOrCreateClient(proxy);
  if (wt.get(infoHash)) {
    return { ok: true, message: "Torrent already active.", infoHash };
  }
  const displayName =
    typeof parsed.name === "string" ? parsed.name : Buffer.isBuffer(parsed.name) ? parsed.name.toString("utf8") : null;
  await prisma.torrentJob.upsert({
    where: { infoHash },
    create: { infoHash, magnetUri: magnetLink, name: displayName },
    update: { magnetUri: magnetLink, name: displayName ?? undefined },
  });
  return await new Promise((resolve) => {
    const torrent = wt.add(magnetLink, { path: dir });
    torrent.on("ready", () => {
      void prisma.torrentJob
        .update({ where: { infoHash }, data: { name: torrent.name } })
        .catch(() => undefined);
      resolve({ ok: true, message: "Torrent ready.", infoHash: torrent.infoHash });
    });
    torrent.on("error", (err: unknown) => {
      resolve({ ok: false, message: err instanceof Error ? err.message : String(err) });
    });
  });
}

export async function seedPaths(
  paths: string[],
  proxy?: string
): Promise<{ ok: boolean; message: string; infoHash?: string }> {
  if (paths.length === 0) {
    return { ok: false, message: "No paths." };
  }
  const dir = path.join(app.getPath("userData"), "torrents");
  fs.mkdirSync(dir, { recursive: true });
  const wt = getOrCreateClient(proxy);
  return await new Promise((resolve) => {
    let settled = false;
    wt.seed(
      paths,
      { path: dir },
      (torrent: { on: (ev: string, fn: (e?: unknown) => void) => void; infoHash: string }) => {
        wireTorrentTelemetry(torrent);
        torrent.on("error", (err: unknown) => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, message: err instanceof Error ? err.message : String(err) });
        });
        if (!settled) {
          settled = true;
          resolve({ ok: true, message: "Seeding started.", infoHash: torrent.infoHash });
        }
      }
    );
  });
}

export function removeTorrent(infoHash: string): { ok: boolean; message: string } {
  if (!client) return { ok: false, message: "Client offline." };
  const t = client.get(infoHash);
  if (!t) return { ok: false, message: "Torrent not found." };
  t.destroy();
  return { ok: true, message: "Torrent destroyed." };
}

export async function destroyTorrentEngine(): Promise<void> {
  stopTelemetryLoop();
  if (client) {
    client.destroy();
    client = null;
  }
  currentProxy = undefined;
}
