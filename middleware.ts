// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALLOW = "microphone=(self), camera=(self), geolocation=(self)";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const plan = req.cookies.get("kr_plan")?.value || "free";

  // Route gating (unchanged)
  if (pathname.startsWith("/app/tutor")) {
    if (!["family", "business"].includes(plan)) {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("need", "family");
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/app/business")) {
    if (plan !== "business") {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("need", "business");
      return NextResponse.redirect(url);
    }
  }

  // Align permissions policy
  const res = NextResponse.next();
  res.headers.delete("Permissions-Policy");
  res.headers.delete("Feature-Policy"); // legacy alias
  res.headers.set("Permissions-Policy", ALLOW);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
