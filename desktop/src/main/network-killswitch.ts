import { execFile } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execFileAsync = promisify(execFile);

/**
 * Attempts to sever routine network connectivity on the host.
 * Often requires elevated privileges; failures return stderr for UI display.
 */
export async function engageKillswitch(): Promise<{ ok: boolean; message: string }> {
  const p = platform();
  try {
    if (p === "win32") {
      await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Get-NetAdapter | Disable-NetAdapter -Confirm:$false",
      ]);
      return { ok: true, message: "Windows adapters disabled via PowerShell (may require Administrator)." };
    }
    if (p === "linux") {
      try {
        await execFileAsync("nmcli", ["networking", "off"]);
        return { ok: true, message: "NetworkManager: networking off." };
      } catch {
        try {
          await execFileAsync("rfkill", ["block", "all"]);
          return {
            ok: true,
            message: "rfkill: blocked wireless (and some radios). Ethernet may remain up; root may be required.",
          };
        } catch (e) {
          const err = e as { message?: string };
          return {
            ok: false,
            message: `Linux killswitch needs NetworkManager (nmcli) or rfkill. ${err.message ?? String(e)}`,
          };
        }
      }
    }
    if (p === "darwin") {
      await execFileAsync("bash", [
        "-lc",
        "networksetup -setairportpower en0 off 2>/dev/null || true; networksetup -setairportpower en1 off 2>/dev/null || true",
      ]);
      return {
        ok: true,
        message: "macOS: attempted Wi‑Fi power off on common interfaces. Ethernet may still be active.",
      };
    }
    return { ok: false, message: `Unsupported platform: ${p}` };
  } catch (e) {
    const err = e as { stderr?: Buffer; message?: string };
    const detail = err.stderr?.toString() || err.message || String(e);
    return {
      ok: false,
      message: `Killswitch failed (often needs admin/root): ${detail.trim()}`,
    };
  }
}

export async function restoreNetworkingHint(): Promise<string> {
  const p = platform();
  if (p === "win32") {
    return "Windows: PowerShell as Administrator → Get-NetAdapter | Enable-NetAdapter -Confirm:$false";
  }
  if (p === "linux") {
    return "Linux: nmcli networking on — or ip link set <iface> up for each interface";
  }
  if (p === "darwin") {
    return "macOS: networksetup -setairportpower <device> on";
  }
  return "Reconnect adapters manually or reboot.";
}
