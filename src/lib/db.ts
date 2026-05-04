import fs from 'fs';
import path from 'path';
import { getStore } from './stores';

const DATA_BASE = path.join(process.cwd(), 'data');

function storeDir(storeId: string) { return path.join(DATA_BASE, storeId); }
function storeFile(storeId: string) { return path.join(storeDir(storeId), 'store.json'); }

export interface StoredCollection {
  shopifyId: number;
  handle: string;
  title: string;
  description: string;
  productsCount: number;
  availableCount: number | null;
  outOfStockCount: number | null;
  countsUpdatedAt: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isNew: boolean;
}

export interface PollEntry {
  polledAt: string;
  totalCollections: number;
  newCollections: number;
  status: 'success' | 'error';
  errorMessage?: string;
  collectionsDurationMs?: number;
  countsDurationMs?: number;
  updatedCollections?: number;
}

interface StoreData {
  collections: StoredCollection[];
  polls: PollEntry[];
}

function readStoreData(storeId: string): StoreData {
  try {
    const raw = JSON.parse(fs.readFileSync(storeFile(storeId), 'utf-8'));
    return { collections: [], polls: [], ...raw };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { collections: [], polls: [] };
    }
    throw err;
  }
}

function writeStoreData(storeId: string, data: StoreData): void {
  const dir = storeDir(storeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storeFile(storeId), JSON.stringify(data, null, 2));
}

export function getTrackedCollections(storeId: string): StoredCollection[] {
  const { isTracked } = getStore(storeId);
  return readStoreData(storeId)
    .collections.filter(c => isTracked(c.handle))
    .sort((a, b) => (b.publishedAt ?? b.firstSeenAt).localeCompare(a.publishedAt ?? a.firstSeenAt));
}

export function getNewUntracked(storeId: string): StoredCollection[] {
  const { isTracked } = getStore(storeId);
  return readStoreData(storeId).collections.filter(c => c.isNew && !isTracked(c.handle));
}

export function getPollHistory(storeId: string, limit = 20): PollEntry[] {
  return readStoreData(storeId).polls.slice(-limit).reverse();
}

export function upsertCollections(
  storeId: string,
  incoming: Omit<StoredCollection, 'firstSeenAt' | 'isNew' | 'availableCount' | 'outOfStockCount' | 'countsUpdatedAt'>[]
): number {
  const data = readStoreData(storeId);
  const isFirstRun = data.collections.length === 0;
  const byId = new Map(data.collections.map(c => [c.shopifyId, c]));
  let newCount = 0;
  const now = new Date().toISOString();

  for (const col of incoming) {
    if (byId.has(col.shopifyId)) {
      const existing = byId.get(col.shopifyId)!;
      existing.productsCount = col.productsCount;
      existing.updatedAt = col.updatedAt;
      existing.lastSeenAt = now;
    } else {
      byId.set(col.shopifyId, { ...col, availableCount: null, outOfStockCount: null, countsUpdatedAt: null, firstSeenAt: now, isNew: !isFirstRun });
      if (!isFirstRun) newCount++;
    }
  }

  data.collections = Array.from(byId.values());
  writeStoreData(storeId, data);
  return newCount;
}

export function batchUpdateProductCounts(
  storeId: string,
  updates: { shopifyId: number; available: number; outOfStock: number }[]
): number {
  const data = readStoreData(storeId);
  const byId = new Map(data.collections.map(c => [c.shopifyId, c]));
  const now = new Date().toISOString();
  let changedCount = 0;
  for (const { shopifyId, available, outOfStock } of updates) {
    const col = byId.get(shopifyId);
    if (col) {
      const changed = col.availableCount !== available || col.outOfStockCount !== outOfStock;
      col.availableCount = available;
      col.outOfStockCount = outOfStock;
      if (changed) {
        col.countsUpdatedAt = now;
        changedCount++;
      }
    }
  }
  writeStoreData(storeId, data);
  return changedCount;
}

export function addPoll(storeId: string, entry: PollEntry): void {
  const data = readStoreData(storeId);
  data.polls.push(entry);
  if (data.polls.length > 100) data.polls = data.polls.slice(-100);
  writeStoreData(storeId, data);
}

export function patchLastPoll(storeId: string, patch: Partial<PollEntry>): void {
  const data = readStoreData(storeId);
  if (data.polls.length > 0) {
    Object.assign(data.polls[data.polls.length - 1], patch);
    writeStoreData(storeId, data);
  }
}

export function markAllSeen(storeId: string): void {
  const data = readStoreData(storeId);
  data.collections.forEach(c => { c.isNew = false; });
  writeStoreData(storeId, data);
}
