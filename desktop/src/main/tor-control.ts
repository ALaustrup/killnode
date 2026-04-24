/**
 * Tor control-port client.
 * Authenticates via cookie file, sends a single command, returns the response.
 *
 * ControlPort 9051 and CookieAuthentication 1 must already be present in the torrc
 * (tor-manager.ts writes them by default).
 */
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

let _controlPort = 9051;

export function setControlPort(port: number): void {
  _controlPort = port;
}

function cookiePath(): string {
  return path.join(app.getPath("userData"), "tor-data", "control_auth_cookie");
}

/**
 * Opens a one-shot TCP connection, authenticates with the cookie, sends
 * `command`, collects the full response until the terminal `250 OK` line
 * (or an error code), then closes the socket.
 */
async function sendControlCommand(command: string): Promise<string> {
  let cookie: Buffer;
  try {
    cookie = fs.readFileSync(cookiePath());
  } catch {
    throw new Error("Tor control cookie not found — is Tor running?");
  }

  return new Promise<string>((resolve, reject) => {
    const sock = net.createConnection({ host: "127.0.0.1", port: _controlPort });

    let buf = "";
    let authenticated = false;
    let dotBlock = false;
    const responseLines: string[] = [];

    sock.setTimeout(5000, () => {
      sock.destroy();
      reject(new Error("Tor control port timed out"));
    });

    sock.on("error", (err) => {
      reject(err);
    });

    sock.on("connect", () => {
      sock.write(`AUTHENTICATE ${cookie.toString("hex")}\r\n`);
    });

    sock.on("data", (data: Buffer) => {
      buf += data.toString("utf8");

      // Process complete lines only
      let idx: number;
      while ((idx = buf.indexOf("\r\n")) !== -1) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);

        if (!authenticated) {
          if (line.startsWith("250")) {
            authenticated = true;
            sock.write(`${command}\r\n`);
          } else {
            sock.destroy();
            reject(new Error(`Tor auth failed: ${line}`));
          }
          continue;
        }

        // Inside a dot-encoded block (250+key=\r\n ... \r\n.\r\n)
        if (dotBlock) {
          if (line === ".") {
            dotBlock = false;
          } else {
            responseLines.push(line);
          }
          continue;
        }

        // Start of a dot-encoded block
        if (line.startsWith("250+")) {
          dotBlock = true;
          responseLines.push(line);
          continue;
        }

        responseLines.push(line);

        // Terminal success line
        if (line.startsWith("250 ")) {
          sock.destroy();
          resolve(responseLines.join("\n"));
          return;
        }

        // Error codes 4xx / 5xx
        if (/^[45]\d\d/.test(line)) {
          sock.destroy();
          reject(new Error(`Tor control error: ${line}`));
          return;
        }
      }
    });
  });
}

/** Send SIGNAL NEWNYM — requests a fresh set of Tor circuits. */
export async function torNewIdentity(): Promise<{ ok: boolean; message: string }> {
  try {
    await sendControlCommand("SIGNAL NEWNYM");
    return { ok: true, message: "New identity requested — circuits rotating." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Returns bootstrap progress as 0–100.
 * 0 is returned on any error (e.g. Tor not yet started).
 */
export async function torBootstrapProgress(): Promise<number> {
  try {
    const res = await sendControlCommand("GETINFO status/bootstrap-phase");
    const m = res.match(/PROGRESS=(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Returns the number of BUILT circuits.
 * 0 is returned on any error.
 */
export async function torCircuitCount(): Promise<number> {
  try {
    const res = await sendControlCommand("GETINFO circuit-status");
    // Each BUILT circuit entry is a plain data line (inside the dot-block or 250- lines)
    return res.split("\n").filter((l) => /^\d+\s+BUILT/.test(l)).length;
  } catch {
    return 0;
  }
}
