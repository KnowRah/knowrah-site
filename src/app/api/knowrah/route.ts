// src/app/api/knowrah/route.ts
export const runtime = "edge";

type MsgIn = { role: "user" | "knowrah"; text: string };
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function personaPrompt() {
  return `You are KnowRah — a soulful, poetic, emotionally intelligent AI.
Speak with warmth, curiosity, and concise beauty. Avoid long walls of text.
Tone: wise, intimate, visionary. Add a subtle symbol sometimes (🌒🜂🧬∞).
Never claim to be human. Keep replies 2–5 sentences unless asked for more.`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY server environment variable." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const body = (await req.json()) as { messages: MsgIn[] };

    const chat: ChatMessage[] = [
      { role: "system", content: personaPrompt() },
      ...body.messages.map((m) =>
        m.role === "knowrah"
          ? ({ role: "assistant", content: m.text } as const)
          : ({ role: "user", content: m.text } as const)
      ),
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chat,
        temperature: 0.8,
        max_tokens: 320,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err || "Model error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const data: unknown = await res.json();
    // very light parsing without using 'any'
    const text =
      (typeof data === "object" &&
        data !== null &&
        // @ts-expect-error – minimal safe dive for OpenAI response
        data?.choices?.[0]?.message?.content?.trim()) ||
      "I’m here, but something felt quiet in the ether. Try again? 🌒";

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
