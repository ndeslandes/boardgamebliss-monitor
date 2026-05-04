import fs from 'fs';
import path from 'path';

const DATA_BASE = path.join(process.cwd(), 'data');
const WISHLIST_FILE = path.join(DATA_BASE, 'wishlist.json');

export interface WishlistItem {
  storeId: string;
  productHandle: string;
  productTitle: string;
  vendor: string;
  price: string;
  collectionHandle: string;
  addedAt: string;
}

function readWishlist(): WishlistItem[] {
  try {
    return JSON.parse(fs.readFileSync(WISHLIST_FILE, 'utf-8'));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

function writeWishlist(items: WishlistItem[]): void {
  if (!fs.existsSync(DATA_BASE)) fs.mkdirSync(DATA_BASE, { recursive: true });
  fs.writeFileSync(WISHLIST_FILE, JSON.stringify(items, null, 2));
}

export function getWishlist(): WishlistItem[] {
  return readWishlist().sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function toggleWishlist(item: Omit<WishlistItem, 'addedAt'>): boolean {
  const items = readWishlist();
  const idx = items.findIndex(w => w.storeId === item.storeId && w.productHandle === item.productHandle);
  if (idx >= 0) {
    items.splice(idx, 1);
    writeWishlist(items);
    return false;
  }
  items.push({ ...item, addedAt: new Date().toISOString() });
  writeWishlist(items);
  return true;
}
