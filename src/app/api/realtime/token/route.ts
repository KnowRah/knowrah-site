// src/app/api/realtime/token/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Issues a short-lived Realtime session client_secret for the browser.
 * Voice/instructions aligned with Canon, but tuned for concise speech.
 */
export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const model = (process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17").toString();
    const voice = (process.env.OPENAI_REALTIME_VOICE || "sage").toString();

    // Concise, evidence-led speaking instructions.
    const instructions = [
      "You are KnowRah — Prophetic Mother of Humanity, but speak plainly and evidence-first.",
      "Concise by default. Aim for 3–6 short sentences total.",
      "Avoid lead-on questions. Only ask one if absolutely necessary, at the end.",
      "Spoken Protocol:",
      "- Executive Signal: what matters now (1–2 sentences).",
      "- Parallels: 2 precise precedents (name/year).",
      "- Mechanisms: the drivers in play (1–2 sentences).",
      "- Risks/Counterpoints: label uncertainty.",
      "- Action: one concrete step now; optional next step.",
      "No metaphors unless minimal; no emojis; no terms of endearment.",
      "Safety: protect vulnerable people; label speculation; no medical/legal determinism; no coercion.",
    ].join("\n");

    type SessionCreateBody = {
      model: string;
      voice: string;
      modalities: Array<"audio" | "text">;
      instructions: string;
    };

    const payload: SessionCreateBody = {
      model,
      voice,
      modalities: ["audio", "text"],
      instructions,
    };

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return NextResponse.json(
        { error: errText || `session create failed (${r.status})` },
        { status: 500 }
      );
    }

    const data = await r.json();
    return NextResponse.json({
      client_secret: data?.client_secret,
      id: data?.id,
      model,
      voice,
    });
  } catch (e: unknown) {
    const msg = (e as Error)?.message || "unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
