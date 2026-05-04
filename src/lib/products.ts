import fs from 'fs';
import path from 'path';
import type { ShopifyProduct } from './shopify';

const DATA_BASE = path.join(process.cwd(), 'data');

function productsFile(storeId: string) { return path.join(DATA_BASE, storeId, 'products.json'); }

export interface CachedVariant {
  id: number;
  title: string;
  sku: string;
  available: boolean;
  price: string;
  compareAtPrice: string | null;
}

export interface CachedProduct {
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: string;
  compareAtPrice: string | null;
  available: boolean;
  availableVariants: number;
  totalVariants: number;
  skus: string[];
  imageUrl: string | null;
  bggUrl: string | null;
  collectionHandles: string[];
  variants: CachedVariant[];
  updatedAt: string;
  cachedAt: string;
}

interface ProductStore {
  lastSyncedAt: string | null;
  byHandle: Record<string, CachedProduct>;
}

function read(storeId: string): ProductStore {
  try {
    const raw = JSON.parse(fs.readFileSync(productsFile(storeId), 'utf-8'));
    return { lastSyncedAt: null, byHandle: {}, ...raw };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { lastSyncedAt: null, byHandle: {} };
    }
    throw err;
  }
}

function write(storeId: string, store: ProductStore): void {
  const dir = path.join(DATA_BASE, storeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(productsFile(storeId), JSON.stringify(store));
}

function parseBggUrl(html: string | null | undefined): string | null {
  if (!html) return null;
  const m = html.match(/id="bgg-url"[^>]*>(\d+\/[^<]+)</);
  if (m) return `https://boardgamegeek.com/boardgame/${m[1]}`;
  const m2 = html.match(/id="bgg-forum-url"[^>]*>(https?:\/\/[^<]+)</);
  if (m2) return m2[1].replace(/\/forums\/\d+$/, '');
  return null;
}

function parseTags(tags: string | string[]): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
}

function toEntry(p: ShopifyProduct, collectionHandle: string, existing: CachedProduct | undefined, now: string): CachedProduct {
  const collectionHandles = existing
    ? Array.from(new Set([...existing.collectionHandles, collectionHandle]))
    : [collectionHandle];
  const variants: CachedVariant[] = (p.variants ?? []).map(v => ({
    id: v.id,
    title: v.title,
    sku: v.sku ?? '',
    available: v.available,
    price: v.price,
    compareAtPrice: v.compare_at_price ?? null,
  }));
  const availableVariants = variants.filter(v => v.available).length;
  return {
    handle: p.handle,
    title: p.title,
    vendor: p.vendor ?? '',
    productType: p.product_type ?? '',
    tags: parseTags(p.tags),
    price: variants[0]?.price ?? '0',
    compareAtPrice: variants[0]?.compareAtPrice ?? null,
    available: availableVariants > 0,
    availableVariants,
    totalVariants: variants.length,
    skus: variants.map(v => v.sku).filter(Boolean),
    imageUrl: p.images?.[0]?.src ?? null,
    bggUrl: parseBggUrl(p.body_html),
    collectionHandles,
    variants,
    updatedAt: p.updated_at ?? now,
    cachedAt: now,
  };
}

export function upsertCollectionProducts(storeId: string, collectionHandle: string, raw: ShopifyProduct[]): void {
  const store = read(storeId);
  const now = new Date().toISOString();
  for (const p of raw) {
    store.byHandle[p.handle] = toEntry(p, collectionHandle, store.byHandle[p.handle], now);
  }
  store.lastSyncedAt = now;
  write(storeId, store);
}

export function batchUpsertProducts(storeId: string, batches: { collectionHandle: string; products: ShopifyProduct[] }[]): void {
  const store = read(storeId);
  const now = new Date().toISOString();
  for (const { collectionHandle, products } of batches) {
    for (const p of products) {
      store.byHandle[p.handle] = toEntry(p, collectionHandle, store.byHandle[p.handle], now);
    }
  }
  store.lastSyncedAt = now;
  write(storeId, store);
}

export function searchProducts(
  storeId: string,
  query: string,
  filter: 'all' | 'available' | 'soldout' = 'all',
  limit = 100
): { products: CachedProduct[]; total: number; lastSyncedAt: string | null } {
  const store = read(storeId);
  const all = Object.values(store.byHandle);

  const q = query.toLowerCase().trim();
  let results = q
    ? all.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.skus.some(s => s.toLowerCase().includes(q))
      )
    : all;

  if (filter === 'available') results = results.filter(p => p.available);
  else if (filter === 'soldout') results = results.filter(p => !p.available);

  results.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return { products: results.slice(0, limit), total: results.length, lastSyncedAt: store.lastSyncedAt };
}

export function getCollectionProducts(storeId: string, handle: string): CachedProduct[] {
  const all = Object.values(read(storeId).byHandle);
  return all
    .filter(p => p.collectionHandles.includes(handle))
    .map(p => ({ ...p, variants: p.variants ?? [] }));
}

export function getLastSyncedAt(storeId: string): string | null {
  return read(storeId).lastSyncedAt;
}

export function getProductCount(storeId: string): number {
  return Object.keys(read(storeId).byHandle).length;
}
