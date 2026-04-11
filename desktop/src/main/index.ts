import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "node:path";
import { startTor, stopTor, isTorRunning } from "./tor-manager";
import { engageKillswitch, restoreNetworkingHint } from "./network-killswitch";
import { generateSimulatedOnion } from "./onion-link";
import { createTray, destroyTray } from "./tray-manager";
import { readSettings, writeSettings } from "./settings-store";

let mainWindow: BrowserWindow | null = null;
let appQuitting = false;

function getWindow() {
  return mainWindow;
}

function createWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 880,
    minHeight: 560,
    backgroundColor: "#000000",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (appQuitting) {
      return;
    }
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function exitCodesForExitNodes(code: string | undefined): string | undefined {
  if (!code || code === "none") return undefined;
  const map: Record<string, string> = {
    us: "{us}",
    eu: "{de},{nl},{fr},{se}",
    asia: "{jp},{sg}",
    kali: "{de},{ch}",
  };
  return map[code] ?? `{${code}}`;
}

app.on("before-quit", () => {
  appQuitting = true;
});

app.whenReady().then(() => {
  createWindow();
  createTray(getWindow);

  ipcMain.handle("kn:settings:get", () => readSettings());
  ipcMain.handle("kn:settings:set", (_e, partial: Record<string, unknown>) => {
    return writeSettings(partial as never);
  });

  ipcMain.handle("kn:tor:start", async () => {
    const s = readSettings();
    return startTor({
      customBinary: s.torCustomPath,
      exitNodes: exitCodesForExitNodes(s.locationCode),
      maxCircuitDirtiness: s.ghostMode ? 45 : 60,
    });
  });

  ipcMain.handle("kn:tor:stop", () => stopTor());
  ipcMain.handle("kn:tor:status", () => ({ running: isTorRunning() }));

  ipcMain.handle("kn:killswitch", async () => {
    const r = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Cancel", "Sever network"],
      defaultId: 0,
      cancelId: 0,
      title: "Neural Killswitch",
      message: "This will attempt to disable network interfaces on this machine.",
      detail:
        "You may need Administrator (Windows) or root/polkit (Linux). You are responsible for lawful, authorized use. See LEGAL_AND_ETHICS.md.",
    });
    if (r.response !== 1) {
      return { ok: false, message: "Cancelled" };
    }
    return engageKillswitch();
  });

  ipcMain.handle("kn:restore-hint", () => restoreNetworkingHint());

  ipcMain.handle("kn:onion:generate", () => ({ url: generateSimulatedOnion(), simulated: true }));

  ipcMain.handle("kn:shell:open", (_e, url: string) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
      return shell.openExternal(url);
    }
    return Promise.resolve();
  });

  ipcMain.handle("kn:dialog:tor", async () => {
    const r = await dialog.showOpenDialog({
      title: "Select Tor binary",
      properties: ["openFile"],
      filters: [
        { name: "Tor / executables", extensions: ["exe", "tor", ""] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });

  app.on("activate", () => {
    createWindow();
  });
});

app.on("window-all-closed", () => {
  /* Background + tray: do not quit here */
});

app.on("will-quit", () => {
  stopTor();
  destroyTray();
});
