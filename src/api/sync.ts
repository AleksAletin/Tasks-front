import { saveBoard } from './board';
import { useBoard } from '../board/store';

/**
 * Debounced backend write-back (active only on the `VITE_USE_BACKEND` path). Mirrors the
 * prototype's whole-board persistence (saveState, 400ms debounce): subscribe to the store and,
 * whenever `boards` / `groups` / `parity` change, debounce a single `PUT /board` carrying the
 * entire board. That one mechanism covers every mutation — inline edits, parity, drag-and-drop,
 * phases, add/delete — so no per-mutation endpoints are needed.
 *
 * Crucially this must NOT fire for the initial hydration: `startBackendSync` is called only
 * AFTER `hydrateBoard` has run, so its subscription never sees the hydration commit. The
 * listener also only schedules a save when one of boards/groups/parity actually changes
 * identity between successive states, ignoring the many unrelated UI-state updates.
 */
const DEBOUNCE_MS = 600;

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Slice the persisted board data the backend owns, in the contract payload shape. */
function snapshot() {
  const s = useBoard.getState();
  return { boards: s.boards, groups: s.groups, parity: s.parity };
}

/**
 * Begin syncing the board to the backend. Idempotent — a second call is a no-op so it's safe
 * under React StrictMode's double-invoke. Returns a disposer that cancels any pending save and
 * unsubscribes (used by the BoardApp cleanup). Call this only once hydration has completed, so
 * the user's first real edit is the first thing pushed (not the hydrated payload).
 */
export function startBackendSync(): () => void {
  if (unsubscribe) return stopBackendSync;

  // Base zustand subscribe (this store has no subscribeWithSelector middleware): the listener
  // receives (state, prevState), and we compare the three persisted slices by reference. set()
  // produces fresh arrays/objects for these only when they change, so reference-equality is the
  // right "did the board change?" test and avoids saving on pure UI-state updates.
  unsubscribe = useBoard.subscribe((state, prev) => {
    if (
      state.boards === prev.boards &&
      state.groups === prev.groups &&
      state.parity === prev.parity
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void saveBoard(snapshot()).catch((err) => {
        console.error('[board] backend save failed', err);
      });
    }, DEBOUNCE_MS);
  });

  return stopBackendSync;
}

/** Cancel any pending save and stop listening. */
export function stopBackendSync(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
