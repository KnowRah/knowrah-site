// src/app/api/plan/set/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ok = new Set(["personal", "family", "business"]);

export async function POST(req: Request) {
  const { plan, code } = (await req.json().catch(() => ({}))) as {
    plan?: string;
    code?: string;
  };

  if (!plan || !ok.has(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const expected = process.env.ADMIN_ACCESS_CODE || "";
  if (!expected || code !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, plan });
  res.cookies.set("kr_plan", plan, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
