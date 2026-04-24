import { spawn, execSync, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { app } from "electron";
import { registerManagedChild } from "./process-registry";
import { setControlPort } from "./tor-control";

let torProcess: ChildProcess | null = null;
let lastSocksPort = 9050;
let _intentionalStop = false;
let _unexpectedExitCb: (() => void) | null = null;

export function setTorUnexpectedExitCallback(cb: (() => void) | null): void {
  _unexpectedExitCb = cb;
}

function resourcesTorDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "tor");
  }
  return path.join(app.getAppPath(), "resources", "tor");
}

function findTorInPath(): string | null {
  try {
    const cmd = process.platform === "win32" ? "where.exe tor.exe" : "which tor";
    const result = execSync(cmd, { encoding: "utf8", timeout: 3000 }).trim();
    const first = result.split(/\r?\n/)[0].trim();
    if (first && fs.existsSync(first)) return first;
  } catch {
    /* not in PATH */
  }
  return null;
}

function candidateTorPaths(customPath?: string): string[] {
  const list: string[] = [];
  if (customPath?.trim()) {
    list.push(customPath.trim());
  }
  const base = resourcesTorDir();
  if (process.platform === "win32") {
    list.push(path.join(base, "tor.exe"));
    const localApp = process.env["LOCALAPPDATA"] ?? "";
    const progFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";
    list.push(
      path.join(localApp, "Tor Browser", "Browser", "TorBrowser", "Tor", "tor.exe"),
      path.join(progFiles, "Tor Browser", "Browser", "TorBrowser", "Tor", "tor.exe"),
    );
  } else {
    list.push(path.join(base, "tor"));
    list.push("/usr/bin/tor", "/usr/sbin/tor", "/usr/local/bin/tor");
  }
  const fromPath = findTorInPath();
  if (fromPath) list.push(fromPath);
  return list;
}

function lybirdPath(): string | null {
  const base = resourcesTorDir();
  const pt = path.join(base, "pluggable_transports");
  const binary = process.platform === "win32" ? "lyrebird.exe" : "lyrebird";
  const p = path.join(pt, binary);
  return fs.existsSync(p) ? p : null;
}

export function isTorRunning(): boolean {
  return torProcess !== null && torProcess.exitCode === null;
}

export function getTorSocksPort(): number {
  return lastSocksPort;
}

export function getTorControlPort(): number {
  return 9051;
}

export async function startTor(options: {
  socksPort?: number;
  controlPort?: number;
  exitNodes?: string;
  customBinary?: string;
  maxCircuitDirtiness?: number;
  bridgeEnabled?: boolean;
  bridgeLines?: string;
}): Promise<{ ok: boolean; message: string }> {
  if (isTorRunning()) {
    return { ok: true, message: "Tor already running" };
  }
  const socksPort = options.socksPort ?? 9050;
  lastSocksPort = socksPort;
  const controlPort = options.controlPort ?? 9051;
  setControlPort(controlPort);

  const torPath = candidateTorPaths(options.customBinary).find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (!torPath) {
    const isWin = process.platform === "win32";
    const hint = isWin
      ? "Download the Tor Expert Bundle from torproject.org and place tor.exe in resources/tor/, or install Tor Browser."
      : "Run: sudo apt install tor  (Debian/Ubuntu/Kali) or place the binary in resources/tor/.";
    return { ok: false, message: `Tor binary not found. ${hint}` };
  }

  const dataDir = path.join(app.getPath("userData"), "tor-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const torrcPath = path.join(app.getPath("userData"), "torrc.killnode");

  const exitLine = options.exitNodes?.trim()
    ? `ExitNodes ${options.exitNodes.trim()}\nStrictNodes 0\n`
    : "";
  const mcd = options.maxCircuitDirtiness ?? 60;

  let bridgeSection = "";
  if (options.bridgeEnabled && options.bridgeLines?.trim()) {
    const lyrebird = lybirdPath();
    if (lyrebird) {
      const lyrePath = lyrebird.replace(/\\/g, "/");
      const lines = options.bridgeLines
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `Bridge obfs4 ${l}`)
        .join("\n");
      bridgeSection = `UseBridges 1\nClientTransportPlugin obfs4 exec ${lyrePath}\n${lines}\n`;
    }
  }

  const torrc = `SocksPort ${socksPort}
ControlPort ${controlPort}
CookieAuthentication 1
DataDirectory ${dataDir.replace(/\\/g, "/")}
${exitLine}MaxCircuitDirtiness ${mcd}
${bridgeSection}`.trimEnd() + "\n";

  fs.writeFileSync(torrcPath, torrc, "utf8");

  let proc: ChildProcess;
  try {
    proc = spawn(torPath, ["-f", torrcPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Failed to spawn Tor: ${msg}` };
  }

  _intentionalStop = false;
  torProcess = proc;
  registerManagedChild(proc, "tor");

  proc.on("exit", () => {
    torProcess = null;
    if (!_intentionalStop && _unexpectedExitCb) {
      _unexpectedExitCb();
    }
  });

  proc.stderr?.on("data", (d) => {
    // eslint-disable-next-line no-console
    console.error("[tor]", d.toString());
  });

  return { ok: true, message: `Tor starting (${path.basename(torPath)}) SOCKS ${socksPort}` };
}

export function stopTor(): { ok: boolean; message: string } {
  if (!torProcess || torProcess.exitCode !== null) {
    torProcess = null;
    return { ok: true, message: "Tor not running" };
  }
  _intentionalStop = true;
  try {
    torProcess.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  torProcess = null;
  return { ok: true, message: "Tor stopped" };
}
