import { NextResponse } from 'next/server';
import { getCollectionProducts } from '@/lib/products';
import { getStore } from '@/lib/stores';

export async function GET(_req: Request, { params }: { params: { storeId: string; handle: string } }) {
  const { storeId, handle } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ error: `Unknown store: ${storeId}` }, { status: 404 });
  }

  const products = getCollectionProducts(storeId, handle);
  return NextResponse.json({ products, cached: true });
}
