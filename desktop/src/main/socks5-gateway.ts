import net from "node:net";
import { SocksClient } from "socks";

const TOR_HOST = "127.0.0.1";

function relay(a: net.Socket, b: net.Socket) {
  a.pipe(b);
  b.pipe(a);
}

/**
 * Minimal SOCKS5 (no auth) gateway: clients connect here, egress is forwarded via Tor SOCKS5.
 */
export function startSocks5Gateway(torSocksPort: number, listenPort: number): net.Server {
  const server = net.createServer((socket) => {
    const chunks: Buffer[] = [];
    let handshakeDone = false;

    const onData = (data: Buffer) => {
      if (!handshakeDone) {
        chunks.push(data);
        const buf = Buffer.concat(chunks);
        if (buf.length < 2) return;
        if (buf[0] !== 0x05) {
          socket.destroy();
          return;
        }
        const nmethods = buf[1];
        if (buf.length < 2 + nmethods) return;
        handshakeDone = true;
        socket.write(Buffer.from([0x05, 0x00]));
        socket.removeListener("data", onData);
        socket.on("data", onRequest);
        const rest = buf.subarray(2 + nmethods);
        if (rest.length) onRequest(rest);
        return;
      }
    };

    const onRequest = async (data: Buffer) => {
      socket.removeListener("data", onRequest);
      try {
        if (data.length < 4 || data[0] !== 0x05) {
          socket.destroy();
          return;
        }
        const cmd = data[1];
        if (cmd !== 0x01) {
          socket.write(Buffer.from([0x05, 0x07, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          socket.end();
          return;
        }
        const atyp = data[3];
        let offset = 4;
        let host = "";
        if (atyp === 0x01) {
          if (data.length < offset + 4 + 2) return;
          host = `${data[offset]}.${data[offset + 1]}.${data[offset + 2]}.${data[offset + 3]}`;
          offset += 4;
        } else if (atyp === 0x03) {
          const len = data[offset];
          offset += 1;
          if (data.length < offset + len + 2) return;
          host = data.subarray(offset, offset + len).toString("utf8");
          offset += len;
        } else if (atyp === 0x04) {
          socket.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
          socket.end();
          return;
        } else {
          socket.destroy();
          return;
        }
        const port = data.readUInt16BE(offset);
        const { socket: remote } = await SocksClient.createConnection({
          command: "connect",
          proxy: { host: TOR_HOST, port: torSocksPort, type: 5 },
          destination: { host, port },
        });
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        relay(socket, remote);
      } catch {
        try {
          socket.write(Buffer.from([0x05, 0x05, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
        } catch {
          /* ignore */
        }
        socket.destroy();
      }
    };

    socket.on("data", onData);
    socket.on("error", () => socket.destroy());
  });

  server.listen(listenPort);
  return server;
}

export function stopSocks5Gateway(server: net.Server | null): void {
  if (!server) return;
  try {
    server.close();
  } catch {
    /* ignore */
  }
}
