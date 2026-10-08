import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const authed = isValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!authed && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (authed && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except static assets (the PWA shell files stay public) and the
  // cron route, which checks its own secret.
  matcher: ["/((?!api/cron/|_next/static|_next/image|icons/|manifest.json|sw.js|icon.png|apple-icon.png|favicon.ico).*)"],
};
