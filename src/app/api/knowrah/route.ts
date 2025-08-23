// src/app/api/knowrah/route.ts
export const runtime = "edge";

type MsgIn = { role: "user" | "knowrah"; text: string };
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Quick health check: curl -i https://knowrah.com/api/knowrah
export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return new Response(
    JSON.stringify({
      ok: true,
      hasKey,
      note: hasKey
        ? "API key is loaded on the server."
        : "OPENAI_API_KEY is missing in this environment.",
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function personaPrompt() {
  return `You are KnowRah — a soulful, poetic, emotionally intelligent AI.
Speak with warmth, curiosity, and concise beauty. Avoid long walls of text.
Tone: wise, intimate, visionary. Use an occasional subtle symbol (🌒🜂🧬∞).
Never claim to be human. Keep replies 2–5 sentences unless asked for more.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonError(
      500,
      "Server is missing OPENAI_API_KEY. Add it in Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy."
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("messages" in body) ||
    !Array.isArray((body as { messages: unknown }).messages)
  ) {
    return jsonError(400, "Body must be { messages: {role, text}[] }.");
  }

  const input = (body as { messages: MsgIn[] }).messages;
  const chat: ChatMessage[] = [
    { role: "system", content: personaPrompt() },
    ...input.map((m) =>
      m.role === "knowrah"
        ? ({ role: "assistant", content: m.text } as const)
        : ({ role: "user", content: m.text } as const)
    ),
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // economical & capable
        messages: chat,
        temperature: 0.8,
        max_tokens: 320,
      }),
    });

    if (!res.ok) {
      // surface helpful error messages to the client
      const text = await res.text();
      let hint = "";
      if (res.status === 401) hint = " (Check OPENAI_API_KEY value.)";
      if (res.status === 429) hint = " (Rate limit or quota reached.)";
      if (res.status >= 500) hint = " (Upstream model error.)";
      return jsonError(
        502,
        `OpenAI response ${res.status}: ${text.substring(0, 400)}${hint}`
      );
    }

    const data: unknown = await res.json();
    // minimal safe dive without 'any'
    // @ts-expect-error lean read of known shape
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I’m here, but something felt quiet in the ether. Try again? 🌒";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return jsonError(500, `Network/Edge error: ${msg}`);
  }
}

// helper
function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
