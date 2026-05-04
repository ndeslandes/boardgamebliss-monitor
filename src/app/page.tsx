'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';

interface Collection {
  storeId: string;
  storeName: string;
  shopifyId: number;
  handle: string;
  title: string;
  productsCount: number;
  availableCount: number | null;
  outOfStockCount: number | null;
  countsUpdatedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isNew: boolean;
}

interface PollEntry {
  storeId: string;
  storeName: string;
  polledAt: string;
  totalCollections: number;
  newCollections: number;
  status: 'success' | 'error';
}

interface WishlistItem {
  storeId: string;
  productHandle: string;
  productTitle: string;
  vendor: string;
  price: string;
  collectionHandle: string;
  addedAt: string;
  available: boolean | null;
  bggUrl: string | null;
  bggRank: number | null;
}

interface Data {
  tracked: Collection[];
  otherNew: Collection[];
  history: PollEntry[];
  wishlist: WishlistItem[];
}

const STORE_COLORS: Record<string, string> = {
  boardgamebliss: 'bg-blue-900/60 text-blue-300',
  '401games': 'bg-orange-900/60 text-orange-300',
};

function StoreBadge({ storeId, storeName }: { storeId: string; storeName: string }) {
  const cls = STORE_COLORS[storeId] ?? 'bg-gray-800 text-gray-400';
  const short = storeId === 'boardgamebliss' ? 'BGB' : storeName;
  return <span className={`px-1.5 py-0.5 text-xs font-medium rounded shrink-0 ${cls}`}>{short}</span>;
}

function TypeBadge({ handle, storeId }: { handle: string; storeId: string }) {
  if (storeId === 'boardgamebliss') {
    if (handle.startsWith('restock-'))
      return <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-900/60 text-blue-300 rounded">restock</span>;
    if (handle.startsWith('new-'))
      return <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-900/60 text-purple-300 rounded">new</span>;
  }
  if (storeId === '401games') {
    if (handle === 'board-game-restocks')
      return <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-900/60 text-blue-300 rounded">restock</span>;
    if (handle === 'new-releases')
      return <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-900/60 text-purple-300 rounded">new</span>;
  }
  return null;
}

const STORE_DOMAINS: Record<string, string> = {
  boardgamebliss: 'https://www.boardgamebliss.com',
  '401games': 'https://store.401games.ca',
};

const COLLECTION_LIMIT = 20;

