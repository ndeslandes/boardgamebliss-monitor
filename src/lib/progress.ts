export interface SyncProgress {
  phase: 'idle' | 'collections' | 'counts';
  current: number;
  total: number;
  currentHandle: string;
  updatedCount: number;
}

let _state: SyncProgress = { phase: 'idle', current: 0, total: 0, currentHandle: '', updatedCount: 0 };

export function getProgress(): SyncProgress { return { ..._state }; }
export function setProgress(p: Partial<SyncProgress>): void { Object.assign(_state, p); }
export function resetProgress(): void { _state = { phase: 'idle', current: 0, total: 0, currentHandle: '', updatedCount: 0 }; }
