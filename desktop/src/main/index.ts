import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "node:path";
import { initDesktopDatabase, disconnectPrisma, getPrisma } from "./prisma";
import { readSettings, writeSettings } from "./settings-service";
import { startTor, stopTor, isTorRunning, getTorSocksPort } from "./tor-manager";
import { executeFullKillswitch } from "./killswitch-orchestrator";
import { generateSimulatedOnion } from "./onion-link";
import { createTray, destroyTray } from "./tray-manager";
import { restoreNetworkingHint } from "./network-killswitch";
import {
  startLocalProxyStack,
  stopLocalProxyStack,
  getLocalProxyPorts,
  applyElectronSessionProxy,
  waitForHttpBridgeLocal,
  isElectronSessionProxyActive,
} from "./proxy-controller";
import { waitForSocksPortOpen } from "./tor-readiness";
import { startObfuscationBridge, stopObfuscationBridge } from "./obfuscation-bridge";
import {
  addMagnetFromUri,
  destroyTorrentEngine,
  listTelemetry,
  removeTorrent,
  seedPaths,
  setTelemetryWindow,
  startTelemetryLoop,
  stopTelemetryLoop,
} from "./torrent-service";

let mainWindow: BrowserWindow | null = null;
let appQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (gotLock) {
  app.on("second-instance", (_event, argv) => {
    const magnet = argv.find((a) => typeof a === "string" && a.startsWith("magnet:"));
    if (magnet) {
      void handleMagnetDeepLink(magnet);
    }
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
} else {
  app.quit();
}

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
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 600,
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

  setTelemetryWindow(mainWindow);
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(false);
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
    setTelemetryWindow(null);
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

async function handleMagnetDeepLink(uri: string): Promise<void> {
  try {
    const prisma = getPrisma();
    const proxy = isTorRunning() ? `socks5://127.0.0.1:${getTorSocksPort()}` : undefined;
    const r = await addMagnetFromUri(prisma, uri, proxy);
    mainWindow?.webContents.send("kn:toast", r.message);
  } catch (e) {
    mainWindow?.webContents.send(
      "kn:toast",
      e instanceof Error ? e.message : "Magnet ingest failed."
    );
  }
}

if (gotLock) {
  app.on("before-quit", () => {
    appQuitting = true;
  });

  app.whenReady().then(async () => {
  await initDesktopDatabase();
  const prisma = getPrisma();

  if (process.platform === "darwin") {
    app.on("open-url", (event, url) => {
      event.preventDefault();
      if (url.startsWith("magnet:")) {
        void handleMagnetDeepLink(url);
      }
    });
  }

  let pendingMagnet: string | null = process.argv.find((a) => a.startsWith("magnet:")) ?? null;

  if (!app.isDefaultProtocolClient("magnet")) {
    if (process.defaultApp && process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("magnet", process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient("magnet");
    }
  }

  createWindow();
  createTray(getWindow);
  startTelemetryLoop();
  if (pendingMagnet) {
    void handleMagnetDeepLink(pendingMagnet);
    pendingMagnet = null;
  }

  ipcMain.handle("kn:settings:get", () => readSettings(prisma));
  ipcMain.handle("kn:settings:set", (_e, partial: Record<string, unknown>) =>
    writeSettings(prisma, partial as never)
  );

  ipcMain.handle("kn:tor:start", async () => {
    const s = await readSettings(prisma);
    let torSummary = "Tor already running";
    if (!isTorRunning()) {
      const tor = await startTor({
        customBinary: s.torCustomPath,
        exitNodes: exitCodesForExitNodes(s.locationCode),
        maxCircuitDirtiness: s.ghostMode ? 45 : 60,
      });
      if (!tor.ok) return tor;
      torSummary = tor.message;
    }
    try {
      await waitForSocksPortOpen(getTorSocksPort(), 22_000);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }
    startObfuscationBridge({
      enabled: !!s.obfuscationEnabled,
      shadowsocksBinaryPath: s.shadowsocksBinaryPath,
      shadowsocksConfigPath: s.shadowsocksConfigPath,
      v2rayBinaryPath: s.v2rayBinaryPath,
      v2rayConfigPath: s.v2rayConfigPath,
    });
    const stack = await startLocalProxyStack(getTorSocksPort());
    if (!stack.ok) {
      return stack;
    }
    try {
      await waitForHttpBridgeLocal(10_000);
      await applyElectronSessionProxy();
    } catch (e) {
      await stopLocalProxyStack();
      return {
        ok: false,
        message: `Session proxy not applied: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    return { ok: true, message: `${torSummary} · ${stack.message}` };
  });

  ipcMain.handle("kn:tor:stop", async () => {
    await stopLocalProxyStack();
    stopObfuscationBridge();
    const t = stopTor();
    return t;
  });

  ipcMain.handle("kn:tor:status", () => ({ running: isTorRunning() }));

  ipcMain.handle("kn:proxy:status", () => ({
    torSocks: getTorSocksPort(),
    ...getLocalProxyPorts(),
    sessionProxied: isElectronSessionProxyActive(),
  }));

  ipcMain.handle("kn:killswitch", async () => {
    const r = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Cancel", "Sever network"],
      defaultId: 0,
      cancelId: 0,
      title: "Neural Killswitch",
      message: "This will destroy torrents, proxies, Tor children, and attempt host network severance.",
      detail:
        "Requires Administrator (Windows) or elevated privileges on Linux (Kali). You are solely responsible for lawful, authorized use.",
    });
    if (r.response !== 1) {
      return { ok: false, message: "Cancelled" };
    }
    return executeFullKillswitch();
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

  ipcMain.handle("kn:dialog:seed-files", async () => {
    const r = await dialog.showOpenDialog({
      title: "Select files to seed",
      properties: ["openFile", "multiSelections"],
    });
    return r.canceled ? [] : r.filePaths;
  });

  ipcMain.handle("kn:torrent:add", async (_e, magnetUri: string) => {
    const proxy = isTorRunning() ? `socks5://127.0.0.1:${getTorSocksPort()}` : undefined;
    return addMagnetFromUri(prisma, magnetUri, proxy);
  });

  ipcMain.handle("kn:torrent:seed", async (_e, paths: string[]) => {
    const proxy = isTorRunning() ? `socks5://127.0.0.1:${getTorSocksPort()}` : undefined;
    return seedPaths(paths, proxy);
  });

  ipcMain.handle("kn:torrent:remove", (_e, infoHash: string) => removeTorrent(infoHash));

  ipcMain.handle("kn:torrent:telemetry", () => listTelemetry());
  });

  app.on("activate", () => {
    createWindow();
    setTelemetryWindow(mainWindow);
  });

  app.on("window-all-closed", () => {
    /* tray keeps process alive */
  });

  app.on("will-quit", async () => {
    stopTelemetryLoop();
    await destroyTorrentEngine();
    await stopLocalProxyStack();
    stopObfuscationBridge();
    stopTor();
    await disconnectPrisma();
    destroyTray();
  });
}
