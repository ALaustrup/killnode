import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { app } from "electron";

let torProcess: ChildProcess | null = null;

function resourcesTorDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "tor");
  }
  return path.join(app.getAppPath(), "resources", "tor");
}

function candidateTorPaths(customPath?: string): string[] {
  const list: string[] = [];
  if (customPath?.trim()) {
    list.push(customPath.trim());
  }
  const base = resourcesTorDir();
  if (process.platform === "win32") {
    list.push(path.join(base, "tor.exe"));
  } else {
    list.push(path.join(base, "tor"));
  }
  list.push("/usr/bin/tor", "/usr/sbin/tor");
  return list;
}

export function isTorRunning(): boolean {
  return torProcess !== null && torProcess.exitCode === null;
}

export async function startTor(options: {
  socksPort?: number;
  controlPort?: number;
  exitNodes?: string;
  customBinary?: string;
  maxCircuitDirtiness?: number;
}): Promise<{ ok: boolean; message: string }> {
  if (isTorRunning()) {
    return { ok: true, message: "Tor already running" };
  }
  const socksPort = options.socksPort ?? 9050;
  const controlPort = options.controlPort ?? 9051;
  const torPath = candidateTorPaths(options.customBinary).find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (!torPath) {
    return {
      ok: false,
      message:
        "Tor binary not found. Add Expert Bundle to resources/tor or install system Tor. See resources/tor/README.md",
    };
  }
  const dataDir = path.join(app.getPath("userData"), "tor-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const torrcPath = path.join(app.getPath("userData"), "torrc.killnode");
  const exitLine = options.exitNodes?.trim()
    ? `ExitNodes ${options.exitNodes.trim()}\nStrictNodes 0\n`
    : "";
  const mcd = options.maxCircuitDirtiness ?? 60;
  const torrc = `
SocksPort ${socksPort}
ControlPort ${controlPort}
CookieAuthentication 1
DataDirectory ${dataDir.replace(/\\/g, "/")}
${exitLine}
MaxCircuitDirtiness ${mcd}
`.trimStart();
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
  torProcess = proc;
  proc.on("exit", () => {
    torProcess = null;
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
  try {
    torProcess.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  torProcess = null;
  return { ok: true, message: "Tor stopped" };
}
