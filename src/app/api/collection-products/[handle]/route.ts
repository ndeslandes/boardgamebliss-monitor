import { NextResponse } from 'next/server';
import { getCollectionProducts } from '@/lib/products';

export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const products = getCollectionProducts(params.handle);
  return NextResponse.json({ products, cached: true });
}
