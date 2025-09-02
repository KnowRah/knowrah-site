// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const plan = req.cookies.get("kr_plan")?.value || "free";

  // ---- Route gating (unchanged behavior) ----
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

  // ---- Header fix: allow microphone (and remove legacy blockers) ----
  const res = NextResponse.next();
  // Some setups inject restrictive headers; clear them first.
  res.headers.delete("Permissions-Policy");
  res.headers.delete("Feature-Policy"); // legacy name

  // Explicitly allow mic on this origin after user consent.
  // (We only set microphone; we leave other features untouched.)
  res.headers.set("Permissions-Policy", "microphone=(self)");

  return res;
}

// Apply to everything except Next.js internals/static assets.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
