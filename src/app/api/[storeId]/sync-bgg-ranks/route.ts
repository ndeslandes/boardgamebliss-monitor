import { NextResponse } from 'next/server';
import { getStore } from '@/lib/stores';
import { searchProducts, updateBggRanks } from '@/lib/products';

const BATCH_PER_CLICK = 300;

// GET — how many products still need a BGG rank
export async function GET(_req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  const { products } = searchProducts(params.storeId, '', 'all', 100000);
  const remaining = products.filter(p => p.bggUrl && p.bggRank == null).length;
  return NextResponse.json({ remaining });
}

// POST — fetch next batch of BGG ranks server-side and save them
export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  try {
    const updated = await updateBggRanks(params.storeId, BATCH_PER_CLICK);
    const { products } = searchProducts(params.storeId, '', 'all', 100000);
    const remaining = products.filter(p => p.bggUrl && p.bggRank == null).length;
    return NextResponse.json({ updated, remaining });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
