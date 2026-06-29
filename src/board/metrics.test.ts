import { describe, expect, it } from 'vitest';
import { boardMetrics, dueMilestones } from './metrics';
import { type Task } from './model';

// Minimal task factory — only the fields each metric reads matter; the rest are filled in.
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

const TODAY = '2026-06-28';

describe('boardMetrics', () => {
  it('counts done / open / donePct from real statuses', () => {
    const m = boardMetrics(
      [
        task({ id: 'a', status: 'done' }),
        task({ id: 'b', status: 'done' }),
        task({ id: 'c', status: 'work' }),
        task({ id: 'd', status: 'plan' }),
      ],
      TODAY,
    );
    expect(m.total).toBe(4);
    expect(m.done).toBe(2);
    expect(m.open).toBe(2);
    expect(m.donePct).toBe(50);
  });

  it('counts overdue: due before today and not done', () => {
    const m = boardMetrics(
      [
        task({ id: 'a', due: '2026-06-20', status: 'work' }), // overdue
        task({ id: 'b', due: '2026-06-20', status: 'done' }), // done → not overdue
        task({ id: 'c', due: '2026-07-10', status: 'work' }), // future → not overdue
        task({ id: 'd', due: null, status: 'work' }), // no due
      ],
      TODAY,
    );
    expect(m.overdue).toBe(1);
  });

  it('counts open criticals: crit priority and not done', () => {
    const m = boardMetrics(
      [
        task({ id: 'a', priority: 'crit', status: 'work' }), // counts
        task({ id: 'b', priority: 'crit', status: 'done' }), // done → no
        task({ id: 'c', priority: 'high', status: 'work' }), // not crit
      ],
      TODAY,
    );
    expect(m.critOpen).toBe(1);
  });

  it('computes the plan horizon span (days) from tl + due', () => {
    const m = boardMetrics(
      [
        task({ id: 'a', tl: { start: '2026-06-01', end: '2026-06-10' } }),
        task({ id: 'b', due: '2026-06-30' }),
      ],
      TODAY,
    );
    expect(m.horizon).toBe(30); // 01 июн → 30 июн inclusive
  });

  it('handles an empty board without dividing by zero', () => {
    expect(boardMetrics([], TODAY)).toMatchObject({
      total: 0,
      done: 0,
      donePct: 0,
      open: 0,
      overdue: 0,
      critOpen: 0,
      horizon: 0,
    });
  });
});

describe('dueMilestones', () => {
  it('returns the nearest due dates chronologically with done flags', () => {
    const ms = dueMilestones(
      [
        task({ id: 'a', name: 'Late', due: '2026-07-05', status: 'plan' }),
        task({ id: 'b', name: 'Early', due: '2026-06-20', status: 'done' }),
        task({ id: 'c', name: 'NoDue', due: null }),
        task({ id: 'd', name: 'Mid', due: '2026-06-28', status: 'work' }),
      ],
      5,
    );
    expect(ms.map((x) => x.label)).toEqual(['Early', 'Mid', 'Late']);
    expect(ms[0]).toMatchObject({ label: 'Early', done: true });
    expect(ms[1].done).toBe(false);
  });

  it('respects the limit', () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      task({ id: 'x' + i, due: '2026-06-' + (10 + i) }),
    );
    expect(dueMilestones(tasks, 3)).toHaveLength(3);
  });
});
