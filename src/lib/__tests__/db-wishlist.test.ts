import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

let _wishlist: object = [];

const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(_wishlist) as any);
vi.spyOn(fs, 'writeFileSync').mockImplementation((_p: any, data: any) => {
  _wishlist = JSON.parse(data as string);
});
vi.spyOn(fs, 'existsSync').mockReturnValue(true);
vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);

import { getWishlist, toggleWishlist, type WishlistItem } from '../db-wishlist';

afterEach(() => {
  vi.clearAllMocks();
  readSpy.mockImplementation(() => JSON.stringify(_wishlist) as any);
});

function resetWishlist(items: WishlistItem[] = []) {
  _wishlist = items;
}

function makeItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    storeId: 'boardgamebliss',
    productHandle: 'test-game',
    productTitle: 'Test Game',
    vendor: 'Test Vendor',
    price: '29.99',
    collectionHandle: 'restock-games',
    addedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('readWishlist error handling', () => {
  it('returns empty array when file does not exist', () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    readSpy.mockImplementationOnce(() => { throw err; });
    expect(getWishlist()).toEqual([]);
  });

  it('throws when JSON is corrupt', () => {
    readSpy.mockImplementationOnce(() => '{ broken' as any);
    expect(() => getWishlist()).toThrow(SyntaxError);
  });
});

describe('toggleWishlist', () => {
  beforeEach(() => resetWishlist());

  it('adds an item and returns true', () => {
    const item = { storeId: 'boardgamebliss', productHandle: 'dominion', productTitle: 'Dominion', vendor: 'Rio Grande', price: '44.99', collectionHandle: 'restock-games' };
    expect(toggleWishlist(item)).toBe(true);
    const wishlist = getWishlist();
    expect(wishlist).toHaveLength(1);
    expect(wishlist[0].productHandle).toBe('dominion');
    expect(wishlist[0].addedAt).toBeTruthy();
  });

  it('removes an existing item and returns false', () => {
    resetWishlist([makeItem()]);
    const item = { storeId: 'boardgamebliss', productHandle: 'test-game', productTitle: 'Test Game', vendor: 'Test Vendor', price: '29.99', collectionHandle: 'restock-games' };
    expect(toggleWishlist(item)).toBe(false);
    expect(getWishlist()).toHaveLength(0);
  });

  it('is idempotent: toggling twice restores original state', () => {
    const item = { storeId: 'boardgamebliss', productHandle: 'dominion', productTitle: 'Dominion', vendor: 'Rio Grande', price: '44.99', collectionHandle: 'restock-games' };
    toggleWishlist(item);
    toggleWishlist(item);
    expect(getWishlist()).toHaveLength(0);
  });

  it('treats same handle from different stores as distinct items', () => {
    const bgb = { storeId: 'boardgamebliss', productHandle: 'wingspan', productTitle: 'Wingspan', vendor: 'Stonemaier', price: '59.99', collectionHandle: 'restock-games' };
    const g401 = { storeId: '401games', productHandle: 'wingspan', productTitle: 'Wingspan', vendor: 'Stonemaier', price: '62.99', collectionHandle: 'new-releases' };
    toggleWishlist(bgb);
    toggleWishlist(g401);
    expect(getWishlist()).toHaveLength(2);
  });

  it('removes only the matching store+handle, not both', () => {
    resetWishlist([makeItem({ storeId: 'boardgamebliss', productHandle: 'wingspan' }), makeItem({ storeId: '401games', productHandle: 'wingspan' })]);
    toggleWishlist({ storeId: 'boardgamebliss', productHandle: 'wingspan', productTitle: 'Wingspan', vendor: 'Stonemaier', price: '59.99', collectionHandle: 'restock-games' });
    expect(getWishlist()).toHaveLength(1);
    expect(getWishlist()[0].storeId).toBe('401games');
  });
});

describe('getWishlist', () => {
  it('returns items sorted by addedAt descending', () => {
    resetWishlist([
      makeItem({ productHandle: 'a', addedAt: '2024-01-01T00:00:00.000Z' }),
      makeItem({ productHandle: 'c', addedAt: '2024-01-03T00:00:00.000Z' }),
      makeItem({ productHandle: 'b', addedAt: '2024-01-02T00:00:00.000Z' }),
    ]);
    const result = getWishlist();
    expect(result.map(w => w.productHandle)).toEqual(['c', 'b', 'a']);
  });
});
