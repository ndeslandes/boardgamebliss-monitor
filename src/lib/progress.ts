export interface SyncProgress {
  phase: 'idle' | 'collections' | 'counts';
  current: number;
  total: number;
  currentHandle: string;
  updatedCount: number;
}

const _states = new Map<string, SyncProgress>();

function defaultState(): SyncProgress {
  return { phase: 'idle', current: 0, total: 0, currentHandle: '', updatedCount: 0 };
}

export function getProgress(storeId: string): SyncProgress {
  return { ...(_states.get(storeId) ?? defaultState()) };
}

export function setProgress(storeId: string, p: Partial<SyncProgress>): void {
  _states.set(storeId, { ...(_states.get(storeId) ?? defaultState()), ...p });
}

export function resetProgress(storeId: string): void {
  _states.set(storeId, defaultState());
}

export function getAllProgress(): Record<string, SyncProgress> {
  const result: Record<string, SyncProgress> = {};
  for (const [id, state] of _states) result[id] = { ...state };
  return result;
}
