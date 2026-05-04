import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

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

export interface WishlistItem {
  productHandle: string;
  productTitle: string;
  vendor: string;
  price: string;
  collectionHandle: string;
  addedAt: string;
}

interface Store {
  collections: StoredCollection[];
  polls: PollEntry[];
  wishlist: WishlistItem[];
}

function readStore(): Store {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
    return { wishlist: [], ...raw };
  } catch {
    return { collections: [], polls: [], wishlist: [] };
  }
}

function writeStore(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

function isTracked(handle: string) {
  return handle.startsWith('restock-') || handle.startsWith('new-');
}

export function getTrackedCollections(): StoredCollection[] {
  return readStore()
    .collections.filter(c => isTracked(c.handle))
    .sort((a, b) => (b.publishedAt ?? b.firstSeenAt).localeCompare(a.publishedAt ?? a.firstSeenAt));
}

export function getNewUntracked(): StoredCollection[] {
  return readStore().collections.filter(c => c.isNew && !isTracked(c.handle));
}

export function getPollHistory(limit = 20): PollEntry[] {
  return readStore().polls.slice(-limit).reverse();
}

export function getWishlist(): WishlistItem[] {
  return readStore().wishlist.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function toggleWishlist(item: Omit<WishlistItem, 'addedAt'>): boolean {
  const store = readStore();
  const idx = store.wishlist.findIndex(w => w.productHandle === item.productHandle);
  if (idx >= 0) {
    store.wishlist.splice(idx, 1);
    writeStore(store);
    return false;
  }
  store.wishlist.push({ ...item, addedAt: new Date().toISOString() });
  writeStore(store);
  return true;
}

export function upsertCollections(
  incoming: Omit<StoredCollection, 'firstSeenAt' | 'isNew' | 'availableCount' | 'outOfStockCount' | 'countsUpdatedAt'>[]
): number {
  const store = readStore();
  const isFirstRun = store.collections.length === 0;
  const byId = new Map(store.collections.map(c => [c.shopifyId, c]));
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

  store.collections = Array.from(byId.values());
  writeStore(store);
  return newCount;
}

export function batchUpdateProductCounts(
  updates: { shopifyId: number; available: number; outOfStock: number }[]
): number {
  const store = readStore();
  const byId = new Map(store.collections.map(c => [c.shopifyId, c]));
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
  writeStore(store);
  return changedCount;
}

export function addPoll(entry: PollEntry): void {
  const store = readStore();
  store.polls.push(entry);
  if (store.polls.length > 100) store.polls = store.polls.slice(-100);
  writeStore(store);
}

export function patchLastPoll(patch: Partial<PollEntry>): void {
  const store = readStore();
  if (store.polls.length > 0) {
    Object.assign(store.polls[store.polls.length - 1], patch);
    writeStore(store);
  }
}

export function markAllSeen(): void {
  const store = readStore();
  store.collections.forEach(c => { c.isNew = false; });
  writeStore(store);
}
