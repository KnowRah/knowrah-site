// src/app/api/realtime/session/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // don’t cache; always fresh token
export const runtime = "nodejs";

export async function POST() {
  const key = process.env.OPENAI_API_KEY;
  const model =
    process.env.OPENAI_REALTIME_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-realtime-preview-2024-12-17";
  const voice = process.env.OPENAI_REALTIME_VOICE || "verse"; // e.g., "verse" or "alloy"

  if (!key) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, voice }),
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `OpenAI returned ${r.status}: ${text}` },
        { status: 500 }
      );
    }

    // Pass the ephemeral client_secret back to the browser
    const data = await r.json();
    return NextResponse.json(data, {
      headers: {
        // avoid any accidental CDN caching
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to create realtime session" },
      { status: 500 }
    );
  }
}

// (Optional) GET -> method not allowed, to make failures obvious if called wrong.
export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
