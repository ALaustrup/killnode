import { contextBridge, ipcRenderer, webUtils } from "electron";

const INVOKE_CHANNELS = new Set([
  "kn:settings:get",
  "kn:settings:set",
  "kn:tor:start",
  "kn:tor:stop",
  "kn:tor:status",
  "kn:proxy:status",
  "kn:killswitch",
  "kn:restore-hint",
  "kn:onion:generate",
  "kn:shell:open",
  "kn:dialog:tor",
  "kn:dialog:seed-files",
  "kn:torrent:add",
  "kn:torrent:seed",
  "kn:torrent:remove",
  "kn:torrent:telemetry",
]);

function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  if (!INVOKE_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const TELEMETRY_CHANNEL = "kn:torrent:telemetry";
const TOAST_CHANNEL = "kn:toast";

export type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  proxyRotationUrl?: string;
  shadowsocksBinaryPath?: string;
  shadowsocksConfigPath?: string;
  v2rayBinaryPath?: string;
  v2rayConfigPath?: string;
  obfuscationEnabled?: boolean;
};

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

const api = {
  settingsGet: () => invoke<KillNodeSettings>("kn:settings:get"),
  settingsSet: (partial: Partial<KillNodeSettings>) =>
    invoke<KillNodeSettings>("kn:settings:set", partial),
  torStart: () => invoke<{ ok: boolean; message: string }>("kn:tor:start"),
  torStop: () => invoke<{ ok: boolean; message: string }>("kn:tor:stop"),
  torStatus: () => invoke<{ running: boolean }>("kn:tor:status"),
  proxyStatus: () =>
    invoke<{ torSocks: number; httpPort: number; socksPort: number; sessionProxied: boolean }>(
      "kn:proxy:status"
    ),
  killswitch: () => invoke<{ ok: boolean; message: string }>("kn:killswitch"),
  restoreHint: () => invoke<string>("kn:restore-hint"),
  onionGenerate: () => invoke<{ url: string; simulated: boolean }>("kn:onion:generate"),
  openExternal: (url: string) => invoke("kn:shell:open", url),
  pickTorBinary: () => invoke<string | null>("kn:dialog:tor"),
  pickSeedFiles: () => invoke<string[]>("kn:dialog:seed-files"),
  torrentAdd: (magnetUri: string) =>
    invoke<{ ok: boolean; message: string; infoHash?: string }>("kn:torrent:add", magnetUri),
  torrentSeed: (paths: string[]) =>
    invoke<{ ok: boolean; message: string; infoHash?: string }>("kn:torrent:seed", paths),
  torrentRemove: (infoHash: string) =>
    invoke<{ ok: boolean; message: string }>("kn:torrent:remove", infoHash),
  torrentTelemetry: () => invoke<TorrentTelemetry[]>("kn:torrent:telemetry"),
  pathsFromDroppedFiles: (files: File[]) =>
    Array.from(files ?? []).map((f) => webUtils.getPathForFile(f)),
  onTelemetry: (cb: (rows: TorrentTelemetry[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: TorrentTelemetry[]) => cb(payload);
    ipcRenderer.on(TELEMETRY_CHANNEL, listener);
    return () => ipcRenderer.removeListener(TELEMETRY_CHANNEL, listener);
  },
  onToast: (cb: (message: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, message: string) => cb(message);
    ipcRenderer.on(TOAST_CHANNEL, listener);
    return () => ipcRenderer.removeListener(TOAST_CHANNEL, listener);
  },
};

contextBridge.exposeInMainWorld("killnode", api);
