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
