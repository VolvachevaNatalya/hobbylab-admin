import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/constants";

async function logout(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.redirect(new URL("/login", request.url));
}

// POST — used by the Sign out form
export { logout as POST };

// GET — used by server-side redirects when admin access is revoked
export { logout as GET };
