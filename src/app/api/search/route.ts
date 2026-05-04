import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/products';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const filter = (searchParams.get('filter') ?? 'all') as 'all' | 'available' | 'soldout';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);

  const result = searchProducts(q, filter, limit);
  return NextResponse.json(result);
}
