import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "hobbylab_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const credential: string | undefined = body?.credential;

  if (!credential) {
    return NextResponse.json({ message: "Missing credential" }, { status: 400 });
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { message: "Server misconfiguration" },
      { status: 500 }
    );
  }

  // Exchange the Google ID token for a HobbyLab JWT
  const authRes = await fetch(`${apiUrl}/auth/google-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: credential }),
    cache: "no-store",
  });

  if (!authRes.ok) {
    return NextResponse.json(
      { message: "Google authentication failed" },
      { status: authRes.status }
    );
  }

  const authData = await authRes.json().catch(() => null);
  const accessToken: string | undefined = authData?.access_token;

  if (!accessToken) {
    return NextResponse.json(
      { message: "Invalid response from auth server" },
      { status: 500 }
    );
  }

  // Verify the user is a system admin before granting an admin session
  const meRes = await fetch(`${apiUrl}/admin/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (meRes.status === 403) {
    return NextResponse.json(
      { message: "You do not have administrator access." },
      { status: 403 }
    );
  }

  if (!meRes.ok) {
    return NextResponse.json(
      { message: "Could not verify admin status" },
      { status: meRes.status }
    );
  }

  // Admin confirmed — set a secure httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
