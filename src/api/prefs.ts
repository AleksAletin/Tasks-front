import { apiClient } from './client';
import type {
  Cfg,
  CustomCol,
  LabelDef,
  LabelField,
  MappingRule,
  Person,
} from '../board/model';
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
  labels: Record<LabelField, LabelDef[]>;
  // Optimistic-concurrency counter from the backend (GET returns it; PUT echoes it back so a
  // stale tab is rejected with 409). Server-managed — never persisted to localStorage.
  version: number;
}

/**
 * Outcome of a `PUT /prefs`: either applied (the new server `version`) or rejected as stale
 * (`server` = the current server payload to merge against and retry).
 */
export type SavePrefsResult =
  | { ok: true; version: number }
  | { ok: false; server: PrefsPayload };

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
export async function savePrefs(
  payload: PrefsPayload,
): Promise<SavePrefsResult> {
  const res = await apiClient.put<{ version?: number } | PrefsPayload>(
    '/prefs',
    payload,
    // 409 = stale version (a concurrent write landed first); handle it, don't throw.
    { validateStatus: (s) => s === 200 || s === 204 || s === 409 },
  );
  if (res.status === 409) {
    return { ok: false, server: res.data as PrefsPayload };
  }
  const body = res.data as { version?: number } | null;
  return {
    ok: true,
    version:
      body && typeof body.version === 'number' ? body.version : payload.version,
  };
}
