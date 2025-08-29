// src/app/api/voice/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

/**
 * Uses your existing OPENAI_API_KEY from .env.local
 * Optional: OPENAI_TTS_MODEL (defaults to "gpt-4o-mini-tts")
 */
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

/** Supported output formats and their MIME types (typed + readonly) */
const MIME = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
} as const;
type Format = keyof typeof MIME;

/** Voices known to work well with gpt-4o-mini-tts */
const SUPPORTED_VOICES = new Set([
  "verse", // bedtime default
  "alloy",
  "amber",
  "opal",
  "coral",
  "sage",
]);

/** Light sanitizer: remove emojis (some TTS engines sound cleaner) */
function stripEmojis(s: string) {
  return s.replace(
    /([\u2700-\u27BF]|\uFE0F|[\u2600-\u26FF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g,
    ""
  );
}

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

/** Optional health check */
export async function GET() {
  return NextResponse.json({ ok: true, model: TTS_MODEL });
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return bad("Missing OPENAI_API_KEY on server", 500);
    }

    const body = await req.json().catch(() => ({}));
    const textRaw = (body?.text ?? "").toString();
    const requested = (body?.voice ?? "verse").toString().toLowerCase();
    const voice = SUPPORTED_VOICES.has(requested) ? requested : "verse"; // graceful fallback
    const formatInput = (body?.format ?? "mp3").toString().toLowerCase();

    if (!textRaw.trim()) return bad("Missing text");

    // Validate/lock format
    if (!(formatInput in MIME)) return bad(`Unsupported format '${formatInput}'`);
    const format = formatInput as Format;
    const contentType = MIME[format];

    // Sanitize + guard length
    const text = (body?.stripEmojis === false ? textRaw : stripEmojis(textRaw)).trim();
    if (text.length > 4000) return bad("Text too long (max ~4000 chars)");

    // Call OpenAI TTS (streaming response passthrough)
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL, // e.g., "gpt-4o-mini-tts"
        voice,            // "verse" (default) or another supported voice
        input: text,
        format,           // "mp3" | "wav" | "ogg" | "aac" | "flac"
      }),
    });

    if (!resp.ok) {
      // Surface a meaningful message back to the client
      let errMsg = `OpenAI TTS error ${resp.status}`;
      try {
        const j = await resp.json();
        errMsg = j?.error?.message || JSON.stringify(j);
      } catch {
        const t = await resp.text().catch(() => "");
        if (t) errMsg = t;
      }
      return bad(errMsg, 502);
    }

    const stream = resp.body;
    if (!stream) return bad("Upstream returned no audio body", 502);

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("[/api/voice] error:", err);
    return bad(err?.message || "Unknown server error", 500);
  }
}
