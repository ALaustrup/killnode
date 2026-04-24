export {};

type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  bridgeEnabled?: boolean;
  bridgeLines?: string;
  deadManSeconds?: string;
};

declare global {
  interface Window {
    killnode: {
      settingsGet: () => Promise<KillNodeSettings>;
      settingsSet: (partial: Partial<KillNodeSettings>) => Promise<KillNodeSettings>;

      torStart: () => Promise<{ ok: boolean; message: string }>;
      torStop: () => Promise<{ ok: boolean; message: string }>;
      torStatus: () => Promise<{ running: boolean }>;
      torNewIdent: () => Promise<{ ok: boolean; message: string }>;
      torBootstrap: () => Promise<{ progress: number; circuits: number }>;

      proxyStatus: () => Promise<{
        torSocks: number;
        httpPort: number;
        socksPort: number;
        sessionProxied: boolean;
      }>;

      killswitch: () => Promise<{ ok: boolean; message: string }>;
      restoreHint: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      pickTorBinary: () => Promise<string | null>;

      onToast: (cb: (message: string) => void) => () => void;
      onTorStatusPush: (cb: (status: { running: boolean }) => void) => () => void;
      onDeadManFired: (cb: () => void) => () => void;
      onDirtyShutdown: (cb: () => void) => () => void;
    };
  }
}
