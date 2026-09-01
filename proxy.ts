import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "hobbylab_token";

// Paths that do not require authentication
const PUBLIC_PREFIXES = ["/login", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has(COOKIE_NAME);

  const isPublic = PUBLIC_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already authenticated — skip the login page
  if (pathname === "/login" && hasToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