function CollectionTable({ collections }: { collections: Collection[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? collections : collections.slice(0, COLLECTION_LIMIT);
  const hidden = collections.length - COLLECTION_LIMIT;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collection</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Products</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">First Detected</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {visible.map(col => (
            <tr
              key={`${col.storeId}:${col.shopifyId}`}
              className={`hover:bg-gray-800/40 transition-colors ${col.isNew ? 'bg-emerald-950/20' : ''}`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StoreBadge storeId={col.storeId} storeName={col.storeName} />
                  <TypeBadge handle={col.handle} storeId={col.storeId} />
                  <Link
                    href={`/collections/${col.storeId}/${col.handle}`}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {col.title}
                  </Link>
                  {col.isNew && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-900 text-emerald-300 rounded">NEW</span>
                  )}
                  <a
                    href={`${STORE_DOMAINS[col.storeId]}/collections/${col.handle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-600 hover:text-gray-400 text-xs"
                    title={`View on ${col.storeName}`}
                  >↗</a>
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {col.availableCount != null && col.outOfStockCount != null ? (
                  <span className="text-xs">
                    <span className="text-emerald-400">{col.availableCount.toLocaleString()} avail</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-gray-500">{col.outOfStockCount.toLocaleString()} sold out</span>
                  </span>
                ) : (
                  <span className="text-gray-300">{col.productsCount.toLocaleString()}</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-xs tabular-nums">
                {col.countsUpdatedAt
                  ? <span className="text-amber-400/80">{timeAgo(col.countsUpdatedAt)}</span>
                  : <span className="text-gray-700">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-gray-500 text-xs tabular-nums">
                {timeAgo(col.firstSeenAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full px-4 py-2.5 text-xs text-gray-600 hover:text-gray-400 hover:bg-gray-800/40 transition-colors border-t border-gray-800/60 text-center"
        >
          {showAll ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [marking, setMarking] = useState(false);
  const removingRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      setData(await res.json());
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markSeen() {
    setMarking(true);
    await fetch('/api/mark-seen', { method: 'POST' });
    await load();
    setMarking(false);
  }

  async function removeFromWishlist(item: WishlistItem) {
    const key = `${item.storeId}:${item.productHandle}`;
    if (removingRef.current.has(key)) return;
    removingRef.current.add(key);
    setData(prev => prev ? { ...prev, wishlist: prev.wishlist.filter(w => !(w.storeId === item.storeId && w.productHandle === item.productHandle)) } : prev);
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: item.storeId, productHandle: item.productHandle, productTitle: item.productTitle, collectionHandle: item.collectionHandle, price: item.price, vendor: item.vendor }),
    });
    removingRef.current.delete(key);
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Loading...</p>
      </main>
    );
  }

  const { tracked, otherNew, history } = data;
  const lastPoll = history[0];
  const newTracked = tracked.filter(c => c.isNew);
  const hasNew = newTracked.length > 0 || otherNew.length > 0;
  const available = tracked.filter(c => c.productsCount > 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Board Game Monitor</h1>
            <p className="text-gray-500 text-sm mt-1">
              {lastPoll
                ? <>Last synced <span className="text-gray-400">{timeAgo(lastPoll.polledAt)}</span> &middot; {lastPoll.storeName}</>
                : 'No sync yet'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Link href="/search" className="px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors border border-gray-800">
              Search
            </Link>
            <Link href="/poll" className="px-3 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors border border-gray-800">
              Sync
            </Link>
            {hasNew && (
              <button
                onClick={markSeen}
                disabled={marking}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-sm text-gray-300 transition-colors"
              >
                Mark all seen
              </button>
            )}
          </div>
        </div>

        {newTracked.length > 0 && (
          <div className="p-4 bg-emerald-950/50 border border-emerald-700/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span className="text-emerald-400 font-medium text-sm uppercase tracking-wide">
                {newTracked.length} new collection{newTracked.length > 1 ? 's' : ''} detected
              </span>
            </div>
            <div className="space-y-2">
              {newTracked.map(col => (
                <div key={`${col.storeId}:${col.shopifyId}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <StoreBadge storeId={col.storeId} storeName={col.storeName} />
                    <TypeBadge handle={col.handle} storeId={col.storeId} />
                    <Link
                      href={`/collections/${col.storeId}/${col.handle}`}
                      className="text-emerald-300 hover:text-emerald-200 hover:underline"
                    >
                      {col.title}
                    </Link>
                  </div>
                  <span className="text-gray-500 text-xs shrink-0">
                    {col.productsCount} products &middot; seen {timeAgo(col.firstSeenAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {otherNew.length > 0 && (
          <div className="p-4 bg-yellow-950/30 border border-yellow-800/40 rounded-xl">
            <span className="text-yellow-500 font-medium text-sm uppercase tracking-wide block mb-3">
              {otherNew.length} other new collection{otherNew.length > 1 ? 's' : ''}
            </span>
            <div className="space-y-1">
              {otherNew.map(col => (
                <div key={`${col.storeId}:${col.shopifyId}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <StoreBadge storeId={col.storeId} storeName={col.storeName} />
                    <a
                      href={`${STORE_DOMAINS[col.storeId]}/collections/${col.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-yellow-300 hover:underline text-sm"
                    >
                      {col.title}
                    </a>
                  </div>
                  <span className="text-gray-600 text-xs shrink-0">{timeAgo(col.firstSeenAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.wishlist.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Wishlist <span className="text-gray-600 font-normal normal-case">({data.wishlist.length})</span>
            </h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collection</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-3 py-3 w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {data.wishlist.map(item => (
                    <tr key={`${item.storeId}:${item.productHandle}`} className={`hover:bg-gray-800/30 ${item.available === true ? 'bg-emerald-950/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`${STORE_DOMAINS[item.storeId]}/products/${item.productHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                          >
                            {item.productTitle}
                          </a>
                          {item.bggUrl && (
                            <a href={item.bggUrl} target="_blank" rel="noreferrer"
                              className="text-orange-500 hover:text-orange-400 text-xs font-medium shrink-0" title="BoardGameGeek">
                              BGG
                            </a>
                          )}
                          {item.bggRank != null && (
                            <span className="text-xs font-mono text-amber-400 shrink-0" title="BGG overall rank">
                              #{item.bggRank}
                            </span>
                          )}
                        </div>
                        {item.vendor && <p className="text-gray-600 text-xs mt-0.5">{item.vendor}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StoreBadge storeId={item.storeId} storeName={item.storeId} />
                          <Link
                            href={`/collections/${item.storeId}/${item.collectionHandle}`}
                            className="text-gray-500 hover:text-gray-300 text-xs hover:underline capitalize"
                          >
                            {item.collectionHandle.replace(/-/g, ' ')}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs tabular-nums">
                        ${parseFloat(item.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.available === true && <span className="text-xs font-medium text-emerald-400">in stock</span>}
                        {item.available === false && <span className="text-xs text-gray-600">sold out</span>}
                        {item.available === null && <span className="text-xs text-gray-700">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => removeFromWishlist(item)}
                          className="text-gray-700 hover:text-rose-400 transition-colors text-base leading-none"
                          title="Remove from wishlist"
                        >
                          ♥
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
            Restocks &amp; New Arrivals{available.length > 0 && <span className="text-gray-600 font-normal normal-case ml-1">({available.length})</span>}
          </h2>
          {tracked.length === 0 ? (
            <div className="p-8 text-center text-gray-600 bg-gray-900 rounded-xl border border-gray-800">
              No collections found yet.{' '}
              <Link href="/poll" className="text-blue-500 hover:underline">Run a sync.</Link>
            </div>
          ) : available.length === 0 ? (
            <p className="text-gray-600 text-sm">All collections are sold out.</p>
          ) : (
            <CollectionTable collections={available} />
          )}
        </div>

      </div>
    </main>
  );
}
