import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import { registerManagedChild } from "./process-registry";

let ssProc: ChildProcess | null = null;
let v2Proc: ChildProcess | null = null;

function killQuiet(p: ChildProcess | null) {
  if (!p) return;
  try {
    p.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

export function stopObfuscationBridge(): void {
  killQuiet(ssProc);
  killQuiet(v2Proc);
  ssProc = null;
  v2Proc = null;
}

/**
 * Spawns operator-supplied Shadowsocks / V2Ray binaries when paths exist and obfuscation is enabled.
 * Binaries are **not** redistributed with KillNode.
 */
export function startObfuscationBridge(opts: {
  enabled: boolean;
  shadowsocksBinaryPath?: string;
  shadowsocksConfigPath?: string;
  v2rayBinaryPath?: string;
  v2rayConfigPath?: string;
}): { ok: boolean; message: string } {
  stopObfuscationBridge();
  if (!opts.enabled) {
    return { ok: true, message: "Obfuscation bridge idle (disabled)." };
  }
  const msgs: string[] = [];

  if (opts.shadowsocksBinaryPath && opts.shadowsocksConfigPath) {
    if (!fs.existsSync(opts.shadowsocksBinaryPath) || !fs.existsSync(opts.shadowsocksConfigPath)) {
      msgs.push("Shadowsocks paths invalid.");
    } else {
      try {
        ssProc = spawn(opts.shadowsocksBinaryPath, ["-c", opts.shadowsocksConfigPath], {
          stdio: "ignore",
          windowsHide: true,
        });
        registerManagedChild(ssProc, "shadowsocks");
        ssProc.on("exit", () => {
          ssProc = null;
        });
        msgs.push("Shadowsocks child spawned.");
      } catch (e) {
        msgs.push(`Shadowsocks spawn failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (opts.v2rayBinaryPath && opts.v2rayConfigPath) {
    if (!fs.existsSync(opts.v2rayBinaryPath) || !fs.existsSync(opts.v2rayConfigPath)) {
      msgs.push("V2Ray paths invalid.");
    } else {
      try {
        v2Proc = spawn(opts.v2rayBinaryPath, ["run", "-c", opts.v2rayConfigPath], {
          stdio: "ignore",
          windowsHide: true,
        });
        registerManagedChild(v2Proc, "v2ray");
        v2Proc.on("exit", () => {
          v2Proc = null;
        });
        msgs.push("V2Ray child spawned.");
      } catch (e) {
        msgs.push(`V2Ray spawn failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (msgs.length === 0) {
    return {
      ok: true,
      message: "Obfuscation enabled but no valid binary/config pairs supplied.",
    };
  }

  return { ok: !msgs.some((m) => m.includes("failed") || m.includes("invalid")), message: msgs.join(" ") };
}
