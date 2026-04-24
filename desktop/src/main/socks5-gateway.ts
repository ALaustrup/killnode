import net from "node:net";
import { SocksClient } from "socks";

const TOR_HOST = "127.0.0.1";

function relay(a: net.Socket, b: net.Socket): void {
  a.pipe(b);
  b.pipe(a);
  a.on("error", () => b.destroy());
  b.on("error", () => a.destroy());
}

function socks5Reply(rep: number): Buffer {
  // VER REP RSV ATYP BND.ADDR(4 bytes IPv4 zero) BND.PORT(2 bytes zero)
  return Buffer.from([0x05, rep, 0x00, 0x01, 0, 0, 0, 0, 0, 0]);
}

/**
 * Hardened SOCKS5 (no-auth) gateway.
 * - Buffers data properly so split packets are handled correctly.
 * - Supports IPv4 (0x01), hostname (0x03), and IPv6 (0x04).
 * - Returns proper SOCKS5 error codes on failure.
 * - Egress is forwarded through the Tor SOCKS5 proxy.
 */
export function startSocks5Gateway(torSocksPort: number, listenPort: number): net.Server {
  const server = net.createServer((socket) => {
    socket.on("error", () => socket.destroy());

    // ── Phase 1: greeting (VER NMETHODS METHODS…) ──────────────────────────
    const greetBuf: Buffer[] = [];
    let greetDone = false;

    const onGreet = (data: Buffer) => {
      greetBuf.push(data);
      const buf = Buffer.concat(greetBuf);
      if (buf.length < 2) return;
      if (buf[0] !== 0x05) {
        socket.destroy();
        return;
      }
      const nmethods = buf[1];
      if (buf.length < 2 + nmethods) return;

      greetDone = true;
      socket.removeListener("data", onGreet);

      // Accept no-auth (0x00), regardless of what methods the client offered
      socket.write(Buffer.from([0x05, 0x00]));

      // Any leftover bytes after the greeting belong to the request
      const rest = buf.subarray(2 + nmethods);
      if (rest.length) onRequest(rest);
      else socket.once("data", onRequest);
    };

    // ── Phase 2: request (VER CMD RSV ATYP ADDR PORT) ──────────────────────
    const reqBuf: Buffer[] = [];

    const onRequest = async (data: Buffer) => {
      reqBuf.push(data);
      const buf = Buffer.concat(reqBuf);

      if (buf.length < 4) {
        // Need more data; re-attach listener for the remainder
        socket.once("data", onRequest);
        return;
      }

      if (buf[0] !== 0x05) {
        socket.destroy();
        return;
      }

      const cmd = buf[1];
      if (cmd !== 0x01 /* CONNECT */) {
        socket.write(socks5Reply(0x07 /* Command not supported */));
        socket.end();
        return;
      }

      const atyp = buf[3];
      let offset = 4;
      let host = "";

      if (atyp === 0x01 /* IPv4 */) {
        if (buf.length < offset + 4 + 2) {
          socket.once("data", onRequest);
          return;
        }
        host = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
        offset += 4;
      } else if (atyp === 0x03 /* DOMAINNAME */) {
        if (buf.length < offset + 1) {
          socket.once("data", onRequest);
          return;
        }
        const len = buf[offset];
        offset += 1;
        if (buf.length < offset + len + 2) {
          socket.once("data", onRequest);
          return;
        }
        host = buf.subarray(offset, offset + len).toString("utf8");
        offset += len;
      } else if (atyp === 0x04 /* IPv6 */) {
        if (buf.length < offset + 16 + 2) {
          socket.once("data", onRequest);
          return;
        }
        const parts: string[] = [];
        for (let i = 0; i < 16; i += 2) {
          parts.push(buf.readUInt16BE(offset + i).toString(16));
        }
        host = parts.join(":");
        offset += 16;
      } else {
        socket.write(socks5Reply(0x08 /* Address type not supported */));
        socket.end();
        return;
      }

      if (buf.length < offset + 2) {
        socket.once("data", onRequest);
        return;
      }

      const port = buf.readUInt16BE(offset);

      try {
        const { socket: remote } = await SocksClient.createConnection({
          command: "connect",
          proxy: { host: TOR_HOST, port: torSocksPort, type: 5 },
          destination: { host, port },
        });
        socket.write(socks5Reply(0x00 /* success */));
        relay(socket, remote);
      } catch {
        try {
          socket.write(socks5Reply(0x05 /* Connection refused */));
        } catch {
          /* socket may already be gone */
        }
        socket.destroy();
      }
    };

    if (!greetDone) {
      socket.on("data", onGreet);
    }
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
