import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

function isPublicPath(pathname: string) {
  if (pathname === "/" || pathname === "/login" || pathname === "/logout") return true;
  if (pathname.startsWith("/auth")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  const pathname = request.nextUrl.pathname;

  const session = await auth0.getSession(request);

  if (session && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isPublicPath(pathname)) return authRes;

  if (!session) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return authRes;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
