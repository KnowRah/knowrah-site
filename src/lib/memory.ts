// src/lib/memory.ts
import { kv } from "./kv";

type Role = "user" | "assistant";
type Turn = { role: Role; text: string; at: string };

export type Memory = {
  facts: string[];
  thread: Turn[];
  lastSeenAt: string;
  lastNudgeAt?: string;
  nudgeCountToday?: number;
};

function blank(): Memory {
  const now = new Date().toISOString();
  return { facts: [], thread: [], lastSeenAt: now };
}

export async function getMemory(userId: string): Promise<Memory> {
  const key = `kr:mem:${userId}`;
  const m = (await kv.get<Memory>(key)) || blank();
  // update lastSeen but don't persist here to avoid hot writes
  return m;
}

export async function appendMessage(userId: string, t: { role: Role; text: string }) {
  const key = `kr:mem:${userId}`;
  const m = (await kv.get<Memory>(key)) || blank();
  const turn: Turn = { role: t.role, text: t.text, at: new Date().toISOString() };
  m.thread.push(turn);
  m.lastSeenAt = turn.at;
  // keep memory lean
  if (m.thread.length > 200) m.thread = m.thread.slice(-200);
  await kv.set(key, m);
}

export async function addFacts(userId: string, facts: string[]) {
  const key = `kr:mem:${userId}`;
  const m = (await kv.get<Memory>(key)) || blank();
  for (const f of facts) {
    if (!m.facts.includes(f)) m.facts.push(f);
  }
  await kv.set(key, m);
}

export async function noteNudge(userId: string) {
  const key = `kr:mem:${userId}`;
  const m = (await kv.get<Memory>(key)) || blank();
  const now = new Date().toISOString();
  m.lastNudgeAt = now;
  const today = now.slice(0, 10);
  const lastDay = (m.lastNudgeAt || now).slice(0, 10);
  m.nudgeCountToday = today === lastDay ? (m.nudgeCountToday || 0) + 1 : 1;
  await kv.set(key, m);
}
