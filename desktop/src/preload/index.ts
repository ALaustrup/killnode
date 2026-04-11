import { contextBridge, ipcRenderer } from "electron";

export type KillNodeSettings = {
  torCustomPath?: string;
  ghostMode?: boolean;
  locationCode?: string;
  proxyRotationUrl?: string;
};

const api = {
  settingsGet: (): Promise<KillNodeSettings> => ipcRenderer.invoke("kn:settings:get"),
  settingsSet: (partial: Partial<KillNodeSettings>): Promise<KillNodeSettings> =>
    ipcRenderer.invoke("kn:settings:set", partial),
  torStart: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("kn:tor:start"),
  torStop: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("kn:tor:stop"),
  torStatus: (): Promise<{ running: boolean }> => ipcRenderer.invoke("kn:tor:status"),
  killswitch: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke("kn:killswitch"),
  restoreHint: (): Promise<string> => ipcRenderer.invoke("kn:restore-hint"),
  onionGenerate: (): Promise<{ url: string; simulated: boolean }> =>
    ipcRenderer.invoke("kn:onion:generate"),
  openExternal: (url: string) => ipcRenderer.invoke("kn:shell:open", url),
  pickTorBinary: (): Promise<string | null> => ipcRenderer.invoke("kn:dialog:tor"),
};

contextBridge.exposeInMainWorld("killnode", api);
