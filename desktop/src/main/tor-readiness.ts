import net from "node:net";

/**
 * Confirms Tor's SOCKS port accepts a TCP connection (daemon listening).
 * This is not a full circuit build check but prevents routing app traffic before Tor binds.
 */
export function waitForSocksPortOpen(port: number, timeoutMs = 20000): Promise<void> {
  const host = "127.0.0.1";
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Tor SOCKS not reachable on ${host}:${port} within ${timeoutMs}ms`));
        return;
      }
      const socket = net.connect({ port, host }, () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}
