import { NextResponse } from 'next/server';
import { getTrackedCollections, getNewUntracked, getPollHistory, getWishlist } from '@/lib/db';
import { searchProducts } from '@/lib/products';

export async function GET() {
  const wishlist = getWishlist();
  const { products } = searchProducts('', 'all', 10000);
  const availMap = new Map(products.map(p => [p.handle, p.available]));

  return NextResponse.json({
    tracked: getTrackedCollections(),
    otherNew: getNewUntracked(),
    history: getPollHistory(100),
    wishlist: wishlist.map(w => ({
      ...w,
      available: availMap.get(w.productHandle) ?? null,
    })),
  });
}
