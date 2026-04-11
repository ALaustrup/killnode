import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";

export async function requireAdminCookie() {
  const jar = await cookies();
  const t = jar.get("kn_session")?.value;
  if (!t) return false;
  return verifySessionToken(t);
}
