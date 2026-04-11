export {};

type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  proxyRotationUrl?: string;
};

declare global {
  interface Window {
    killnode: {
      settingsGet: () => Promise<KillNodeSettings>;
      settingsSet: (partial: Partial<KillNodeSettings>) => Promise<KillNodeSettings>;
      torStart: () => Promise<{ ok: boolean; message: string }>;
      torStop: () => Promise<{ ok: boolean; message: string }>;
      torStatus: () => Promise<{ running: boolean }>;
      killswitch: () => Promise<{ ok: boolean; message: string }>;
      restoreHint: () => Promise<string>;
      onionGenerate: () => Promise<{ url: string; simulated: boolean }>;
      openExternal: (url: string) => Promise<void>;
      pickTorBinary: () => Promise<string | null>;
    };
  }
}
