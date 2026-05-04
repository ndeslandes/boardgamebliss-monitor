import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/products';
import { getStore } from '@/lib/stores';

export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ error: `Unknown store: ${storeId}` }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const filter = (searchParams.get('filter') ?? 'all') as 'all' | 'available' | 'soldout';
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') ?? '100'), 500));

  return NextResponse.json(searchProducts(storeId, q, filter, limit));
}
