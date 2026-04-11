import { jwtVerify } from "jose";

function encoderSecret(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s.length < 16) {
      return new Uint8Array(0);
    }
    return new TextEncoder().encode(s);
  }
  return new TextEncoder().encode(s && s.length >= 16 ? s : "killnode-dev-secret-min-16");
}

export async function verifyAdminJwt(token: string): Promise<boolean> {
  const secret = encoderSecret();
  if (secret.length === 0) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}
