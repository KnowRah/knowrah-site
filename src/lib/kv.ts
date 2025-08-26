// src/lib/kv.ts
import { Redis } from "@upstash/redis";


let _redis: Redis | null = null;
export function kv() {
if (_redis) return _redis;
_redis = Redis.fromEnv();
return _redis;
}


// Thin wrappers (no generics → fixes TS 2558 issues in callers)
export async function hget(key: string, field: string): Promise<unknown | null> {
return kv().hget(key, field);
}
export async function hset(key: string, values: Record<string, unknown>) {
return kv().hset(key, values);
}
export async function get(key: string): Promise<unknown | null> {
return kv().get(key);
}
export async function set(key: string, value: unknown, ttlSeconds?: number) {
if (ttlSeconds) return kv().set(key, value, { ex: ttlSeconds });
return kv().set(key, value);
}