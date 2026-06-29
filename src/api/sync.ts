import { saveBoard } from './board';
import { savePrefs } from './prefs';
import { useBoard } from '../board/store';

/**
 * Debounced backend write-back (active only on the `VITE_USE_BACKEND` path). Mirrors the
 * prototype's whole-state persistence (saveState, debounce): subscribe to the store and, whenever
 * the persisted slices change, debounce a single PUT carrying the entire payload. That covers
 * every mutation — inline edits, parity, drag-and-drop, phases, add/delete, settings, users,
 * custom columns — so no per-mutation endpoints are needed.
 *
 * Two independent write-backs share one subscription:
 *  - the BOARD (`PUT /board`): boards/groups/parity.
 *  - the shared PREFS (`PUT /prefs`): cfg/integrations/autoSync/twoWay/guestLinks/mappingRules/
 *    userOverrides/invites/customCols/colValues/colLabels.
 * Each has its own debounce timer and its own reference-equality gate, so a settings change never
 * triggers a board save (and vice versa).
 *
 * Crucially neither must fire for the initial hydration: `startBackendSync` is called only AFTER
 * `hydrateBoard`/`hydratePrefs` have run, so its subscription never sees the hydration commit. The
 * listener also only schedules a save when one of the relevant slices actually changes identity
 * between successive states, ignoring the many unrelated UI-state updates.
 */
const DEBOUNCE_MS = 600;

let unsubscribe: (() => void) | null = null;
let boardTimer: ReturnType<typeof setTimeout> | null = null;
let prefsTimer: ReturnType<typeof setTimeout> | null = null;

/** Slice the persisted board data the backend owns, in the contract payload shape. */
function boardSnapshot() {
  const s = useBoard.getState();
  return { boards: s.boards, groups: s.groups, parity: s.parity };
}

/** Slice the SHARED prefs the backend owns, in the `/prefs` contract payload shape. */
function prefsSnapshot() {
  const s = useBoard.getState();
  return {
    cfg: s.cfg,
    integrations: s.integrations,
    autoSync: s.autoSync,
    twoWay: s.twoWay,
    guestLinks: s.guestLinks,
    mappingRules: s.mappingRules,
    userOverrides: s.userOverrides,
    invites: s.invites,
    customCols: s.customCols,
    colValues: s.colValues,
    colLabels: s.colLabels,
    labels: s.labels,
  };
}

/**
 * Begin syncing the board + shared prefs to the backend. Idempotent — a second call is a no-op so
 * it's safe under React StrictMode's double-invoke. Returns a disposer that cancels any pending
 * saves and unsubscribes (used by the BoardApp cleanup). Call this only once hydration has
 * completed, so the user's first real edit is the first thing pushed (not the hydrated payload).
 */
export function startBackendSync(): () => void {
  if (unsubscribe) return stopBackendSync;

  // Base zustand subscribe (this store has no subscribeWithSelector middleware): the listener
  // receives (state, prevState), and we compare the persisted slices by reference. set() produces
  // fresh arrays/objects for these only when they change, so reference-equality is the right "did
  // it change?" test and avoids saving on pure UI-state updates.
  unsubscribe = useBoard.subscribe((state, prev) => {
    // Board slices.
    if (
      state.boards !== prev.boards ||
      state.groups !== prev.groups ||
      state.parity !== prev.parity
    ) {
      if (boardTimer) clearTimeout(boardTimer);
      boardTimer = setTimeout(() => {
        boardTimer = null;
        void saveBoard(boardSnapshot()).catch((err) => {
          console.error('[board] backend save failed', err);
        });
      }, DEBOUNCE_MS);
    }

    // Shared prefs slices.
    if (
      state.cfg !== prev.cfg ||
      state.integrations !== prev.integrations ||
      state.autoSync !== prev.autoSync ||
      state.twoWay !== prev.twoWay ||
      state.guestLinks !== prev.guestLinks ||
      state.mappingRules !== prev.mappingRules ||
      state.userOverrides !== prev.userOverrides ||
      state.invites !== prev.invites ||
      state.customCols !== prev.customCols ||
      state.colValues !== prev.colValues ||
      state.colLabels !== prev.colLabels ||
      state.labels !== prev.labels
    ) {
      if (prefsTimer) clearTimeout(prefsTimer);
      prefsTimer = setTimeout(() => {
        prefsTimer = null;
        void savePrefs(prefsSnapshot()).catch((err) => {
          console.error('[prefs] backend save failed', err);
        });
      }, DEBOUNCE_MS);
    }
  });

  return stopBackendSync;
}

/** Cancel any pending saves and stop listening. */
export function stopBackendSync(): void {
  if (boardTimer) {
    clearTimeout(boardTimer);
    boardTimer = null;
  }
  if (prefsTimer) {
    clearTimeout(prefsTimer);
    prefsTimer = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
