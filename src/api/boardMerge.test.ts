import { describe, expect, it } from 'vitest';
import { mergeBoards } from './boardMerge';
import type { BoardPayload } from './board';
import type { Group, Task } from '../board/model';

const task = (id: string, over: Partial<Task> = {}): Task =>
  ({
    id,
    name: 'Задача ' + id,
    owner: null,
    status: 'plan',
    due: null,
    priority: null,
    tl: null,
    note: '',
    lastBy: '',
    lastAgo: '',
    section: '',
    type: 'mig',
    source: 'ours',
    ...over,
  }) as Task;

const group = (id: string, tasks: Task[], over: Partial<Group> = {}): Group =>
  ({
    id,
    name: 'Группа ' + id,
    color: '#000',
    tasks,
    boardId: 'b1',
    ...over,
  }) as Group;

const payload = (groups: Group[], version = 0, over: Partial<BoardPayload> = {}): BoardPayload => ({
  boards: [{ id: 'b1', name: 'Доска', color: '#000' }],
  groups,
  parity: {},
  version,
  ...over,
});

const taskIn = (p: BoardPayload, id: string) =>
  p.groups.flatMap((g) => g.tasks).find((t) => t.id === id);

describe('mergeBoards (board 409 conflict resolution)', () => {
  it('keeps the sync-updated status of one task AND the local edit of another', () => {
    const baseline = payload([group('g1', [task('t1'), task('t2')])], 3);
    // The sync moved t1 to done server-side…
    const server = payload([group('g1', [task('t1', { status: 'done' }), task('t2')])], 4);
    // …while this tab renamed t2 on the stale snapshot.
    const local = payload([group('g1', [task('t1'), task('t2', { name: 'Переименована' })])], 3);

    const merged = mergeBoards(baseline, local, server);

    expect(taskIn(merged, 't1')?.status).toBe('done'); // sync's work survives
    expect(taskIn(merged, 't2')?.name).toBe('Переименована'); // local edit survives
    expect(merged.version).toBe(4); // retry carries the server version
  });

  it('local wins when BOTH sides touched the same task', () => {
    const baseline = payload([group('g1', [task('t1')])], 1);
    const server = payload([group('g1', [task('t1', { status: 'done' })])], 2);
    const local = payload([group('g1', [task('t1', { status: 'stuck' })])], 1);

    expect(taskIn(mergeBoards(baseline, local, server), 't1')?.status).toBe('stuck');
  });

  it('keeps a task the server added (sync discovery) and a task added locally', () => {
    const baseline = payload([group('g1', [task('t1')])], 1);
    const server = payload(
      [group('g1', [task('t1')]), group('g_yt', [task('yt_XRM-9')])],
      2,
    );
    const local = payload([group('g1', [task('t1'), task('t_new')])], 1);

    const merged = mergeBoards(baseline, local, server);

    expect(taskIn(merged, 'yt_XRM-9')).toBeDefined(); // discovered task kept
    expect(taskIn(merged, 't_new')).toBeDefined(); // local add kept
  });

  it('a local deletion sticks even though the server still has the task', () => {
    const baseline = payload([group('g1', [task('t1'), task('t2')])], 1);
    const server = payload([group('g1', [task('t1', { status: 'done' }), task('t2')])], 2);
    const local = payload([group('g1', [task('t2')])], 1); // t1 deleted locally

    const merged = mergeBoards(baseline, local, server);

    expect(taskIn(merged, 't1')).toBeUndefined();
    expect(taskIn(merged, 't2')).toBeDefined();
  });

  it('applies a local group rename without touching the tasks the server changed inside it', () => {
    const baseline = payload([group('g1', [task('t1')])], 1);
    const server = payload([group('g1', [task('t1', { status: 'done' })])], 2);
    const local = payload([group('g1', [task('t1')], { name: 'Новое имя' })], 1);

    const merged = mergeBoards(baseline, local, server);

    expect(merged.groups[0].name).toBe('Новое имя');
    expect(taskIn(merged, 't1')?.status).toBe('done');
  });

  it('overlays only the locally-changed parity slice', () => {
    const baseline = payload([group('g1', [])], 1, {
      parity: { g1: { m1: 'none' }, g2: { m2: 'none' } },
    });
    const server = payload([group('g1', [])], 2, {
      parity: { g1: { m1: 'done' }, g2: { m2: 'none' } },
    });
    const local = payload([group('g1', [])], 1, {
      parity: { g1: { m1: 'none' }, g2: { m2: 'work' } },
    });

    const merged = mergeBoards(baseline, local, server);

    expect(merged.parity.g1.m1).toBe('done'); // untouched locally → server wins
    expect(merged.parity.g2.m2).toBe('work'); // changed locally → local wins
  });

  it('without a baseline, local entities overlay the server wholesale', () => {
    const server = payload([group('g1', [task('t1', { status: 'done' })])], 5);
    const local = payload([group('g1', [task('t1', { status: 'stuck' })])], 0);

    const merged = mergeBoards(null, local, server);

    expect(taskIn(merged, 't1')?.status).toBe('stuck');
    expect(merged.version).toBe(5);
  });
});
