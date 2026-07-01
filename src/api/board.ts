import { apiClient } from './client';
import type { Board, Group, Parity } from '../board/model';

/** Payload returned by the backend's `GET /board`, in the prototype's exact shape plus the
 * optimistic-concurrency `version` (server-managed — PUT must send it back unchanged). */
export interface BoardPayload {
  boards: Board[];
  groups: Group[];
  parity: Parity;
  version: number;
}

/**
 * Outcome of a `PUT /board`: either applied (the new server `version`) or rejected as stale
 * (`server` = the current server payload to merge against and retry) — mirrors `savePrefs`.
 */
export type SaveBoardResult =
  | { ok: true; version: number }
  | { ok: false; server: BoardPayload };

/**
 * Fetch the board from the backend adapter (`GET /board`). The response is the 1:1
 * contract shape (see src/board/model.ts), so it maps straight onto the store's
 * `boards` / `groups` / `parity` (+ `boardVersion`). Used only when `VITE_USE_BACKEND === 'true'`.
 */
export async function fetchBoard(): Promise<BoardPayload> {
  const { data } = await apiClient.get<BoardPayload>('/board');
  return data;
}

/**
 * Full-replace the board on the backend (`PUT /board`) with the entire current state,
 * in the same `{ boards, groups, parity, version }` contract shape `fetchBoard` returns. Mirrors
 * the prototype's whole-board persistence: one call covers every mutation. A stale version means
 * another tab or the YouTrack sync moved the board first — the caller merges and retries.
 */
export async function saveBoard(payload: BoardPayload): Promise<SaveBoardResult> {
  const res = await apiClient.put<{ version?: number } | BoardPayload>(
    '/board',
    payload,
    // 409 = stale version (a concurrent write landed first); handle it, don't throw.
    { validateStatus: (s) => s === 200 || s === 204 || s === 409 },
  );
  if (res.status === 409) {
    return { ok: false, server: res.data as BoardPayload };
  }
  const body = res.data as { version?: number } | null;
  return {
    ok: true,
    version:
      body && typeof body.version === 'number' ? body.version : payload.version,
  };
}
