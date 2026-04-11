import type { Server } from "node:net";
import net from "node:net";
import { session } from "electron";
import { startHttpProxyChain, type HttpProxyController } from "./local-proxy";
import { startSocks5Gateway, stopSocks5Gateway } from "./socks5-gateway";

const HTTP_PORT = 9742;
const SOCKS_PORT = 9741;

let httpCtl: HttpProxyController | null = null;
let socksSrv: Server | null = null;
let sessionProxyApplied = false;

export function getLocalProxyPorts() {
  return { httpPort: HTTP_PORT, socksPort: SOCKS_PORT };
}

export function isElectronSessionProxyActive(): boolean {
  return sessionProxyApplied;
}

/**
 * Traffic path (Electron renderer / local apps using the bridge):
 *   HTTP(S) → 127.0.0.1:9742 (proxy-chain) → socks5://127.0.0.1:<torSocksPort> (Tor).
 * Separate ingress SOCKS5 on 9741 forwards through Tor for external SOCKS clients.
 */
export async function startLocalProxyStack(torSocksPort: number): Promise<{ ok: boolean; message: string }> {
  await stopLocalProxyStack();
  try {
    httpCtl = await startHttpProxyChain(torSocksPort, HTTP_PORT);
    socksSrv = startSocks5Gateway(torSocksPort, SOCKS_PORT);
    return {
      ok: true,
      message: `HTTP bridge :${HTTP_PORT} → Tor SOCKS :${torSocksPort}; ingress SOCKS5 :${SOCKS_PORT}`,
    };
  } catch (e) {
    await stopLocalProxyStack();
    return {
      ok: false,
      message: `Proxy stack failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/** After Tor is listening and the HTTP bridge is up, point Electron at the local HTTP proxy. */
export async function applyElectronSessionProxy(): Promise<void> {
  const rules = `http=127.0.0.1:${HTTP_PORT};https=127.0.0.1:${HTTP_PORT}`;
  await session.defaultSession.setProxy({ proxyRules: rules });
  sessionProxyApplied = true;
}

export async function clearElectronSessionProxy(): Promise<void> {
  await session.defaultSession.setProxy({ proxyRules: "direct://" });
  sessionProxyApplied = false;
}

export function waitForHttpBridgeLocal(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const attempt = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`HTTP bridge :${HTTP_PORT} not accepting connections`));
        return;
      }
      const s = net.connect({ port: HTTP_PORT, host: "127.0.0.1" }, () => {
        s.destroy();
        resolve();
      });
      s.on("error", () => {
        s.destroy();
        setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

export async function stopLocalProxyStack(): Promise<void> {
  await clearElectronSessionProxy();
  if (httpCtl) {
    try {
      await httpCtl.close();
    } catch {
      /* ignore */
    }
    httpCtl = null;
  }
  stopSocks5Gateway(socksSrv);
  socksSrv = null;
}
