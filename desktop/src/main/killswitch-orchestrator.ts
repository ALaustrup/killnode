import { engageKillswitch } from "./network-killswitch";
import { stopLocalProxyStack } from "./proxy-controller";
import { stopTor } from "./tor-manager";
import { killAllManagedChildren, runShutdownHooks } from "./process-registry";

/**
 * Neural Killswitch (ordered):
 * 1) Kill local HTTP/SOCKS proxy mesh and clear Electron session proxy
 * 2) Stop Tor and reap any remaining managed child processes
 * 3) Sever host network interfaces (OS-specific, requires elevation)
 */
export async function executeFullKillswitch(): Promise<{ ok: boolean; message: string }> {
  await stopLocalProxyStack();
  stopTor();
  killAllManagedChildren();
  await runShutdownHooks();
  return engageKillswitch();
}
