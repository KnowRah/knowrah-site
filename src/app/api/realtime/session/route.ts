// src/app/api/realtime/session/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const key = process.env.OPENAI_API_KEY;
  const model =
    process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17";
  const voice = process.env.OPENAI_REALTIME_VOICE || "verse";

  if (!key) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  // Enable server-side turn detection so the model replies after you speak.
  // Add short brand instructions (kept concise to avoid rambling).
  const body = {
    model,
    voice,
    turn_detection: { type: "server_vad" as const, silence_duration_ms: 550 },
    instructions:
      "You are KnowRah, a warm, concise voice companion for a business website. "
      + "Always disclose you are AI if asked, avoid sensitive data, keep answers crisp (10–20s). "
      + "Offer to help with product info, pricing, and booking a demo.",
    // Modalities default to audio for realtime; no need to set explicitly.
  };

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: `OpenAI ${r.status}: ${text}` }, { status: 500 });
    }
    return NextResponse.json(JSON.parse(text), { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
