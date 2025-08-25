// src/lib/kv.ts
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error(
    "Missing KV_REST_API_URL or KV_REST_API_TOKEN. Add them to .env.local and restart the dev server."
  );
}

export const kv = new Redis({ url, token });

export const NS = {
  memoryHash: (userId: string) => `kr:mem:${userId}:h`,
  memoryIdx: (userId: string) => `kr:mem:${userId}:z`,
};

export const store = {
  // hashes
  hset: (key: string, value: Record<string, string>) => kv.hset(key, value),
  hget: (key: string, field: string) => kv.hget<string | null>(key, field),

  // sorted sets
  zadd: (key: string, member: { score: number; member: string }) =>
    kv.zadd(key, member),

  // newest-first N ids
  ztop: (key: string, n: number) =>
    kv.zrange(key, 0, Math.max(0, n - 1), { rev: true }) as Promise<string[]>,
};
