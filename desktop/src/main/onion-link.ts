import crypto from "crypto";

const BASE32 = "abcdefghijklmnopqrstuvw234567";

/** Simulated v3-style onion label for UI/demo. Real .onion services require Tor hidden service setup. */
export function generateSimulatedOnion(): string {
  const buf = crypto.randomBytes(32);
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31];
  }
  const host = out.slice(0, 56);
  return `http://${host}.onion`;
}
