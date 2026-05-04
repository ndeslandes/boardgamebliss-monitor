import { NextResponse } from 'next/server';
import { fetchAllCollections } from '@/lib/shopify';
import { upsertCollections, addPoll } from '@/lib/db';
import { getProgress, setProgress, resetProgress } from '@/lib/progress';

export async function POST() {
  if (getProgress().phase !== 'idle') {
    return NextResponse.json({ ok: false, error: 'Sync already in progress' }, { status: 409 });
  }
  const now = new Date().toISOString();
  const t0 = Date.now();
  try {
    setProgress({ phase: 'collections', current: 0, total: 0 });
    const raw = await fetchAllCollections(fetched => setProgress({ current: fetched }));

    const newCount = upsertCollections(
      raw.map(c => ({
        shopifyId: c.id,
        handle: c.handle,
        title: c.title,
        description: c.description ?? '',
        productsCount: c.products_count,
        publishedAt: c.published_at,
        updatedAt: c.updated_at,
        lastSeenAt: now,
      }))
    );

    addPoll({ polledAt: now, totalCollections: raw.length, newCollections: newCount, status: 'success', collectionsDurationMs: Date.now() - t0 });
    resetProgress();
    return NextResponse.json({ ok: true, total: raw.length, new: newCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[poll] failed:', msg);
    resetProgress();
    try { addPoll({ polledAt: now, totalCollections: 0, newCollections: 0, status: 'error', errorMessage: msg, collectionsDurationMs: Date.now() - t0 }); } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
