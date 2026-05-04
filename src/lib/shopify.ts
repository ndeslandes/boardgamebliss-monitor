export interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  available: boolean;
  price: string;
  compare_at_price: string | null;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  tags: string | string[];
  updated_at: string;
  body_html: string | null;
  variants: ShopifyVariant[];
  images: { src: string; alt: string | null }[];
}

export interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  published_at: string | null;
  updated_at: string | null;
  products_count: number;
}

const GAP_MS = 1500; // minimum gap between any two Shopify requests (process-wide)

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// Global serialized queue — one Shopify request at a time, GAP_MS between each
let _chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const p = _chain.then(() => task());
  _chain = p.then(() => sleep(GAP_MS), () => sleep(GAP_MS));
  return p;
}

// Raw fetch with in-place retry (no re-enqueue — must be called from inside enqueue)
async function rawFetch(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (res.status === 429) {
    if (attempt >= 2) throw new Error('HTTP 429 — rate limited, try again in a few minutes');
    const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
    await sleep(retryAfter * 1000);
    return rawFetch(url, attempt + 1);
  }
  return res;
}

function shopifyFetch(url: string): Promise<Response> {
  return enqueue(() => rawFetch(url));
}

export async function fetchCollectionProducts(handle: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    const res = await shopifyFetch(
      `https://www.boardgamebliss.com/collections/${handle}/products.json?limit=250&page=${page}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { products } = await res.json();
    all.push(...products);
    if (products.length < 250) break;
    page++;
  }

  return all;
}

export function countAvailability(products: ShopifyProduct[]): { available: number; outOfStock: number } {
  let available = 0;
  let outOfStock = 0;
  for (const p of products) {
    if (p.variants?.some(v => v.available)) available++;
    else outOfStock++;
  }
  return { available, outOfStock };
}

export async function fetchCollectionProductCounts(
  handle: string
): Promise<{ available: number; outOfStock: number }> {
  const products = await fetchCollectionProducts(handle);
  return countAvailability(products);
}

export async function fetchAllCollections(onPage?: (fetched: number) => void): Promise<ShopifyCollection[]> {
  const all: ShopifyCollection[] = [];
  let page = 1;

  while (true) {
    const res = await shopifyFetch(
      `https://www.boardgamebliss.com/collections.json?limit=250&page=${page}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);

    const { collections }: { collections: ShopifyCollection[] } = await res.json();
    all.push(...collections);
    onPage?.(all.length);
    if (collections.length < 250) break;
    page++;
  }

  return all;
}
