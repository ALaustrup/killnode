import { engageKillswitch } from "./network-killswitch";
import { destroyTorrentEngine } from "./torrent-service";
import { stopLocalProxyStack } from "./proxy-controller";
import { stopObfuscationBridge } from "./obfuscation-bridge";
import { stopTor } from "./tor-manager";
import { killAllManagedChildren, runShutdownHooks } from "./process-registry";

/**
 * Neural Killswitch (ordered):
 * 1) Stop torrent engine (+ telemetry)
 * 2) Kill local HTTP/SOCKS mesh (proxy-chain + ingress gateway) and clear Electron session proxy
 * 3) Terminate obfuscation children (SS / V2Ray)
 * 4) Stop Tor and reap any remaining managed child processes
 * 5) Sever host network interfaces (OS-specific)
 */
export async function executeFullKillswitch(): Promise<{ ok: boolean; message: string }> {
  await destroyTorrentEngine();
  await stopLocalProxyStack();
  stopObfuscationBridge();
  stopTor();
  killAllManagedChildren();
  await runShutdownHooks();
  return engageKillswitch();
}
