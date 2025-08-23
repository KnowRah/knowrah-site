// src/app/api/knowrah/route.ts
export const runtime = "edge"; // fast, cold-start friendly

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

    const body = (await req.json()) as { messages: { role: "user" | "knowrah"; text: string }[] };
    // Map widget messages -> OpenAI format
    const chat: ChatMessage[] = [
      { role: "system", content: personaPrompt() },
      ...body.messages.map((m) =>
        m.role === "knowrah"
          ? ({ role: "assistant", content: m.text } as ChatMessage)
          : ({ role: "user", content: m.text } as ChatMessage)
      ),
    ];

    // Call OpenAI Chat Completions (simple, reliable)
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // good + economical; change if you prefer
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

    const data = await res.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I’m here, but something felt quiet in the ether. Try again? 🌒";

    return new Response(JSON.stringify({ reply: text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
