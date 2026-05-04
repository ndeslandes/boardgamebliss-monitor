import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

let _store: object = { collections: [], polls: [] };

const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => JSON.stringify(_store) as any);
vi.spyOn(fs, 'writeFileSync').mockImplementation((_p: any, data: any) => {
  _store = JSON.parse(data as string);
});
vi.spyOn(fs, 'existsSync').mockReturnValue(true);
vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);

import {
  getTrackedCollections,
  getNewUntracked,
  getPollHistory,
  upsertCollections,
  batchUpdateProductCounts,
  addPoll,
  markAllSeen,
  type StoredCollection,
  type PollEntry,
} from '../db';

const STORE = 'boardgamebliss';

afterEach(() => {
  vi.clearAllMocks();
  readSpy.mockImplementation(() => JSON.stringify(_store) as any);
});

function resetStore(data: object = { collections: [], polls: [] }) {
  _store = data;
}

function makeCollection(overrides: Partial<Omit<StoredCollection, 'firstSeenAt' | 'isNew' | 'availableCount' | 'outOfStockCount' | 'countsUpdatedAt'>> = {}) {
  return {
    shopifyId: 1,
    handle: 'test-collection',
    title: 'Test Collection',
    description: '',
    productsCount: 5,
    publishedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    lastSeenAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStoredCollection(overrides: Partial<StoredCollection> = {}): StoredCollection {
  return {
    shopifyId: 1,
    handle: 'test-collection',
    title: 'Test Collection',
    description: '',
    productsCount: 5,
    availableCount: null,
    outOfStockCount: null,
    countsUpdatedAt: null,
    publishedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    firstSeenAt: '2024-01-01T00:00:00.000Z',
    lastSeenAt: '2024-01-01T00:00:00.000Z',
    isNew: false,
    ...overrides,
  };
}

describe('readStoreData error handling', () => {
  beforeEach(() => resetStore());

  it('returns empty store when file does not exist', () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' });
    readSpy.mockImplementationOnce(() => { throw err; });
    expect(getTrackedCollections(STORE)).toEqual([]);
  });

  it('throws when JSON is corrupt', () => {
    readSpy.mockImplementationOnce(() => 'not valid json {{ ]]' as any);
    expect(() => getTrackedCollections(STORE)).toThrow(SyntaxError);
  });
});

describe('getTrackedCollections', () => {
  beforeEach(() => resetStore({
    collections: [
      makeStoredCollection({ shopifyId: 1, handle: 'restock-games', publishedAt: '2024-01-01T00:00:00.000Z' }),
      makeStoredCollection({ shopifyId: 2, handle: 'untracked-stuff', publishedAt: '2024-01-02T00:00:00.000Z' }),
      makeStoredCollection({ shopifyId: 3, handle: 'new-arrivals', publishedAt: '2024-01-03T00:00:00.000Z' }),
    ],
    polls: [],
  }));

  it('returns only restock- and new- collections for boardgamebliss', () => {
    const result = getTrackedCollections(STORE);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.handle)).toContain('restock-games');
    expect(result.map(c => c.handle)).toContain('new-arrivals');
    expect(result.map(c => c.handle)).not.toContain('untracked-stuff');
  });

  it('sorts by publishedAt descending', () => {
    const result = getTrackedCollections(STORE);
    expect(result[0].handle).toBe('new-arrivals');
    expect(result[1].handle).toBe('restock-games');
  });

  it('falls back to firstSeenAt when publishedAt is null', () => {
    resetStore({
      collections: [
        makeStoredCollection({ shopifyId: 1, handle: 'restock-a', publishedAt: null, firstSeenAt: '2024-01-01T00:00:00.000Z' }),
        makeStoredCollection({ shopifyId: 2, handle: 'restock-b', publishedAt: null, firstSeenAt: '2024-01-03T00:00:00.000Z' }),
      ],
      polls: [],
    });
    const result = getTrackedCollections(STORE);
    expect(result[0].handle).toBe('restock-b');
  });

  it('uses exact handle matching for 401games', () => {
    resetStore({
      collections: [
        makeStoredCollection({ shopifyId: 1, handle: 'board-game-restocks' }),
        makeStoredCollection({ shopifyId: 2, handle: 'new-releases' }),
        makeStoredCollection({ shopifyId: 3, handle: 'other-collection' }),
      ],
      polls: [],
    });
    const result = getTrackedCollections('401games');
    expect(result).toHaveLength(2);
    expect(result.map(c => c.handle)).toContain('board-game-restocks');
    expect(result.map(c => c.handle)).toContain('new-releases');
  });
});

describe('getNewUntracked', () => {
  beforeEach(() => resetStore({
    collections: [
      makeStoredCollection({ shopifyId: 1, handle: 'restock-games', isNew: true }),
      makeStoredCollection({ shopifyId: 2, handle: 'other-collection', isNew: true }),
      makeStoredCollection({ shopifyId: 3, handle: 'seen-collection', isNew: false }),
    ],
    polls: [],
  }));

  it('returns only isNew collections that are not tracked', () => {
    const result = getNewUntracked(STORE);
    expect(result).toHaveLength(1);
    expect(result[0].handle).toBe('other-collection');
  });
});

