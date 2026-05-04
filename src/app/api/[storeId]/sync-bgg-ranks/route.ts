import { NextResponse } from 'next/server';
import { getStore } from '@/lib/stores';
import { updateBggRanks, getProductCount } from '@/lib/products';
import { searchProducts } from '@/lib/products';

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  const updated = await updateBggRanks(params.storeId);
  const { products } = searchProducts(params.storeId, '', 'all', 100000);
  const remaining = products.filter(p => p.bggUrl && p.bggRank === null).length;
  return NextResponse.json({ ok: true, updated, remaining });
}
