import { NextResponse } from 'next/server';
import { getStore } from '@/lib/stores';
import { storeBggRanks } from '@/lib/products';

export async function POST(req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  const { ranks } = await req.json() as { ranks: { handle: string; bggRank: number }[] };
  if (!Array.isArray(ranks)) return NextResponse.json({ error: 'ranks must be an array' }, { status: 400 });
  const updated = storeBggRanks(params.storeId, ranks);
  return NextResponse.json({ ok: true, updated });
}
