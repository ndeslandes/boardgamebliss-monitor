import { NextResponse } from 'next/server';
import { fetchCollectionProducts, countAvailability } from '@/lib/shopify';
import { getTrackedCollections, batchUpdateProductCounts, patchLastPoll } from '@/lib/db';
import { batchUpsertProducts } from '@/lib/products';
import { setProgress, resetProgress } from '@/lib/progress';

const CONCURRENCY = 1;

export async function POST() {
  const t0 = Date.now();
  const targets = getTrackedCollections().filter(c => c.productsCount > 0);
  setProgress({ phase: 'counts', current: 0, total: targets.length });
  let done = 0;
  const counts: { shopifyId: number; available: number; outOfStock: number }[] = [];
  const productBatches: { collectionHandle: string; products: Awaited<ReturnType<typeof fetchCollectionProducts>> }[] = [];

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(async col => {
        setProgress({ currentHandle: col.handle });
        const products = await fetchCollectionProducts(col.handle);
        return { col, products };
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        const { col, products } = r.value;
        counts.push({ shopifyId: col.shopifyId, ...countAvailability(products) });
        productBatches.push({ collectionHandle: col.handle, products });
      } else {
        console.error('[poll-counts] failed for a collection:', r.reason);
      }
      done++;
      setProgress({ current: done });
    }
  }

  batchUpsertProducts(productBatches);
  const changedCount = batchUpdateProductCounts(counts);
  patchLastPoll({ countsDurationMs: Date.now() - t0, updatedCollections: changedCount });
  resetProgress();

  return NextResponse.json({ ok: true, updated: counts.length, changed: changedCount });
}
