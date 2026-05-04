'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';

interface CachedProduct {
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  tags: string[];
  price: string;
  compareAtPrice: string | null;
  available: boolean;
  availableVariants: number;
  totalVariants: number;
  skus: string[];
  imageUrl: string | null;
  bggUrl: string | null;
  collectionHandles: string[];
}

type Filter = 'all' | 'available' | 'soldout';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [products, setProducts] = useState<CachedProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load wishlist once
  useEffect(() => {
    fetch('/api/wishlist')
      .then(r => r.json())
      .then(d => setWishlist(new Set(d.wishlist.map((w: { productHandle: string }) => w.productHandle))));
  }, []);

  const runSearch = useCallback(async (q: string, f: Filter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&filter=${f}&limit=200`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotal(data.total ?? 0);
      setLastSyncedAt(data.lastSyncedAt ?? null);
    } catch (err) {
      console.error('Search failed:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load (empty search shows everything)
  useEffect(() => { runSearch('', 'all'); }, [runSearch]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q, filter), 250);
  }

  function handleFilterChange(f: Filter) {
    setFilter(f);
    runSearch(query, f);
  }

  async function toggleWishlist(product: CachedProduct) {
    const wasWishlisted = wishlist.has(product.handle);
    setWishlist(prev => {
      const next = new Set(prev);
      wasWishlisted ? next.delete(product.handle) : next.add(product.handle);
      return next;
    });
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productHandle: product.handle,
        productTitle: product.title,
        vendor: product.vendor,
        price: product.price,
        collectionHandle: product.collectionHandles[product.collectionHandles.length - 1] ?? '',
      }),
    });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-300 text-sm">← Dashboard</Link>
            <h1 className="text-xl font-semibold text-white">Product Search</h1>
          </div>
          {lastSyncedAt && (
            <p className="text-gray-600 text-xs">Cache updated {timeAgo(lastSyncedAt)}</p>
          )}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-64">
            <input
              type="text"
              autoFocus
              placeholder="Search by title, vendor, SKU, tags…"
              value={query}
              onChange={handleQueryChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            {loading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">…</span>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'available', 'soldout'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-2 text-xs rounded-lg capitalize transition-colors ${
                  filter === f ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                }`}
              >
                {f === 'soldout' ? 'sold out' : f}
              </button>
            ))}
          </div>
          {products !== null && (
            <p className="text-gray-600 text-xs ml-auto">
              {total > products.length ? `${products.length} of ${total}` : total} result{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* No cache yet */}
        {products !== null && products.length === 0 && !lastSyncedAt && (
          <div className="p-8 text-center text-gray-600 bg-gray-900 rounded-xl border border-gray-800">
            No product cache yet.{' '}
            <Link href="/" className="text-blue-500 hover:underline">Go to the dashboard and click Check Now.</Link>
          </div>
        )}

        {/* Results */}
        {products !== null && products.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-3 py-3 w-8" />
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collections</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Price</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {products.map(product => {
                  const wishlisted = wishlist.has(product.handle);
                  const hasDiscount = product.compareAtPrice &&
                    parseFloat(product.compareAtPrice) > parseFloat(product.price);
                  const multiVariant = product.totalVariants > 1;

                  return (
                    <tr
                      key={product.handle}
                      className={`hover:bg-gray-800/40 transition-colors ${wishlisted ? 'bg-rose-950/10' : ''} ${!product.available && !wishlisted ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleWishlist(product)}
                          className={`text-lg leading-none transition-colors ${
                            wishlisted ? 'text-rose-400 hover:text-rose-300' : 'text-gray-700 hover:text-gray-400'
                          }`}
                          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          {wishlisted ? '♥' : '♡'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="w-8 h-8 object-cover rounded shrink-0 mt-0.5"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`https://www.boardgamebliss.com/products/${product.handle}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                              >
                                {product.title}
                              </a>
                              {product.bggUrl && (
                                <a
                                  href={product.bggUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-orange-500 hover:text-orange-400 text-xs font-medium shrink-0"
                                  title="BoardGameGeek"
                                >
                                  BGG
                                </a>
                              )}
                            </div>
                            {product.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.tags.slice(0, 4).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-600 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {product.tags.length > 4 && (
                                  <span className="text-xs text-gray-700">+{product.tags.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{product.vendor || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {product.skus[0] || <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {product.collectionHandles.map(h => (
                            <Link
                              key={h}
                              href={`/collections/${h}`}
                              className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-400 hover:text-gray-200 rounded capitalize"
                            >
                              {h.replace(/-/g, ' ')}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        ${parseFloat(product.price).toFixed(2)}
                        {hasDiscount && (
                          <span className="ml-1.5 text-gray-600 line-through text-xs">
                            ${parseFloat(product.compareAtPrice!).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {multiVariant ? (
                          <span className="text-xs text-gray-400">
                            {product.availableVariants}
                            <span className="text-gray-600">/{product.totalVariants}</span>
                          </span>
                        ) : (
                          <span className={`text-xs font-medium ${product.available ? 'text-emerald-400' : 'text-gray-600'}`}>
                            {product.available ? 'in stock' : 'sold out'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {total > products.length && (
              <p className="px-4 py-3 text-xs text-gray-600 border-t border-gray-800">
                Showing {products.length} of {total} — refine your search to narrow results.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
