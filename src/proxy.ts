import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { canAccess, ROLE_HOME, asRole } from "@/lib/auth/roles";

// Next 16 renamed the "middleware" convention to "proxy".
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based page gating. API permission checks live in the route handlers.
  if (!pathname.startsWith("/api")) {
    if (pathname === "/" || !canAccess(session.role, pathname)) {
      const home = ROLE_HOME[asRole(session.role)];
      if (home !== pathname) {
        const url = req.nextUrl.clone();
        url.pathname = home;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};
