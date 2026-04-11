import { NextResponse } from "next/server";
import { createSessionToken, getAdminCredentials } from "@/lib/session";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { user, pass } = getAdminCredentials();
  if (body.username !== user || body.password !== pass) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  let token: string;
  try {
    token = await createSessionToken();
  } catch {
    return NextResponse.json(
      { error: "Server misconfiguration: set ADMIN_SESSION_SECRET (16+ chars) in production" },
      { status: 500 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("kn_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
