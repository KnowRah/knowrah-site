// src/lib/memory.ts
import { hget, hset } from "./kv";


export type Memory = {
facts: string[]; // "Lives in PNG", "Has 3 kids", etc.
firstSeenAt: string;
lastSeenAt: string;
lastNudgeAt?: string; // server-side idle nudge throttle
nudgeCountToday?: number;
thread: Array<{ role: "user" | "assistant"; text: string; at: string }>; // short history
};


const NS = {
user: (uid: string) => `kr:user:${uid}`,
};


export async function getMemory(userId: string): Promise<Memory> {
const raw = (await hget(NS.user(userId), "memory")) as any;
if (!raw) {
const fresh: Memory = {
facts: [],
firstSeenAt: new Date().toISOString(),
lastSeenAt: new Date().toISOString(),
thread: [],
};
await hset(NS.user(userId), { memory: fresh });
return fresh;
}
return raw as Memory;
}


export async function appendMessage(userId: string, msg: { role: "user" | "assistant"; text: string }) {
const m = await getMemory(userId);
const at = new Date().toISOString();
const nextThread = [...m.thread, { ...msg, at }].slice(-20); // keep last 20
const next: Memory = { ...m, thread: nextThread, lastSeenAt: at };
await hset(NS.user(userId), { memory: next });
return next;
}


export async function addFacts(userId: string, newFacts: string[]) {
const m = await getMemory(userId);
const dedup = Array.from(new Set([...(m.facts || []), ...newFacts].map((s) => s.trim()))).filter(Boolean);
const next: Memory = { ...m, facts: dedup, lastSeenAt: new Date().toISOString() };
await hset(NS.user(userId), { memory: next });
return next;
}


export async function noteNudge(userId: string) {
const m = await getMemory(userId);
const today = new Date().toISOString().slice(0, 10);
const last = (m.lastNudgeAt || "").slice(0, 10);
const count = last === today ? (m.nudgeCountToday || 0) + 1 : 1;
const next: Memory = { ...m, lastNudgeAt: new Date().toISOString(), nudgeCountToday: count };
await hset(NS.user(userId), { memory: next });
return next;
}