import { describe, expect, it } from 'vitest';
import { buildView, summarize, type ViewParams } from './derive';
import {
  initialGroups,
  type Group,
  type StatusKey,
  type Task,
} from './model';

const seed = (): Group[] => JSON.parse(JSON.stringify(initialGroups));
const flat = (gs: Group[]): Task[] => gs.flatMap((g) => g.tasks);
const params = (over: Partial<ViewParams> = {}): ViewParams => ({
  groups: seed(),
  query: '',
  filterStatus: {},
  filterOwner: null,
  sortBy: null,
  sortDir: 'asc',
  groupBy: 'role',
  ...over,
});

const task = (over: Partial<Task>): Task => ({
  id: 'x',
  name: 'X',
  owner: null,
  status: 'plan',
  due: null,
  priority: null,
  tl: null,
  note: '',
  lastBy: '',
  lastAgo: '',
  section: 'Обращения',
  type: 'mig',
  source: 'ours',
  ...over,
});

describe('buildView — grouping', () => {
  it('groups by status without losing or duplicating any task', () => {
    const gs = seed();
    const total = flat(gs).length;
    const { groups } = buildView(params({ groups: gs, groupBy: 'status' }));
    expect(groups.flatMap((g) => g.tasks).length).toBe(total);

    const doneCount = flat(gs).filter((t) => t.status === 'done').length;
    if (doneCount > 0) {
      const dg = groups.find((g) => g.id === 'grp_status_done');
      expect(dg).toBeDefined();
      expect(dg!.tasks.length).toBe(doneCount);
      expect(dg!.tasks.every((t) => t.status === 'done')).toBe(true);
    }
  });

  it('keeps an orphaned status key (deleted label) as its own group instead of dropping it', () => {
    const gs = seed();
    const total = flat(gs).length;
    gs[0].tasks[0].status = 'zzz' as StatusKey; // a key absent from the registry
    const { groups } = buildView(params({ groups: gs, groupBy: 'status' }));
    // no row vanishes…
    expect(groups.flatMap((g) => g.tasks).length).toBe(total);
    // …and the orphan lands in its own bucket
    const orphan = groups.find((g) => g.id === 'grp_status_zzz');
    expect(orphan).toBeDefined();
    expect(orphan!.tasks.map((t) => t.id)).toContain(gs[0].tasks[0].id);
  });
});

describe('buildView — filter + sort', () => {
  it('filters to the selected statuses only', () => {
    const { groups } = buildView(params({ filterStatus: { done: true } }));
    const tasks = groups.flatMap((g) => g.tasks);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === 'done')).toBe(true);
  });

  it('filters by a free-text query over name/note/section', () => {
    const gs = seed();
    const word = flat(gs)[0].name.split(' ')[0].toLowerCase();
    const { groups } = buildView(params({ groups: gs, query: word }));
    const tasks = groups.flatMap((g) => g.tasks);
    expect(tasks.length).toBeGreaterThan(0);
    expect(
      tasks.every((t) =>
        (t.name + ' ' + (t.note || '') + ' ' + t.section)
          .toLowerCase()
          .includes(word),
      ),
    ).toBe(true);
  });

  it('sorts tasks by name ascending within a group', () => {
    const { groups } = buildView(params({ sortBy: 'task', sortDir: 'asc' }));
    const g = groups.find((x) => x.tasks.length > 1);
    expect(g).toBeDefined();
    const names = g!.tasks.map((t) => t.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });
});

describe('summarize', () => {
  it('returns status segments proportional to the counts', () => {
    const s = summarize([
      task({ status: 'done' }),
      task({ status: 'done' }),
      task({ status: 'work' }),
      task({ status: 'plan' }),
    ]);
    // 3 distinct statuses present → 3 segments, each a "<pct>%" string + a colour
    expect(s.statusSegs).toHaveLength(3);
    expect(s.statusSegs.every((seg) => seg.pct.endsWith('%') && !!seg.bg)).toBe(
      true,
    );
    // done is 2/4 → 50%
    expect(s.statusSegs.some((seg) => seg.pct === '50%')).toBe(true);
  });

  it('builds a timeline label spanning the dated tasks', () => {
    const s = summarize([
      task({ tl: { start: '2026-06-01', end: '2026-06-05' } }),
      task({ tl: { start: '2026-06-10', end: '2026-06-20' } }),
    ]);
    expect(s.tlLabel).toContain('1 июн');
    expect(s.tlLabel).toContain('20 июн');
  });
});
