import { apiClient } from './client';
import type { Board, Group, Parity } from '../board/model';

/** Payload returned by the backend's `GET /board`, in the prototype's exact shape. */
export interface BoardPayload {
  boards: Board[];
  groups: Group[];
  parity: Parity;
}

/**
 * Fetch the board from the backend adapter (`GET /board`). The response is the 1:1
 * contract shape (see src/board/model.ts), so it maps straight onto the store's
 * `boards` / `groups` / `parity`. Used only when `VITE_USE_BACKEND === 'true'`.
 */
export async function fetchBoard(): Promise<BoardPayload> {
  const { data } = await apiClient.get<BoardPayload>('/board');
  return data;
}

/**
 * Full-replace the board on the backend (`PUT /board`) with the entire current state,
 * in the same `{ boards, groups, parity }` contract shape `fetchBoard` returns. Mirrors
 * the prototype's whole-board persistence: one call covers every mutation. Used only when
 * `VITE_USE_BACKEND === 'true'` (the debounced sync in BoardApp); a no-op otherwise.
 */
export async function saveBoard(payload: BoardPayload): Promise<void> {
  await apiClient.put('/board', payload);
}
