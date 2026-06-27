import { apiClient } from './client';
import type { Cfg, CustomCol, MappingRule, Person } from '../board/model';
import type { UserOverride } from '../board/store';

/**
 * Payload exchanged with the backend's `/prefs` adapter, in the SPA's exact shape — the SHARED
 * store slices that are NOT the board (boards/groups/parity go via `/board`) and NOT the personal
 * UI-only prefs (dark, filters, sort, groupBy, collapsed, activeBoardId stay local). Mirrors the
 * board adapter's `BoardPayload`.
 */
export interface PrefsPayload {
  cfg: Cfg;
  integrations: { ytrack: boolean; email: boolean };
  autoSync: boolean;
  twoWay: boolean;
  guestLinks: boolean;
  mappingRules: MappingRule[];
  userOverrides: Record<string, UserOverride>;
  invites: Person[];
  customCols: CustomCol[];
  colValues: Record<string, unknown>;
  colLabels: Record<string, string>;
}

/**
 * Fetch the shared workspace prefs (`GET /prefs`). The response is the 1:1 contract shape, so it
 * maps straight onto the store's 11 shared slices. Used only when `VITE_USE_BACKEND === 'true'`.
 */
export async function fetchPrefs(): Promise<PrefsPayload> {
  const { data } = await apiClient.get<PrefsPayload>('/prefs');
  return data;
}

/**
 * Replace the shared prefs on the backend (`PUT /prefs`) with the entire current prefs state, in
 * the same shape `fetchPrefs` returns. Mirrors the prototype's whole-state persistence: one call
 * covers every prefs mutation. Used only when `VITE_USE_BACKEND === 'true'` (the debounced sync in
 * BoardApp); a no-op otherwise.
 */
export async function savePrefs(payload: PrefsPayload): Promise<void> {
  await apiClient.put('/prefs', payload);
}
