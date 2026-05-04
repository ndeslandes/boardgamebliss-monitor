import { NextResponse } from 'next/server';
import { getTrackedCollections, getNewUntracked, getPollHistory } from '@/lib/db';
import { getWishlist } from '@/lib/db-wishlist';
import { searchProducts } from '@/lib/products';
import { STORES } from '@/lib/stores';

export async function GET() {
  const wishlist = getWishlist();

  const availMap = new Map<string, boolean>();
  const bggMap = new Map<string, { bggUrl: string | null; bggRank: number | null }>();
  for (const store of STORES) {
    const { products } = searchProducts(store.id, '', 'all', 10000);
    for (const p of products) {
      const key = `${store.id}:${p.handle}`;
      availMap.set(key, p.available);
      bggMap.set(key, { bggUrl: p.bggUrl, bggRank: p.bggRank });
    }
  }

  const tracked = STORES.flatMap(s =>
    getTrackedCollections(s.id).map(c => ({ ...c, storeId: s.id, storeName: s.name, displayOrder: s.displayOrder }))
  ).sort((a, b) =>
    a.displayOrder !== b.displayOrder
      ? a.displayOrder - b.displayOrder
      : (b.publishedAt ?? b.firstSeenAt).localeCompare(a.publishedAt ?? a.firstSeenAt)
  );
  const otherNew = STORES.flatMap(s =>
    getNewUntracked(s.id).map(c => ({ ...c, storeId: s.id, storeName: s.name }))
  );
  const history = STORES.flatMap(s =>
    getPollHistory(s.id, 100).map(h => ({ ...h, storeId: s.id, storeName: s.name }))
  ).sort((a, b) => b.polledAt.localeCompare(a.polledAt)).slice(0, 100);

  return NextResponse.json({
    tracked,
    otherNew,
    history,
    wishlist: wishlist.map(w => {
      const key = `${w.storeId}:${w.productHandle}`;
      return {
        ...w,
        available: availMap.get(key) ?? null,
        ...(bggMap.get(key) ?? { bggUrl: null, bggRank: null }),
      };
    }),
  });
}
