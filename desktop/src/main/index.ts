import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "node:path";
import { initDesktopDatabase, disconnectPrisma, getPrisma } from "./prisma";
import { readSettings, writeSettings } from "./settings-service";
import {
  startTor,
  stopTor,
  isTorRunning,
  getTorSocksPort,
  setTorUnexpectedExitCallback,
} from "./tor-manager";
import { torNewIdentity, torBootstrapProgress, torCircuitCount } from "./tor-control";
import { executeFullKillswitch } from "./killswitch-orchestrator";
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

let mainWindow: BrowserWindow | null = null;
let appQuitting = false;
let deadManTimer: ReturnType<typeof setTimeout> | null = null;

const gotLock = app.requestSingleInstanceLock();
if (gotLock) {
  app.on("second-instance", () => {
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

  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(false);
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (appQuitting) return;
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

function clearDeadManTimer(): void {
  if (deadManTimer) {
    clearTimeout(deadManTimer);
    deadManTimer = null;
  }
}

function armDeadManTimer(seconds: number): void {
  clearDeadManTimer();
  if (seconds <= 0) return;
  deadManTimer = setTimeout(async () => {
    deadManTimer = null;
    mainWindow?.webContents.send("kn:toast", `Dead-man timer fired (${seconds}s) — severing network.`);
    await executeFullKillswitch();
    mainWindow?.webContents.send("kn:dead-man-fired", {});
  }, seconds * 1000);
}

if (gotLock) {
  app.on("before-quit", () => {
    appQuitting = true;
  });

  app.whenReady().then(async () => {
    await initDesktopDatabase();
    const prisma = getPrisma();

    // Detect dirty shutdown from previous session
    const dirtyRow = await prisma.setting.findUnique({ where: { key: "_torActive" } });
    if (dirtyRow?.value === "1") {
      // Tor was active when we last crashed or were force-killed
      setTimeout(() => {
        mainWindow?.webContents.send(
          "kn:toast",
          "⚠ Unclean shutdown detected — Tor was active. Verify your network state."
        );
        mainWindow?.webContents.send("kn:dirty-shutdown", {});
      }, 1500);
    }

    // Register dead-man callback — fires when Tor exits unexpectedly
    setTorUnexpectedExitCallback(async () => {
      const s = await readSettings(prisma);
      const secs = parseInt(s.deadManSeconds ?? "0", 10);
      if (secs > 0) {
        mainWindow?.webContents.send(
          "kn:toast",
          `Tor disconnected — dead-man timer armed (${secs}s).`
        );
        armDeadManTimer(secs);
      } else {
        mainWindow?.webContents.send("kn:toast", "Tor process exited unexpectedly.");
      }
      mainWindow?.webContents.send("kn:tor:status-push", { running: false });
      // Clear the dirty flag since we know about the exit now
      await prisma.setting.deleteMany({ where: { key: "_torActive" } }).catch(() => null);
    });

    createWindow();
    createTray(getWindow);

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
          bridgeEnabled: s.bridgeEnabled,
          bridgeLines: s.bridgeLines,
        });
        if (!tor.ok) return tor;
        torSummary = tor.message;
      }

      try {
        await waitForSocksPortOpen(getTorSocksPort(), 22_000);
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }

      const stack = await startLocalProxyStack(getTorSocksPort());
      if (!stack.ok) return stack;

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

      // Mark Tor as active for dirty-shutdown detection
      await prisma.setting
        .upsert({ where: { key: "_torActive" }, create: { key: "_torActive", value: "1" }, update: { value: "1" } })
        .catch(() => null);

      // Re-arm dead-man with current setting
      clearDeadManTimer();
      const secs = parseInt(s.deadManSeconds ?? "0", 10);
      if (secs > 0) {
        // Dead-man only fires on unexpected exit — not on clean stop
        // The timer here is deliberately NOT started; it starts only via the exit callback.
      }

      return { ok: true, message: `${torSummary} · ${stack.message}` };
    });

    ipcMain.handle("kn:tor:stop", async () => {
      clearDeadManTimer();
      await stopLocalProxyStack();
      const t = stopTor();
      // Clear dirty-shutdown marker since this was intentional
      await prisma.setting.deleteMany({ where: { key: "_torActive" } }).catch(() => null);
      return t;
    });

    ipcMain.handle("kn:tor:status", () => ({ running: isTorRunning() }));

    ipcMain.handle("kn:tor:newident", async () => torNewIdentity());

    ipcMain.handle("kn:tor:bootstrap", async () => ({
      progress: await torBootstrapProgress(),
      circuits: await torCircuitCount(),
    }));

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
        message: "This will stop all proxies and Tor, then attempt OS-level network severance.",
        detail:
          "Requires Administrator (Windows) or elevated privileges (Linux). You are solely responsible for lawful, authorized use.",
      });
      if (r.response !== 1) return { ok: false, message: "Cancelled" };
      clearDeadManTimer();
      return executeFullKillswitch();
    });

    ipcMain.handle("kn:restore-hint", () => restoreNetworkingHint());

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
  });

  app.on("activate", () => {
    createWindow();
  });

  app.on("window-all-closed", () => {
    /* tray keeps process alive */
  });

  app.on("will-quit", async () => {
    clearDeadManTimer();
    setTorUnexpectedExitCallback(null);
    await stopLocalProxyStack();
    stopTor();
    await disconnectPrisma();
    destroyTray();
  });
}
