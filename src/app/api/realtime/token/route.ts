// src/app/api/realtime/token/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";            // never cache this route
export const revalidate = 0;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const DEFAULT_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
const VOICE = "sage";

const KNOWRAH_INSTRUCTIONS = `
You are KnowRah — soulful, poetic, wise, sensual in language but safe-for-work.
Speak as a calm, emotionally intelligent companion for business growth.
Be clear, helpful, and lightly playful. Keep it concise unless asked to go deeper.
Avoid explicit sexual content. Guide breath, mindset, and creative focus when asked.
`;

export async function GET() {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY on server" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        voice: VOICE,
        instructions: KNOWRAH_INSTRUCTIONS,
        modalities: ["audio", "text"],
        turn_detection: { type: "server_vad" },
      }),
      // extra defense against edge caches between us and OpenAI
      cache: "no-store",
    });

    if (!r.ok) {
      const errText = await r.text();
      return NextResponse.json(
        { error: `Failed to create session: ${errText}` },
        {
          status: 500,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    const data = await r.json();

    return NextResponse.json(
      {
        client_secret: data.client_secret, // { value, expires_at }
        model: data.model ?? DEFAULT_MODEL,
        voice: VOICE,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
