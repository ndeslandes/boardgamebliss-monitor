import { NextResponse } from 'next/server';
import { getTrackedCollections, getNewUntracked, getPollHistory } from '@/lib/db';
import { getWishlist } from '@/lib/db-wishlist';
import { searchProducts } from '@/lib/products';
import { STORES } from '@/lib/stores';

export async function GET() {
  const wishlist = getWishlist();

  const availMap = new Map<string, boolean>();
  for (const store of STORES) {
    const { products } = searchProducts(store.id, '', 'all', 10000);
    for (const p of products) availMap.set(`${store.id}:${p.handle}`, p.available);
  }

  const tracked = STORES.flatMap(s =>
    getTrackedCollections(s.id).map(c => ({ ...c, storeId: s.id, storeName: s.name }))
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
    wishlist: wishlist.map(w => ({
      ...w,
      available: availMap.get(`${w.storeId}:${w.productHandle}`) ?? null,
    })),
  });
}
