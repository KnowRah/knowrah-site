// src/lib/identity.ts
import { kv } from "./kv";

type Identity = { name?: string };

export async function getIdentity(userId: string): Promise<Identity> {
  const id = (await kv.get<Identity>(`kr:identity:${userId}`)) || {};
  return id;
}

export async function setIdentity(userId: string, id: Identity): Promise<Identity> {
  const next = { ...(await getIdentity(userId)), ...id };
  await kv.set(`kr:identity:${userId}`, next);
  return next;
}
