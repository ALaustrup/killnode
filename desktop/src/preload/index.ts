import { contextBridge, ipcRenderer } from "electron";

const INVOKE_CHANNELS = new Set([
  "kn:settings:get",
  "kn:settings:set",
  "kn:tor:start",
  "kn:tor:stop",
  "kn:tor:status",
  "kn:tor:newident",
  "kn:tor:bootstrap",
  "kn:proxy:status",
  "kn:killswitch",
  "kn:restore-hint",
  "kn:shell:open",
  "kn:dialog:tor",
]);

function invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  if (!INVOKE_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const TOAST_CHANNEL = "kn:toast";
const STATUS_PUSH_CHANNEL = "kn:tor:status-push";
const DEAD_MAN_FIRED_CHANNEL = "kn:dead-man-fired";
const DIRTY_SHUTDOWN_CHANNEL = "kn:dirty-shutdown";

export type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  bridgeEnabled?: boolean;
  bridgeLines?: string;
  deadManSeconds?: string;
};

const api = {
  settingsGet: () => invoke<KillNodeSettings>("kn:settings:get"),
  settingsSet: (partial: Partial<KillNodeSettings>) =>
    invoke<KillNodeSettings>("kn:settings:set", partial),

  torStart: () => invoke<{ ok: boolean; message: string }>("kn:tor:start"),
  torStop: () => invoke<{ ok: boolean; message: string }>("kn:tor:stop"),
  torStatus: () => invoke<{ running: boolean }>("kn:tor:status"),
  torNewIdent: () => invoke<{ ok: boolean; message: string }>("kn:tor:newident"),
  torBootstrap: () =>
    invoke<{ progress: number; circuits: number }>("kn:tor:bootstrap"),

  proxyStatus: () =>
    invoke<{ torSocks: number; httpPort: number; socksPort: number; sessionProxied: boolean }>(
      "kn:proxy:status"
    ),

  killswitch: () => invoke<{ ok: boolean; message: string }>("kn:killswitch"),
  restoreHint: () => invoke<string>("kn:restore-hint"),
  openExternal: (url: string) => invoke("kn:shell:open", url),
  pickTorBinary: () => invoke<string | null>("kn:dialog:tor"),

  onToast: (cb: (message: string) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, message: string) => cb(message);
    ipcRenderer.on(TOAST_CHANNEL, listener);
    return () => ipcRenderer.removeListener(TOAST_CHANNEL, listener);
  },

  onTorStatusPush: (cb: (status: { running: boolean }) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: { running: boolean }) => cb(payload);
    ipcRenderer.on(STATUS_PUSH_CHANNEL, listener);
    return () => ipcRenderer.removeListener(STATUS_PUSH_CHANNEL, listener);
  },

  onDeadManFired: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on(DEAD_MAN_FIRED_CHANNEL, listener);
    return () => ipcRenderer.removeListener(DEAD_MAN_FIRED_CHANNEL, listener);
  },

  onDirtyShutdown: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on(DIRTY_SHUTDOWN_CHANNEL, listener);
    return () => ipcRenderer.removeListener(DIRTY_SHUTDOWN_CHANNEL, listener);
  },
};

contextBridge.exposeInMainWorld("killnode", api);
