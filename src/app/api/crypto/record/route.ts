// src/app/api/crypto/record/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // For now we just log; later we can verify on-chain and mark the user in DB.
  const body = await req.json().catch(() => ({}));
  console.log("Crypto payment record:", body);
  return NextResponse.json({ ok: true });
}
