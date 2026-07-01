import { apiClient } from './client';

/** Outcome of «Синхронизировать сейчас» (POST /sync). */
export interface SyncResult {
  checked: number;
  updated: number;
  /** New board tasks created from the discovery query (project/sprint scope). */
  created: number;
  /** YouTrack statuses seen that no «Правила маппинга» rule covers yet. */
  unmapped: string[];
  /** True when the sync refused to run because the YouTrack toggle is off. */
  disabled?: boolean;
  /** Non-fatal honesty note, e.g. the discovery scope hit the search cap. */
  warning?: string | null;
}

/** Sync status (GET /sync/state): last run + persisted unmapped statuses + toggle/interval. */
export interface SyncState {
  lastRunAt: string | null;
  unmapped: string[];
  enabled: boolean;
  intervalMinutes: number;
}

/** Pull YouTrack now and return the outcome (checked / updated / unmapped). */
export async function syncNow(): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>('/sync');
  return data;
}

/** Fetch the persisted sync status — the mapping editor surfaces `unmapped` from here. */
export async function getSyncState(): Promise<SyncState> {
  const { data } = await apiClient.get<SyncState>('/sync/state');
  return data;
}

/** «Проверить соединение» — probe the configured YouTrack instance (POST /sync/test). */
export async function testYouTrack(): Promise<boolean> {
  const { data } = await apiClient.post<{ connected: boolean }>('/sync/test');
  return data.connected;
}
