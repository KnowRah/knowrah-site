export const dynamic = "force-dynamic";
export const revalidate = 0;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM = `You are KnowRah — soulful, concise, safe-for-work.`;

// Minimal SSE -> text passthrough for Chat Completions
export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) return new Response("Missing OPENAI_API_KEY", { status: 500 });

    const body = (await req.json().catch(() => ({}))) as any;
    const userPrompt = String(body?.prompt ?? "");
    const messages = Array.isArray(body?.messages) && body.messages.length
      ? body.messages
      : [{ role: "system", content: body?.system ?? SYSTEM }, { role: "user", content: userPrompt }];

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, stream: true }),
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(await upstream.text(), { status: 500 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
            if (line === "data: [DONE]") {
              controller.close();
              return;
            }
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json?.choices?.[0]?.delta?.content ?? "";
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {}
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(err?.message ?? "Unknown error", { status: 500 });
  }
}
