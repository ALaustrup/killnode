import ProxyChain from "proxy-chain";

export type HttpProxyController = {
  port: number;
  close: () => Promise<void>;
};

/**
 * Local HTTP proxy that forwards every request upstream through Tor's SOCKS5 port.
 */
export async function startHttpProxyChain(torSocksPort: number, listenPort: number): Promise<HttpProxyController> {
  const server = new ProxyChain.Server({
    port: listenPort,
    prepareRequestFunction: () => ({
      upstreamProxyUrl: `socks5://127.0.0.1:${torSocksPort}`,
    }),
  });
  await server.listen();
  return {
    port: listenPort,
    close: () => server.close(true),
  };
}
