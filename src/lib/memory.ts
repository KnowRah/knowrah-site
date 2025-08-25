// src/lib/memory.ts
import { store, NS } from "./kv";

/** ---- Types ------------------------------------------------------------ */

export type Memory = {
  id: string;
  userId: string;
  text: string;
  tags?: string[];
  topic?: string;
  createdAt: number;
  meta?: Record<string, any>;
};

export type Identity = {
  name?: string;
  // extend later (location, birthday, partner, pet, etc.)
  lastSeen?: number;
  lastTopic?: string;
};

type AddInput = Omit<Memory, "id" | "createdAt"> & {
  id?: string;
  createdAt?: number;
};

/** ---- Utils ------------------------------------------------------------ */

function makeId() {
  try {
    // Edge/modern Node
    // @ts-ignore
    if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return (
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

const now = () => Date.now();

/** ---- Namespaces (keys) ------------------------------------------------ */

export const NS2 = {
  memoryHash: (userId: string) => `kr:mem:${userId}:h`,
  memoryIdx: (userId: string) => `kr:mem:${userId}:z`,
  profileHash: (userId: string) => `kr:profile:${userId}:h`,
};

/** ---- Memory: add / list ---------------------------------------------- */

export async function addMemory(input: AddInput) {
  const id = input.id ?? makeId();
  const createdAt = input.createdAt ?? now();

  const mem: Memory = {
    id,
    userId: input.userId,
    text: input.text.trim(),
    tags: (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    topic: input.topic?.trim(),
    createdAt,
    meta: input.meta ?? {},
  };

  // Hash of serialized memories by id
  await store.hset(NS2.memoryHash(mem.userId), { [mem.id]: JSON.stringify(mem) });
  // ZSET index by createdAt (score)
  await store.zadd(NS2.memoryIdx(mem.userId), {
    score: mem.createdAt,
    member: mem.id,
  });

  return mem;
}

/**
 * Return newest-first memories, with optional "since" filter.
 * Some KV SDKs don’t type zrange options consistently, so we use a thin
 * wrapper that’s already in kv.ts: ztop(key, n) => newest IDs by score.
 */
export async function listMemories(
  userId: string,
  opts?: { limit?: number; since?: number }
) {
  const limit = Math.max(1, Math.min(500, opts?.limit ?? 100));
  const since = opts?.since ?? 0;

  // fetch a window of most-recent IDs; then filter & slice
  const windowSize = Math.max(limit * 4, 200);
  const ids: string[] = await store.ztop(NS2.memoryIdx(userId), windowSize);

  if (!ids.length) return [];

  // Avoid hmget typing differences: fetch one-by-one
  const rows = await Promise.all(
  ids.map((id) => store.hget(NS2.memoryHash(userId), id))
) as (string | null)[];

  const parsed: Memory[] = [];
  for (const v of rows) {
    if (typeof v === "string") {
      try {
        const m = JSON.parse(v) as Memory;
        if (m.createdAt >= since) parsed.push(m);
      } catch {
        // ignore bad rows
      }
    }
    if (parsed.length >= limit) break;
  }
  // newest-first already, but ensure sorting by createdAt desc
  parsed.sort((a, b) => b.createdAt - a.createdAt);
  return parsed.slice(0, limit);
}

/** ---- Identity: get / set / touch ------------------------------------- */

/**
 * Get identity profile for a user. Returns {} when none.
 */
export async function getIdentity(userId: string): Promise<Identity> {
  const raw = await store.hget(NS2.profileHash(userId), "identity");
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Identity;
    return obj ?? {};
  } catch {
    return {};
  }
}

/**
 * Merge and set identity fields.
 */
export async function setIdentity(userId: string, patch: Partial<Identity>) {
  const current = await getIdentity(userId);
  const next: Identity = {
    ...current,
    ...patch,
  };
  await store.hset(NS2.profileHash(userId), {
    identity: JSON.stringify(next),
  });
  return next;
}

export async function setIdentityName(userId: string, name: string) {
  return setIdentity(userId, {
    name: name.trim(),
    lastSeen: now(),
  });
}

export async function touchIdentity(userId: string, lastTopic?: string) {
  return setIdentity(userId, {
    lastSeen: now(),
    ...(lastTopic ? { lastTopic } : {}),
  });
}

/** ---- Human-ish recalling --------------------------------------------- */

/**
 * Lightweight “recall” for drop-ins:
 * ranks by recency + topic/tag overlap + a tiny length bonus.
 */
export async function dropIns(
  userId: string,
  query: { topic?: string; tags?: string[]; daysBack?: number; limit?: number }
) {
  const limit = Math.max(1, Math.min(50, query.limit ?? 8));
  const days = Math.max(1, Math.min(3650, query.daysBack ?? 365));
  const since = now() - days * 24 * 60 * 60 * 1000;

  const pool = await listMemories(userId, { limit: 600, since });

  const topic = (query.topic ?? "").toLowerCase().trim();
  const tags = (query.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);

  function score(m: Memory) {
    let s = 0;

    const ageDays = (now() - m.createdAt) / (1000 * 60 * 60 * 24);
    if (ageDays < 7) s += 3;
    else if (ageDays < 30) s += 2;
    else if (ageDays < 90) s += 1;

    const hay = `${m.topic ?? ""} ${m.text}`.toLowerCase();
    if (topic && hay.includes(topic)) s += 3;

    if (tags.length && m.tags?.length) {
      const overlap = m.tags.filter((t) => tags.includes(t)).length;
      s += overlap * 2;
    }

    if (m.text.length > 60) s += 0.5;

    return s;
  }

  return pool
    .map((m) => ({ m, s: score(m) }))
    .filter((x) => x.s > 0 || (!topic && !tags.length))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.m);
}
