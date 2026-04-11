export {};

type KillNodeSettings = {
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

type TorrentTelemetry = {
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

declare global {
  interface Window {
    killnode: {
      settingsGet: () => Promise<KillNodeSettings>;
      settingsSet: (partial: Partial<KillNodeSettings>) => Promise<KillNodeSettings>;
      torStart: () => Promise<{ ok: boolean; message: string }>;
      torStop: () => Promise<{ ok: boolean; message: string }>;
      torStatus: () => Promise<{ running: boolean }>;
      proxyStatus: () => Promise<{
        torSocks: number;
        httpPort: number;
        socksPort: number;
        sessionProxied: boolean;
      }>;
      killswitch: () => Promise<{ ok: boolean; message: string }>;
      restoreHint: () => Promise<string>;
      onionGenerate: () => Promise<{ url: string; simulated: boolean }>;
      openExternal: (url: string) => Promise<void>;
      pickTorBinary: () => Promise<string | null>;
      pickSeedFiles: () => Promise<string[]>;
      torrentAdd: (magnetUri: string) => Promise<{ ok: boolean; message: string; infoHash?: string }>;
      torrentSeed: (paths: string[]) => Promise<{ ok: boolean; message: string; infoHash?: string }>;
      torrentRemove: (infoHash: string) => Promise<{ ok: boolean; message: string }>;
      torrentTelemetry: () => Promise<TorrentTelemetry[]>;
      pathsFromDroppedFiles: (files: File[]) => string[];
      onTelemetry: (cb: (rows: TorrentTelemetry[]) => void) => () => void;
      onToast: (cb: (message: string) => void) => () => void;
    };
  }
}
