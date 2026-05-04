import { NextResponse } from 'next/server';
import { markAllSeen } from '@/lib/db';
import { getStore } from '@/lib/stores';

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ error: `Unknown store: ${storeId}` }, { status: 404 });
  }
  markAllSeen(storeId);
  return NextResponse.json({ ok: true });
}