describe('getPollHistory', () => {
  const polls: PollEntry[] = [
    { polledAt: '2024-01-01T00:00:00.000Z', totalCollections: 100, newCollections: 0, status: 'success' },
    { polledAt: '2024-01-02T00:00:00.000Z', totalCollections: 101, newCollections: 1, status: 'success' },
    { polledAt: '2024-01-03T00:00:00.000Z', totalCollections: 102, newCollections: 0, status: 'error', errorMessage: 'timeout' },
  ];

  beforeEach(() => resetStore({ collections: [], polls }));

  it('returns polls in reverse chronological order', () => {
    const result = getPollHistory(STORE);
    expect(result[0].polledAt).toBe('2024-01-03T00:00:00.000Z');
    expect(result[2].polledAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('respects the limit parameter', () => {
    expect(getPollHistory(STORE, 2)).toHaveLength(2);
  });
});

describe('upsertCollections', () => {
  it('adds collections with isNew=false on first run (empty store)', () => {
    resetStore({ collections: [], polls: [] });
    const count = upsertCollections(STORE, [makeCollection({ shopifyId: 1, handle: 'restock-games' })]);
    expect(count).toBe(0);
    expect(getTrackedCollections(STORE)[0].isNew).toBe(false);
  });

  it('marks new collections isNew=true on subsequent runs', () => {
    resetStore({
      collections: [makeStoredCollection({ shopifyId: 1, handle: 'restock-existing' })],
      polls: [],
    });
    const count = upsertCollections(STORE, [
      makeCollection({ shopifyId: 1, handle: 'restock-existing' }),
      makeCollection({ shopifyId: 2, handle: 'new-brand-new' }),
    ]);
    expect(count).toBe(1);
    const collections = getTrackedCollections(STORE);
    expect(collections.find(c => c.handle === 'new-brand-new')?.isNew).toBe(true);
    expect(collections.find(c => c.handle === 'restock-existing')?.isNew).toBe(false);
  });

  it('updates productsCount for existing collections', () => {
    resetStore({
      collections: [makeStoredCollection({ shopifyId: 1, handle: 'restock-games', productsCount: 5 })],
      polls: [],
    });
    upsertCollections(STORE, [makeCollection({ shopifyId: 1, handle: 'restock-games', productsCount: 10 })]);
    expect(getTrackedCollections(STORE)[0].productsCount).toBe(10);
  });
});

describe('batchUpdateProductCounts', () => {
  beforeEach(() => resetStore({
    collections: [
      makeStoredCollection({ shopifyId: 1, handle: 'restock-a', availableCount: null, outOfStockCount: null }),
      makeStoredCollection({ shopifyId: 2, handle: 'restock-b', availableCount: 3, outOfStockCount: 2 }),
    ],
    polls: [],
  }));

  it('updates available and out-of-stock counts', () => {
    batchUpdateProductCounts(STORE, [{ shopifyId: 1, available: 5, outOfStock: 3 }]);
    const col = getTrackedCollections(STORE).find(c => c.shopifyId === 1)!;
    expect(col.availableCount).toBe(5);
    expect(col.outOfStockCount).toBe(3);
  });

  it('returns count of collections that actually changed', () => {
    const changed = batchUpdateProductCounts(STORE, [
      { shopifyId: 1, available: 5, outOfStock: 3 },
      { shopifyId: 2, available: 3, outOfStock: 2 },
    ]);
    expect(changed).toBe(1);
  });

  it('ignores unknown shopifyIds', () => {
    expect(batchUpdateProductCounts(STORE, [{ shopifyId: 999, available: 1, outOfStock: 0 }])).toBe(0);
  });
});

describe('markAllSeen', () => {
  beforeEach(() => resetStore({
    collections: [
      makeStoredCollection({ shopifyId: 1, isNew: true }),
      makeStoredCollection({ shopifyId: 2, handle: 'new-game', isNew: true }),
    ],
    polls: [],
  }));

  it('sets isNew=false for all collections', () => {
    markAllSeen(STORE);
    const all = [...getTrackedCollections(STORE), ...getNewUntracked(STORE)];
    expect(all.every(c => !c.isNew)).toBe(true);
  });
});

describe('addPoll', () => {
  beforeEach(() => resetStore({ collections: [], polls: [] }));

  it('appends a poll entry', () => {
    addPoll(STORE, { polledAt: '2024-01-01T00:00:00.000Z', totalCollections: 50, newCollections: 2, status: 'success' });
    expect(getPollHistory(STORE)).toHaveLength(1);
  });

  it('caps poll history at 100 entries', () => {
    const polls = Array.from({ length: 105 }, (_, i) => ({
      polledAt: new Date(i * 1000).toISOString(),
      totalCollections: i,
      newCollections: 0,
      status: 'success' as const,
    }));
    resetStore({ collections: [], polls });
    addPoll(STORE, { polledAt: new Date().toISOString(), totalCollections: 200, newCollections: 0, status: 'success' });
    expect(getPollHistory(STORE, 200)).toHaveLength(100);
  });
});
