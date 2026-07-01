// Conflict merge for the /board full-replace (the 409 path) — the board analogue of mergePrefs,
// at ENTITY granularity: start from the server's current board (so another tab's / the YouTrack
// sync's work is kept) and overlay only what THIS tab changed since its baseline (so the local
// edit is kept too). Local wins on a same-entity conflict, deletions stick both ways.
import type { BoardPayload } from './board';
import type { Group, Task } from '../board/model';

const json = (v: unknown) => JSON.stringify(v);

// A group's own props, excluding its tasks (tasks merge separately, per-task).
const shellOf = (g: Group): Omit<Group, 'tasks'> => {
  const shell = { ...g } as Partial<Group>;
  delete shell.tasks;
  return shell as Omit<Group, 'tasks'>;
};

interface TaskRef {
  task: Task;
  groupId: string;
}

const indexTasks = (groups: Group[]): Map<string, TaskRef> => {
  const map = new Map<string, TaskRef>();
  for (const g of groups) {
    for (const t of g.tasks) {
      map.set(t.id, { task: t, groupId: g.id });
    }
  }
  return map;
};

/**
 * Build the retry payload after a 409. `baseline` = this tab's board as of its last successful
 * sync/hydrate (null = treat everything local as changed), `local` = what this tab tried to save,
 * `server` = the current server board from the 409 body. Carries the server's version so the
 * retry is accepted.
 */
export function mergeBoards(
  baseline: BoardPayload | null,
  local: BoardPayload,
  server: BoardPayload,
): BoardPayload {
  const merged: BoardPayload = structuredClone({
    boards: server.boards,
    groups: server.groups,
    parity: server.parity,
    version: server.version,
  });

  const baseGroups = new Map((baseline?.groups ?? []).map((g) => [g.id, g]));
  const mergedGroups = new Map(merged.groups.map((g) => [g.id, g]));

  // --- Group shells (name/color/boardId) + group add/delete ---
  // Groups brought over wholesale (tasks included) — their tasks skip the per-task pass.
  const broughtWholesale = new Set<string>();
  for (const lg of local.groups) {
    const bg = baseGroups.get(lg.id);
    if (!bg && !mergedGroups.has(lg.id)) {
      // Added locally → bring it over wholesale (its tasks come with it).
      const clone = structuredClone(lg);
      merged.groups.push(clone);
      mergedGroups.set(lg.id, clone);
      broughtWholesale.add(lg.id);
      continue;
    }
    const mg = mergedGroups.get(lg.id);
    // No baseline → treat every local shell as changed (local overlays wholesale).
    if (mg && (!bg || json(shellOf(lg)) !== json(shellOf(bg)))) {
      Object.assign(mg, structuredClone(shellOf(lg)));
    }
  }
  if (baseline) {
    const localGroupIds = new Set(local.groups.map((g) => g.id));
    for (const bg of baseline.groups) {
      if (!localGroupIds.has(bg.id) && mergedGroups.has(bg.id)) {
        // Deleted locally → stays deleted (server-side additions inside it are lost — acceptable:
        // the user explicitly removed the group).
        merged.groups = merged.groups.filter((g) => g.id !== bg.id);
        mergedGroups.delete(bg.id);
      }
    }
  }

  // --- Tasks: add / edit / move / delete at task granularity ---
  const baseTasks = indexTasks(baseline?.groups ?? []);
  const localTasks = indexTasks(local.groups);

  const removeFromMerged = (taskId: string): string | null => {
    for (const g of merged.groups) {
      const i = g.tasks.findIndex((t) => t.id === taskId);
      if (i >= 0) {
        g.tasks.splice(i, 1);
        return g.id;
      }
    }
    return null;
  };

  for (const [id, { task, groupId }] of localTasks) {
    if (broughtWholesale.has(groupId)) continue; // came over with the new group
    const base = baseTasks.get(id);
    if (base) {
      const changed = json(task) !== json(base.task) || groupId !== base.groupId;
      if (!changed) continue;
    } else if (baseline) {
      // Added locally.
      if (!indexTasks(merged.groups).has(id)) {
        (mergedGroups.get(groupId) ?? merged.groups[0])?.tasks.push(structuredClone(task));
      }
      continue;
    }
    // Edited/moved locally — or no baseline, where every local task overlays wholesale. Local
    // wins over any server change to the same task.
    const wasIn = removeFromMerged(id);
    const target =
      mergedGroups.get(groupId) ??
      (wasIn ? mergedGroups.get(wasIn) : undefined) ??
      merged.groups[0];
    target?.tasks.push(structuredClone(task));
  }
  if (baseline) {
    for (const id of baseTasks.keys()) {
      if (!localTasks.has(id)) {
        removeFromMerged(id); // deleted locally → stays deleted
      }
    }
  }

  // --- Boards list: same overlay by id ---
  const baseBoards = new Map((baseline?.boards ?? []).map((b) => [b.id, b]));
  const mergedBoardIds = new Set(merged.boards.map((b) => b.id));
  for (const lb of local.boards) {
    const bb = baseBoards.get(lb.id);
    if (!bb) {
      if (!mergedBoardIds.has(lb.id)) merged.boards.push(structuredClone(lb));
    } else if (json(lb) !== json(bb)) {
      const i = merged.boards.findIndex((b) => b.id === lb.id);
      if (i >= 0) merged.boards[i] = structuredClone(lb);
    }
  }
  if (baseline) {
    const localBoardIds = new Set(local.boards.map((b) => b.id));
    merged.boards = merged.boards.filter(
      (b) => localBoardIds.has(b.id) || !baseBoards.has(b.id),
    );
  }

  // --- Parity: per-group slice overlay ---
  for (const [gid, cells] of Object.entries(local.parity)) {
    if (!baseline || json(cells) !== json(baseline.parity[gid])) {
      merged.parity[gid] = structuredClone(cells);
    }
  }
  if (baseline) {
    for (const gid of Object.keys(baseline.parity)) {
      if (!(gid in local.parity)) delete merged.parity[gid];
    }
  }

  merged.version = server.version;
  return merged;
}
