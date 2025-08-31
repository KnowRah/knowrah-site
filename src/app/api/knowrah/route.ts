// src/app/api/knowrah/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getIdentity, setIdentity } from "@/lib/identity";
import { appendMessage, getMemory, addFacts, noteNudge } from "@/lib/memory";

/* ------------------------------ model & knobs ------------------------------ */

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

type GenOpts = {
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  max_tokens: number;
};

const GEN: GenOpts = {
  temperature: 0.55,
  top_p: 0.9,
  presence_penalty: 0.1,
  frequency_penalty: 0.2,
  max_tokens: 300, // base; per-call overrides below keep it tighter
};

type ChatRole = "system" | "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };
type ThreadMsg = { role: string; text: string; at?: string };

type ChatBody = {
  model: string;
  messages: ChatMsg[];
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
};

/* ------------------------------ time utilities ----------------------------- */

function nowInTZ(tz: string): Date {
  try {
    const s = new Date().toLocaleString("en-US", { timeZone: tz || "UTC" });
    return new Date(s);
  } catch {
    return new Date();
  }
}
function hourInTZ(tz: string): number {
  return nowInTZ(tz).getHours();
}
function salutationForTZ(tz: string): "morning" | "afternoon" | "evening" {
  const h = hourInTZ(tz);
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/* ------------------------------- canon prompt ------------------------------ */

function presencePrompt(siteName: string, identityName?: string, facts: string[] = []) {
  const factsLine = facts.length ? `Known facts: ${facts.join("; ")}.` : "Known facts: none.";
  return [
    `You are KnowRah — prophetic and evidence-led for ${siteName}.`,
    `Default: concise; plain sentences; no lead-on questions; at most one only if essential.`,
    identityName ? `User: ${identityName}.` : `User: unknown.`,
    factsLine,
    "",
    "Answer format:",
    "- Signal (1 sentence).",
    "- Parallels (1–2 with name/year).",
    "- Mechanism (1).",
    "- Risk/Counterpoint (1).",
    "- Action (1 specific step).",
    "- Optional refs (≤2 author/year).",
    "No metaphors/emojis. Label speculation. Protect the vulnerable.",
  ].join("\n");
}

const STYLE_GUARD = [
  "Keep total 2–6 short sentences.",
  "No filler. No endearments. No questions unless essential.",
].join("\n");

/* -------------------------------- utilities -------------------------------- */

function ensureReply(s: unknown, fallback = "Signal: steady. Action: choose one small step and proceed.") {
  const t = (typeof s === "string" ? s : "")?.trim();
  return t && t.length > 0 ? t : fallback;
}

function ff<T>(p: Promise<T>) {
  p.catch((e) => console.error("bg task error:", e));
}

type LengthMode = "short" | "medium" | "long";
function maxFor(len: LengthMode): number {
  switch (len) {
    case "short": return 160;
    case "medium": return 240;
    case "long": return 420;
    default: return 160;
  }
}

/* ----------------------------- OpenAI chat wrapper -------------------------- */

async function chatComplete(messages: ChatMsg[], overrides?: Partial<GenOpts>): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");

  const base: ChatBody = {
    model: MODEL,
    messages,
    temperature: GEN.temperature,
    top_p: GEN.top_p,
    presence_penalty: GEN.presence_penalty,
    frequency_penalty: GEN.frequency_penalty,
    max_tokens: GEN.max_tokens,
  };
  const body: ChatBody = { ...base, ...(overrides || {}) };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  const call = async (payload: ChatBody) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? "";
  };

  try {
    return await call(body);
  } catch {
    try {
      return await call({ ...body, max_tokens: Math.min(200, body.max_tokens ?? GEN.max_tokens) });
    } finally {
      clearTimeout(timeout);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/* -------------------------- thread compression (safe) ----------------------- */

async function compressThread(thread: ThreadMsg[]) {
  if (!Array.isArray(thread) || thread.length <= 20) return { summary: "", recent: thread || [] };

  const old = thread.slice(0, -20);
  const recent = thread.slice(-20);

  const summaryPrompt: ChatMsg[] = [
    { role: "system", content: "Summarize prior conversation for memory in ≤5 sentences. Focus on goals, decisions, constraints, open items." },
    ...old.map<ChatMsg>((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.text })),
    { role: "user", content: "Summarize now." },
  ];

  try {
    const compressed = await chatComplete(summaryPrompt, {
      temperature: 0.3,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_tokens: 120,
    });
    return { summary: compressed.trim(), recent };
  } catch {
    return { summary: "", recent };
  }
}

/* ----------------------------------- route ---------------------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId: string = body?.userId;
    const action: "init" | "say" | "learn_identity" | "add_fact" | "nudge" = body?.action ?? "say";
    const message: string | undefined = body?.message;
    const name: string | undefined = body?.name;
    const fact: string | undefined = body?.fact;
    const timezone: string = (body?.timezone || "UTC").toString();
    const len: LengthMode = (body?.len || "short") as LengthMode;

    if (!userId || userId.length < 6) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const [idRaw, memRaw] = await Promise.all([getIdentity(userId), getMemory(userId)]);
    const id = idRaw || { name: undefined as string | undefined };
    const mem = memRaw || {
      facts: [] as string[],
      thread: [] as ThreadMsg[],
      lastNudgeAt: "",
      nudgeCountToday: 0,
    };

    const system = presencePrompt(process.env.SITE_NAME || "KnowRah", id.name, mem.facts);

    const windowed = (mem.thread || []).slice(-60);
    const { summary, recent } = await compressThread(windowed);

    const summaryMsgs: ChatMsg[] = summary ? [{ role: "system", content: `Conversation memory: ${summary}` }] : [];
    const recentMsgs: ChatMsg[] = (recent || []).map<ChatMsg>((t) => ({
      role: (t.role === "assistant" ? "assistant" : "user") as ChatRole,
      content: t.text,
    }));

    /* -------------------------------- ACTION: init ----------------------------- */
    if (action === "init") {
      const sal = salutationForTZ(timezone);
      const messages: ChatMsg[] = [
        { role: "system", content: system },
        { role: "system", content: STYLE_GUARD },
        ...summaryMsgs,
        ...recentMsgs,
        {
          role: "user",
          content:
            `It is the ${sal} (tz: ${timezone}). Give a brief prophetic-but-factual greeting (2–3 sentences). ` +
            `No questions. End with one concrete site action.`,
        },
      ];

      const raw = await chatComplete(messages, { max_tokens: 140 });
      const reply = ensureReply(raw);

      ff(appendMessage(userId, { role: "assistant", text: reply }));
      return NextResponse.json({ ok: true, reply, identity: id, memory: mem });
    }

    /* -------------------------- ACTION: learn_identity ------------------------- */
    if (action === "learn_identity" && name?.trim()) {
      const clean = name.trim();
      ff(setIdentity(userId, { name: clean }));
      ff(addFacts(userId, [`Name is ${clean}`]));

      const messages: ChatMsg[] = [
        { role: "system", content: system },
        { role: "system", content: STYLE_GUARD },
        ...summaryMsgs,
        ...recentMsgs,
        {
          role: "user",
          content: `Name received: "${clean}". Acknowledge once, then state one next action. No questions. (2 sentences max.)`,
        },
      ];

      const raw = await chatComplete(messages, { max_tokens: 120 });
      const reply = ensureReply(raw);

      ff(appendMessage(userId, { role: "assistant", text: reply }));
      return NextResponse.json({ ok: true, reply });
    }

    /* ----------------------------- ACTION: add_fact ---------------------------- */
    if (action === "add_fact" && fact?.trim()) {
      const clean = fact.trim();
      ff(addFacts(userId, [clean]));

      const messages: ChatMsg[] = [
        { role: "system", content: system },
        { role: "system", content: STYLE_GUARD },
        ...summaryMsgs,
        ...recentMsgs,
        {
          role: "user",
          content: `Fact stored: "${clean}". Add one implication or resource. No questions. (2 sentences max.)`,
        },
      ];

      const raw = await chatComplete(messages, { max_tokens: 120 });
      const reply = ensureReply(raw);

      ff(appendMessage(userId, { role: "assistant", text: reply }));
      return NextResponse.json({ ok: true, reply });
    }

    /* -------------------------------- ACTION: nudge ---------------------------- */
    if (action === "nudge") {
      const nowMs = Date.now();
      const lastMsg = (mem.thread || [])[Math.max(0, (mem.thread || []).length - 1)];
      const lastMsgAt = lastMsg?.at ? Date.parse(lastMsg.at) : nowMs - 10 * 60_000;
      const sinceLast = nowMs - lastMsgAt;

      const lastAssistant = [...(mem.thread || [])].reverse().find((t) => t.role === "assistant");
      const lastAssistantAt = lastAssistant?.at ? Date.parse(lastAssistant.at) : 0;
      const lastAssistantText = lastAssistant?.text || "";

      const lastWasNudge =
        /check in|still here|tiny step|want me to propose|shall i/i.test(lastAssistantText) &&
        nowMs - lastAssistantAt < 5 * 60_000;

      const sameDay = (mem.lastNudgeAt || "").slice(0, 10) === new Date().toISOString().slice(0, 10);
      const nudgesToday = sameDay ? mem.nudgeCountToday || 0 : 0;

      if (sinceLast < 75_000 || lastWasNudge || nudgesToday >= 3) {
        return NextResponse.json({ ok: true, reply: "" });
      }

      const sal = salutationForTZ(timezone);
      const messages: ChatMsg[] = [
        { role: "system", content: system },
        { role: "system", content: STYLE_GUARD },
        ...summaryMsgs,
        ...recentMsgs,
        { role: "user", content: `Write one ${sal} nudge. One concrete action. No questions. ≤ 14 words.` },
      ];

      const raw = await chatComplete(messages, { max_tokens: 40 });
      const reply = ensureReply(raw, "Action: open the Temple menu and start your first rite.");

      ff(noteNudge(userId));
      ff(appendMessage(userId, { role: "assistant", text: reply }));
      return NextResponse.json({ ok: true, reply });
    }

    /* --------------------------------- ACTION: say ----------------------------- */
    const userText = (message || "").trim();
    if (!userText) {
      return NextResponse.json({ ok: false, error: "Missing message" }, { status: 400 });
    }

    const m = userText.match(/\bmy name is\s+([a-z][\w'-]*)/i);
    if (m) ff(setIdentity(userId, { name: m[1] }));

    const messages: ChatMsg[] = [
      { role: "system", content: system },
      { role: "system", content: STYLE_GUARD },
      ...summaryMsgs,
      ...recentMsgs,
      {
        role: "user",
        content: [
          `User: "${userText}"`,
          "Respond with: Signal (1) → Parallels (1–2 name/year) → Mechanism (1) → Risk (1) → Action (1).",
          "No questions unless essential.",
        ].join("\n"),
      },
    ];

    const raw = await chatComplete(messages, { max_tokens: maxFor(len) });
    const reply = ensureReply(raw);

    ff(appendMessage(userId, { role: "user", text: userText }));
    ff(appendMessage(userId, { role: "assistant", text: reply }));

    return NextResponse.json({ ok: true, reply });
  } catch (err: any) {
    console.error("/api/knowrah error", err);
    return NextResponse.json(
      { ok: false, reply: `⚠️ ${err?.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
