// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const plan = req.cookies.get("kr_plan")?.value || "free";

  // Gate /app/tutor → Family or Business
  if (pathname.startsWith("/app/tutor")) {
    if (!["family", "business"].includes(plan)) {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("need", "family");
      return NextResponse.redirect(url);
    }
  }

  // Gate /app/business → Business only
  if (pathname.startsWith("/app/business")) {
    if (plan !== "business") {
      const url = req.nextUrl.clone();
      url.pathname = "/pricing";
      url.searchParams.set("need", "business");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/tutor/:path*", "/app/business/:path*"],
};
