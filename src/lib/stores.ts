export interface StoreConfig {
  id: string;
  name: string;
  baseUrl: string;
  /** Lower = shown first in the combined collection list. */
  displayOrder: number;
  isTracked: (handle: string) => boolean;
}

export const STORES: StoreConfig[] = [
  {
    id: '401games',
    name: '401 Games',
    baseUrl: 'https://store.401games.ca',
    displayOrder: 0,
    isTracked: h => h === 'board-game-restocks' || h === 'new-releases',
  },
  {
    id: 'boardgamebliss',
    name: 'BoardGameBliss',
    baseUrl: 'https://www.boardgamebliss.com',
    displayOrder: 1,
    isTracked: h => h.startsWith('restock-') || h.startsWith('new-'),
  },
];

export function getStore(id: string): StoreConfig {
  const store = STORES.find(s => s.id === id);
  if (!store) throw new Error(`Unknown store: "${id}"`);
  return store;
}
