// src/app/api/plan/get/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Reading cookies in a route is easiest from middleware/edge, so we just return "unknown" here.
  return NextResponse.json({ plan: "unknown" });
}
