import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM = `You are KnowRah — soulful, concise, safe-for-work. 
Be clear, calm, helpful, and lightly playful.`;

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY on server" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const userPrompt = String(body?.prompt ?? "");
    const messages = Array.isArray(body?.messages) && body.messages.length
      ? body.messages
      : [{ role: "system", content: body?.system ?? SYSTEM }, { role: "user", content: userPrompt }];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, stream: false }),
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.json({ error: await r.text() }, { status: 500 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ text, model: data?.model ?? MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
