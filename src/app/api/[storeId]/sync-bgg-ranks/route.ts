import { NextResponse } from 'next/server';
import { getStore } from '@/lib/stores';
import { searchProducts } from '@/lib/products';

const BATCH_PER_CLICK = 300;

// GET — returns next batch of products that still need a BGG rank
export async function GET(_req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  const { products } = searchProducts(params.storeId, '', 'all', 100000);
  const needsRank = products
    .filter(p => p.bggUrl && p.bggRank == null)
    .slice(0, BATCH_PER_CLICK)
    .map(p => ({ handle: p.handle, bggUrl: p.bggUrl! }));
  const remaining = products.filter(p => p.bggUrl && p.bggRank == null).length;
  return NextResponse.json({ needsRank, remaining });
}
