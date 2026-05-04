import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import type { ShopifyProduct, ShopifyVariant } from '../shopify';

let _store: object = { lastSyncedAt: null, byHandle: {} };

const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(_store) as any);
vi.spyOn(fs, 'writeFileSync').mockImplementation((_p: any, data: any) => {
  _store = JSON.parse(data as string);
});
vi.spyOn(fs, 'existsSync').mockReturnValue(true);
vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);

import {
  searchProducts,
  getCollectionProducts,
  upsertCollectionProducts,
  getProductCount,
} from '../products';

const STORE = 'boardgamebliss';

afterEach(() => {
  vi.clearAllMocks();
  readSpy.mockImplementation(() => JSON.stringify(_store) as any);
});

function resetStore(data: object = { lastSyncedAt: null, byHandle: {} }) {
  _store = data;
}

function makeVariant(overrides: Partial<ShopifyVariant> = {}): ShopifyVariant {
  return { id: 101, title: 'Default Title', sku: 'SKU-001', available: true, price: '29.99', compare_at_price: null, ...overrides };
}

function makeProduct(overrides: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    id: 1, handle: 'test-game', title: 'Test Game', vendor: 'CMON', product_type: 'Board Game',
    tags: 'strategy,coop', updated_at: '2024-01-01T00:00:00.000Z', body_html: null,
    images: [], variants: [makeVariant()], ...overrides,
  };
}

describe('read error handling', () => {
  it('returns empty store when file does not exist', () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    readSpy.mockImplementationOnce(() => { throw err; });
    expect(getProductCount(STORE)).toBe(0);
  });

  it('throws when JSON is corrupt', () => {
    readSpy.mockImplementationOnce(() => '{ invalid json' as any);
    expect(() => getProductCount(STORE)).toThrow(SyntaxError);
  });
});

describe('searchProducts', () => {
  beforeEach(() => {
    resetStore();
    upsertCollectionProducts(STORE, 'restock-games', [
      makeProduct({ id: 1, handle: 'dominion', title: 'Dominion', vendor: 'Rio Grande', tags: 'deckbuilder,classic', variants: [makeVariant({ available: true, price: '44.99', sku: 'DOM-001' })] }),
      makeProduct({ id: 2, handle: 'spirit-island', title: 'Spirit Island', vendor: 'Greater Than Games', tags: 'coop,heavy', variants: [makeVariant({ available: false, price: '79.99', sku: 'SI-001' })] }),
      makeProduct({ id: 3, handle: 'wingspan', title: 'Wingspan', vendor: 'Stonemaier', tags: 'engine-building,birds', variants: [makeVariant({ available: true, price: '59.99', sku: 'WS-001' })] }),
    ]);
  });

  it('returns all products with empty query', () => {
    const { products, total } = searchProducts(STORE, '');
    expect(total).toBe(3);
    expect(products).toHaveLength(3);
  });

  it('filters by title (case insensitive)', () => {
    const { products } = searchProducts(STORE, 'dominion');
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('dominion');
  });

  it('filters by vendor', () => {
    const { products } = searchProducts(STORE, 'stonemaier');
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('wingspan');
  });

  it('filters by SKU', () => {
    const { products } = searchProducts(STORE, 'SI-001');
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('spirit-island');
  });

  it('filters by tag', () => {
    const { products } = searchProducts(STORE, 'deckbuilder');
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('dominion');
  });

  it('filter=available returns only in-stock products', () => {
    const { products, total } = searchProducts(STORE, '', 'available');
    expect(products.every(p => p.available)).toBe(true);
    expect(total).toBe(2);
  });

  it('filter=soldout returns only out-of-stock products', () => {
    const { products, total } = searchProducts(STORE, '', 'soldout');
    expect(products.every(p => !p.available)).toBe(true);
    expect(total).toBe(1);
    expect(products[0].handle).toBe('spirit-island');
  });

  it('respects limit', () => {
    const { products, total } = searchProducts(STORE, '', 'all', 2);
    expect(products).toHaveLength(2);
    expect(total).toBe(3);
  });

  it('sorts available products before sold-out', () => {
    const { products } = searchProducts(STORE, '');
    const firstSoldOut = products.findIndex(p => !p.available);
    const lastAvailable = products.map(p => p.available).lastIndexOf(true);
    expect(lastAvailable).toBeLessThan(firstSoldOut);
  });
});

