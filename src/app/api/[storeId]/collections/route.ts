import { NextResponse } from 'next/server';
import { getTrackedCollections, getNewUntracked, getPollHistory } from '@/lib/db';
import { getStore } from '@/lib/stores';

export async function GET(_req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ error: `Unknown store: ${storeId}` }, { status: 404 });
  }

  return NextResponse.json({
    storeId,
    storeName: getStore(storeId).name,
    tracked: getTrackedCollections(storeId),
    otherNew: getNewUntracked(storeId),
    history: getPollHistory(storeId, 100),
  });
}
