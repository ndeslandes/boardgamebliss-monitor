import { NextResponse } from 'next/server';
import { getStore } from '@/lib/stores';
import { updateBggRanks } from '@/lib/products';

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  try { getStore(params.storeId); } catch {
    return NextResponse.json({ error: 'Unknown store' }, { status: 400 });
  }
  const updated = await updateBggRanks(params.storeId);
  return NextResponse.json({ ok: true, updated });
}
