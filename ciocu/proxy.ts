import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Serve the marketing experience at the get.ciocu.app subdomain while keeping ciocu.app as the app. */
export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (hostname === "get.ciocu.app" && !request.nextUrl.pathname.startsWith("/get")) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname === "/" ? "/get" : `/get${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
