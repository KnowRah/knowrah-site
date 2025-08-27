// src/lib/kv.ts
type Atom = string | number | boolean | object | null;

class InMemoryKV {
  private store = new Map<string, Atom>();
  private sets = new Map<string, Set<string>>();

  async get<T = Atom>(key: string): Promise<T | null> {
    return (this.store.has(key) ? (this.store.get(key) as T) : null);
  }
  async set<T = Atom>(key: string, val: T): Promise<void> {
    this.store.set(key, val as Atom);
  }
  async sadd(key: string, member: string): Promise<void> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member);
  }
  async smembers(key: string): Promise<string[]> {
    return Array.from(this.sets.get(key) || []);
  }
}

export const kv = new InMemoryKV();
