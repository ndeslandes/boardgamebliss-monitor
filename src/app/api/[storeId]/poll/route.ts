import { NextResponse } from 'next/server';
import { fetchAllCollections } from '@/lib/shopify';
import { upsertCollections, addPoll } from '@/lib/db';
import { getProgress, setProgress, resetProgress } from '@/lib/progress';
import { getStore } from '@/lib/stores';

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ ok: false, error: `Unknown store: ${storeId}` }, { status: 404 });
  }

  if (getProgress(storeId).phase !== 'idle') {
    return NextResponse.json({ ok: false, error: 'Sync already in progress' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const t0 = Date.now();
  try {
    setProgress(storeId, { phase: 'collections', current: 0, total: 0 });
    const raw = await fetchAllCollections(storeId, fetched => setProgress(storeId, { current: fetched }));

    const newCount = upsertCollections(storeId, raw.map(c => ({
      shopifyId: c.id,
      handle: c.handle,
      title: c.title,
      description: c.description ?? '',
      productsCount: c.products_count,
      publishedAt: c.published_at,
      updatedAt: c.updated_at,
      lastSeenAt: now,
    })));

    addPoll(storeId, { polledAt: now, totalCollections: raw.length, newCollections: newCount, status: 'success', collectionsDurationMs: Date.now() - t0 });
    resetProgress(storeId);
    return NextResponse.json({ ok: true, total: raw.length, new: newCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[poll:${storeId}] failed:`, msg);
    resetProgress(storeId);
    try { addPoll(storeId, { polledAt: now, totalCollections: 0, newCollections: 0, status: 'error', errorMessage: msg, collectionsDurationMs: Date.now() - t0 }); } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
