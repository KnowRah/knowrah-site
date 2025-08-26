// src/lib/identity.ts
import { hget, hset } from "./kv";


export type Identity = {
name?: string;
persona?: string; // optional custom tone override per user
createdAt: string;
updatedAt: string;
};


const NS = {
user: (uid: string) => `kr:user:${uid}`,
};


export async function getIdentity(userId: string): Promise<Identity> {
const raw = (await hget(NS.user(userId), "identity")) as any;
if (!raw) {
const empty: Identity = {
name: undefined,
persona: undefined,
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
};
await hset(NS.user(userId), { identity: empty });
return empty;
}
return raw as Identity;
}


export async function setIdentity(userId: string, patch: Partial<Identity>) {
const current = await getIdentity(userId);
const next: Identity = { ...current, ...patch, updatedAt: new Date().toISOString() };
await hset(NS.user(userId), { identity: next });
return next;
}