/**
 * Offline queue using IndexedDB via idb.
 * Stores failed API calls and replays them when connectivity is restored.
 */
import { openDB, type IDBPDatabase } from "idb";

type QueuedRequest = {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
};

let db: IDBPDatabase | null = null;

async function getDB() {
  if (!db) {
    db = await openDB("gdv-field-queue", 1, {
      upgrade(d) {
        d.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return db;
}

export async function enqueue(request: Omit<QueuedRequest, "id" | "createdAt">) {
  const store = await getDB();
  await store.add("requests", { ...request, createdAt: Date.now() });
}

export async function flush() {
  const store = await getDB();
  const all: QueuedRequest[] = await store.getAll("requests");
  const failed: QueuedRequest[] = [];

  for (const req of all) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      await store.delete("requests", req.id!);
    } catch {
      failed.push(req);
    }
  }
  return { synced: all.length - failed.length, pending: failed.length };
}

export async function pendingCount(): Promise<number> {
  const store = await getDB();
  return store.count("requests");
}