describe('getCollectionProducts', () => {
  beforeEach(() => {
    resetStore();
    upsertCollectionProducts(STORE, 'restock-games', [makeProduct({ id: 1, handle: 'dominion', title: 'Dominion' })]);
    upsertCollectionProducts(STORE, 'new-arrivals', [makeProduct({ id: 2, handle: 'wingspan', title: 'Wingspan' })]);
  });

  it('returns only products in the specified collection', () => {
    const products = getCollectionProducts(STORE, 'restock-games');
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('dominion');
  });

  it('returns empty array for unknown collection', () => {
    expect(getCollectionProducts(STORE, 'nonexistent')).toEqual([]);
  });
});

describe('upsertCollectionProducts', () => {
  beforeEach(() => resetStore());

  it('stores product fields correctly', () => {
    upsertCollectionProducts(STORE, 'restock-games', [makeProduct({
      handle: 'dominion', title: 'Dominion', vendor: 'Rio Grande', product_type: 'Card Game',
      tags: 'deckbuilder,classic',
      variants: [makeVariant({ available: true, price: '44.99', sku: 'DOM-001', compare_at_price: '54.99' })],
    })]);
    const { products } = searchProducts(STORE, 'Dominion');
    expect(products[0]).toMatchObject({
      handle: 'dominion', title: 'Dominion', vendor: 'Rio Grande', productType: 'Card Game',
      available: true, price: '44.99', compareAtPrice: '54.99', skus: ['DOM-001'],
    });
    expect(products[0].tags).toEqual(['deckbuilder', 'classic']);
  });

  it('merges collectionHandles when product appears in multiple collections', () => {
    const product = makeProduct({ id: 1, handle: 'sole-product', title: 'Sole Product' });
    upsertCollectionProducts(STORE, 'restock-games', [product]);
    upsertCollectionProducts(STORE, 'new-arrivals', [product]);
    const { products } = searchProducts(STORE, 'Sole Product');
    expect(products[0].collectionHandles).toContain('restock-games');
    expect(products[0].collectionHandles).toContain('new-arrivals');
    expect(products[0].collectionHandles).toHaveLength(2);
  });

  it('does not duplicate collectionHandle on re-upsert', () => {
    const product = makeProduct({ id: 1, handle: 'sole-product', title: 'Sole Product' });
    upsertCollectionProducts(STORE, 'restock-games', [product]);
    upsertCollectionProducts(STORE, 'restock-games', [product]);
    const { products } = searchProducts(STORE, 'Sole Product');
    expect(products[0].collectionHandles).toHaveLength(1);
  });

  it('parses BGG URL from body_html', () => {
    upsertCollectionProducts(STORE, 'restock-games', [makeProduct({
      body_html: '<div id="bgg-url" style="display: none;">291453/scout</div>',
    })]);
    const { products } = searchProducts(STORE, '');
    expect(products[0].bggUrl).toBe('https://boardgamegeek.com/boardgame/291453/scout');
  });

  it('parses comma-separated tags string', () => {
    upsertCollectionProducts(STORE, 'restock-games', [makeProduct({ tags: 'tag1, tag2, tag3' })]);
    const { products } = searchProducts(STORE, '');
    expect(products[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('handles array tags', () => {
    upsertCollectionProducts(STORE, 'restock-games', [makeProduct({ tags: ['alpha', 'beta'] })]);
    const { products } = searchProducts(STORE, '');
    expect(products[0].tags).toEqual(['alpha', 'beta']);
  });
});

describe('getProductCount', () => {
  it('returns 0 for empty store', () => {
    resetStore();
    expect(getProductCount(STORE)).toBe(0);
  });

  it('returns correct count after upsert', () => {
    resetStore();
    upsertCollectionProducts(STORE, 'restock-games', [
      makeProduct({ id: 1, handle: 'game-a' }),
      makeProduct({ id: 2, handle: 'game-b' }),
    ]);
    expect(getProductCount(STORE)).toBe(2);
  });
});
