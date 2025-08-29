export const runtime = "nodejs";
// src/app/api/avatar/route.ts
import { NextResponse } from "next/server";

// CONFIG: set your provider API key in .env.local
// DID_API_KEY="sk_..."  (replace with your real key)

export async function POST(req: Request) {
  try {
    const { text, image } = (await req.json()) as { text: string; image?: string };
    if (!process.env.DID_API_KEY) {
      return NextResponse.json({ error: "No DID_API_KEY configured" }, { status: 500 });
    }
    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Build absolute URL for the portrait served from /public
    const origin = req.headers.get("origin") || process.env.PUBLIC_BASE_URL || "";
    const source_url = image?.startsWith("http") ? image : `${origin}${image ?? "/knowrah-avatar.png"}`;

    // 1) Create a talk (POST) — body shape follows common “text + image” flows
    const createRes = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // D-ID style auth header (adjust if your provider differs):
        Authorization: `Basic ${Buffer.from(process.env.DID_API_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        source_url,
        script: { type: "text", input: text },
        // OPTIONAL: tweak settings; many providers support similar fields:
        // driver_url, stitch, background, align, etc.
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => "");
      return NextResponse.json({ error: `Create failed: ${err}` }, { status: 502 });
    }
    const created = await createRes.json();
    const id = created?.id;
    if (!id) {
      return NextResponse.json({ error: "No talk id returned" }, { status: 502 });
    }

    // 2) Poll until ready
    let url: string | null = null;
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      await new Promise((r) => setTimeout(r, 1500));
      const getRes = await fetch(`https://api.d-id.com/talks/${id}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.DID_API_KEY + ":").toString("base64")}`,
        },
      });
      if (!getRes.ok) continue;
      const j = await getRes.json();
      if (j?.result_url) {
        url = j.result_url as string;
        break;
      }
      if (j?.status && j.status === "error") {
        return NextResponse.json({ error: j?.error || "Avatar provider error" }, { status: 502 });
      }
    }

    if (!url) {
      return NextResponse.json({ error: "Timed out waiting for avatar video" }, { status: 504 });
    }

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Avatar route error" }, { status: 500 });
  }
}
