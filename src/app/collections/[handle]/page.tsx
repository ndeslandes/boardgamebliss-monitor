'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { CachedProduct, CachedVariant } from '@/lib/products';

type SortKey = 'status' | 'title' | 'price' | 'vendor' | 'wishlist';
type Filter = 'all' | 'available' | 'soldout' | 'wishlist';

function lowestPrice(p: CachedProduct) {
  if (p.variants.length === 0) return parseFloat(p.price);
  return Math.min(...p.variants.map(v => parseFloat(v.price)));
}

function HeartButton({ wishlisted, onClick }: { wishlisted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`text-lg leading-none transition-colors ${
        wishlisted ? 'text-rose-400 hover:text-rose-300' : 'text-gray-700 hover:text-gray-400'
      }`}
      title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {wishlisted ? '♥' : '♡'}
    </button>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CollectionPage({ params }: { params: { handle: string } }) {
  const [products, setProducts] = useState<CachedProduct[] | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('status');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/collection-products/${params.handle}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setProducts(d.products);
        if (d.products.length > 0) setCachedAt(d.products[0].cachedAt ?? null);
      })
      .catch(e => setError(e.message));

    fetch('/api/wishlist')
      .then(r => r.json())
      .then(d => setWishlist(new Set(d.wishlist.map((w: { productHandle: string }) => w.productHandle))));
  }, [params.handle]);

  const toggleWishlist = useCallback(async (product: CachedProduct) => {
    const handle = product.handle;
    const wasWishlisted = wishlist.has(handle);
    setWishlist(prev => {
      const next = new Set(prev);
      wasWishlisted ? next.delete(handle) : next.add(handle);
      return next;
    });
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productHandle: handle,
        productTitle: product.title,
        vendor: product.vendor,
        price: product.price,
        collectionHandle: params.handle,
      }),
    });
  }, [wishlist, params.handle]);

  const displayed = useMemo(() => {
    if (!products) return [];
    let list = products;

    if (filter === 'available') list = list.filter(p => p.available);
    else if (filter === 'soldout') list = list.filter(p => !p.available);
    else if (filter === 'wishlist') list = list.filter(p => wishlist.has(p.handle));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        p.variants.some(v => v.sku?.toLowerCase().includes(q)) ||
        p.tags.join(' ').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'wishlist') {
        const aw = wishlist.has(a.handle);
        const bw = wishlist.has(b.handle);
        if (aw !== bw) return bw ? 1 : -1;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'status') {
        if (a.available !== b.available) return b.available ? 1 : -1;
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'price') return lowestPrice(a) - lowestPrice(b);
      if (sortBy === 'vendor') return a.vendor.localeCompare(b.vendor);
      return 0;
    });
  }, [products, sortBy, filter, search, wishlist]);

  const stats = useMemo(() => {
    if (!products) return null;
    const avail = products.filter(p => p.available).length;
    return { avail, oos: products.length - avail, total: products.length, wishlisted: wishlist.size };
  }, [products, wishlist]);

  const title = params.handle.replace(/-/g, ' ');

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="mb-6">
          <Link href="/" className="text-gray-600 hover:text-gray-300 text-sm">← Dashboard</Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white capitalize">{title}</h1>
            {stats && (
              <p className="text-sm mt-1 space-x-1.5">
                <span className="text-emerald-400">{stats.avail} available</span>
                <span className="text-gray-600">&middot;</span>
                <span className="text-gray-500">{stats.oos} sold out</span>
                <span className="text-gray-600">&middot;</span>
                <span className="text-gray-600">{stats.total} total</span>
                {stats.wishlisted > 0 && (
                  <>
                    <span className="text-gray-600">&middot;</span>
                    <span className="text-rose-400">♥ {stats.wishlisted} wishlisted</span>
                  </>
                )}
                {cachedAt && (
                  <>
                    <span className="text-gray-600">&middot;</span>
                    <span className="text-gray-700 text-xs">cached {timeAgo(cachedAt)}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <a
            href={`https://www.boardgamebliss.com/collections/${params.handle}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View on site ↗
          </a>
        </div>

        {products && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search title, SKU, vendor, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 w-64"
            />
            <div className="flex gap-1">
              {(['all', 'available', 'soldout', 'wishlist'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                    filter === f ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f === 'soldout' ? 'sold out' : f === 'wishlist' ? '♥ wishlist' : f}
                </button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              <span className="text-gray-600 text-xs self-center mr-1">sort:</span>
              {(['status', 'title', 'price', 'vendor', 'wishlist'] as SortKey[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg capitalize transition-colors ${
                    sortBy === s ? 'bg-gray-700 text-white' : 'bg-gray-900 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {s === 'wishlist' ? '♥' : s}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">Failed to load: {error}</p>}
        {!products && !error && <p className="text-gray-600 text-sm">Loading {params.handle}…</p>}

        {products !== null && products.length === 0 && (
          <div className="p-8 text-center text-gray-600 bg-gray-900 rounded-xl border border-gray-800">
            No cached products yet.{' '}
            <Link href="/" className="text-blue-500 hover:underline">Go to dashboard and click Check Now.</Link>
          </div>
        )}

        {displayed.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-3 py-3 w-8" />
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SKU</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Price</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {displayed.map(product => {
                  const multiVariant = product.variants.length > 1;
                  const wishlisted = wishlist.has(product.handle);
                  const hasDiscount = product.compareAtPrice &&
                    parseFloat(product.compareAtPrice) > parseFloat(product.price);

                  return [
                    <tr
                      key={product.handle}
                      className={`hover:bg-gray-800/40 transition-colors ${wishlisted ? 'bg-rose-950/10' : ''} ${!product.available && !wishlisted ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-3 text-center">
                        <HeartButton wishlisted={wishlisted} onClick={() => toggleWishlist(product)} />
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
                                {product.tags.slice(0, 5).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-800 text-gray-500 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {product.tags.length > 5 && (
                                  <span className="text-xs text-gray-700">+{product.tags.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {multiVariant ? <span className="text-gray-700">—</span> : (product.skus[0] || <span className="text-gray-700">—</span>)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{product.vendor || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{product.productType || <span className="text-gray-700">—</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-300 whitespace-nowrap">
                        {multiVariant ? (
                          <span className="text-gray-500 text-xs">
                            from ${lowestPrice(product).toFixed(2)}
                          </span>
                        ) : (
                          <>
                            <span>${parseFloat(product.price).toFixed(2)}</span>
                            {hasDiscount && (
                              <span className="ml-1.5 text-gray-600 line-through text-xs">
                                ${parseFloat(product.compareAtPrice!).toFixed(2)}
                              </span>
                            )}
                          </>
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
                    </tr>,
                    multiVariant && product.variants.map((v: CachedVariant) => (
                      <tr
                        key={v.id}
                        className={`bg-gray-950/60 text-xs ${!v.available ? 'opacity-40' : ''}`}
                      >
                        <td className="px-3 py-2" />
                        <td className="px-4 py-2 pl-14 text-gray-400">{v.title}</td>
                        <td className="px-4 py-2 font-mono text-gray-600">{v.sku || '—'}</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right text-gray-400">
                          ${parseFloat(v.price).toFixed(2)}
                          {v.compareAtPrice && parseFloat(v.compareAtPrice) > parseFloat(v.price) && (
                            <span className="ml-1.5 text-gray-600 line-through">${parseFloat(v.compareAtPrice).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={v.available ? 'text-emerald-400' : 'text-gray-600'}>
                            {v.available ? 'in stock' : 'sold out'}
                          </span>
                        </td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}

        {products && displayed.length === 0 && products.length > 0 && (
          <p className="text-gray-600 text-sm">No products match.</p>
        )}
      </div>
    </main>
  );
}
