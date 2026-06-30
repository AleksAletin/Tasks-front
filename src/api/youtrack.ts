import { apiClient } from './client';

/** Outcome of «Синхронизировать сейчас» (POST /sync). */
export interface SyncResult {
  checked: number;
  updated: number;
  /** New board tasks created from the discovery query (project/sprint scope). */
  created: number;
  /** YouTrack statuses seen that no «Правила маппинга» rule covers yet. */
  unmapped: string[];
}

/** Pull YouTrack now and return the outcome (checked / updated / unmapped). */
export async function syncNow(): Promise<SyncResult> {
  const { data } = await apiClient.post<SyncResult>('/sync');
  return data;
}

/** «Проверить соединение» — probe the configured YouTrack instance (POST /sync/test). */
export async function testYouTrack(): Promise<boolean> {
  const { data } = await apiClient.post<{ connected: boolean }>('/sync/test');
  return data.connected;
}
