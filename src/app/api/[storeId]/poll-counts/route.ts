import { NextResponse } from 'next/server';
import { fetchCollectionProducts, countAvailability } from '@/lib/shopify';
import { getTrackedCollections, batchUpdateProductCounts, patchLastPoll } from '@/lib/db';
import { batchUpsertProducts } from '@/lib/products';
import { setProgress, resetProgress } from '@/lib/progress';
import { getStore } from '@/lib/stores';

export async function POST(_req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;
  try { getStore(storeId); } catch {
    return NextResponse.json({ ok: false, error: `Unknown store: ${storeId}` }, { status: 404 });
  }

  const t0 = Date.now();
  const targets = getTrackedCollections(storeId).filter(c => c.productsCount > 0);
  setProgress(storeId, { phase: 'counts', current: 0, total: targets.length });
  let done = 0;
  const counts: { shopifyId: number; available: number; outOfStock: number }[] = [];
  const productBatches: { collectionHandle: string; products: Awaited<ReturnType<typeof fetchCollectionProducts>> }[] = [];

  for (const col of targets) {
    setProgress(storeId, { currentHandle: col.handle });
    try {
      const products = await fetchCollectionProducts(storeId, col.handle);
      counts.push({ shopifyId: col.shopifyId, ...countAvailability(products) });
      productBatches.push({ collectionHandle: col.handle, products });
    } catch (err) {
      console.error(`[poll-counts:${storeId}] failed for ${col.handle}:`, err);
    }
    done++;
    setProgress(storeId, { current: done });
  }

  batchUpsertProducts(storeId, productBatches);
  const changedCount = batchUpdateProductCounts(storeId, counts);
  patchLastPoll(storeId, { countsDurationMs: Date.now() - t0, updatedCollections: changedCount });
  resetProgress(storeId);

  return NextResponse.json({ ok: true, updated: counts.length, changed: changedCount });
}
