export interface StoreConfig {
  id: string;
  name: string;
  baseUrl: string;
  isTracked: (handle: string) => boolean;
}

export const STORES: StoreConfig[] = [
  {
    id: 'boardgamebliss',
    name: 'BoardGameBliss',
    baseUrl: 'https://www.boardgamebliss.com',
    isTracked: h => h.startsWith('restock-') || h.startsWith('new-'),
  },
  {
    id: '401games',
    name: '401 Games',
    baseUrl: 'https://store.401games.ca',
    isTracked: h => h === 'board-game-restocks' || h === 'new-releases',
  },
];

export function getStore(id: string): StoreConfig {
  const store = STORES.find(s => s.id === id);
  if (!store) throw new Error(`Unknown store: "${id}"`);
  return store;
}
