import { describe, it, expect } from 'vitest';
import facts from './data/support.json';
import oracle from './data/support-oracle.json';
import {
  backlog,
  derive,
  funnel,
  crosstab,
  takeNext,
  inProgress,
  tierOf,
  hasTask,
  TIER_ORDER,
  type ModuleRow,
} from './domain';

const modules = facts as ModuleRow[];
type Oracle = { id: number; tier: string; bucket: string; wave: number; priority: number };
const expected = oracle as Oracle[];
const byId = new Map(expected.map((o) => [o.id, o]));

// The prototype (Ultra_Support_backlog.xlsx «Бэклог») is the эталон поведения: it carries its own
// computed Ярус/Бакет/Волна/Приоритет. We recompute them from the raw facts and must match exactly.
describe('migration domain — reproduces the Support prototype (198 modules)', () => {
  it('derives tier/bucket/wave/priority identical to the эталон for every module', () => {
    const mismatches = modules
      .map((m) => {
        const d = derive(m);
        const o = byId.get(m.id)!;
        if (d.tier === o.tier && d.bucket === o.bucket && d.wave === o.wave && d.priority === o.priority) {
          return null;
        }
        return `#${m.id} state="${m.state}" bac="${m.bac}" → got [${d.tier}/${d.bucket}/w${d.wave}/p${d.priority}] exp [${o.tier}/${o.bucket}/w${o.wave}/p${o.priority}]`;
      })
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('has the whole scope (198 modules)', () => {
    expect(modules).toHaveLength(198);
  });

  it('funnel matches the prototype counts', () => {
    const f = Object.fromEntries(funnel(backlog(modules)).map((r) => [r.bucket, r.count]));
    expect(f).toMatchObject({
      'В работе': 10,
      Заблокировано: 6,
      'Готово к работе': 54,
      'Нужна задача': 28,
      'Хвост — потом': 55,
      Готово: 44,
      'Не переносим': 1,
    });
  });

  it('tier split matches (Ядро 77 / Средние 35 / Хвост 86)', () => {
    const t = crosstab(backlog(modules), 'tier', TIER_ORDER);
    expect(t.map((r) => [r.key, r.total])).toEqual([
      ['Ядро', 77],
      ['Средние', 35],
      ['Хвост', 86],
    ]);
  });
});

describe('migration domain — the priority signal', () => {
  it('module 97 «Авторизация» is core, no ticket → «Нужна задача», wave 3, priority 734', () => {
    const d = derive(modules.find((m) => m.id === 97)!);
    expect(d).toMatchObject({ tier: 'Ядро', bucket: 'Нужна задача', wave: 3, priority: 734 });
  });

  it('«взять следующим» leads with the highest-reuse not-started module (97), by нужность', () => {
    const next = takeNext(backlog(modules));
    expect(next[0].id).toBe(97); // need 34, no ticket, still #1 — reuse beats having-a-ticket
    for (let i = 1; i < next.length; i++) {
      expect(next[i - 1].need).toBeGreaterThanOrEqual(next[i].need);
    }
    expect(next.every((r) => r.bucket === 'Нужна задача' || r.bucket === 'Готово к работе')).toBe(true);
  });

  it('«в работе» is WIP only (active + blocked)', () => {
    expect(inProgress(backlog(modules)).every((r) => r.bucket === 'В работе' || r.bucket === 'Заблокировано')).toBe(
      true,
    );
  });
});

describe('migration domain — pure helpers', () => {
  it('hasTask: BAC-<n> is real, bare «BAC-»/«—»/empty is a placeholder', () => {
    expect(hasTask('BAC-245')).toBe(true);
    expect(hasTask('  BAC-1 ')).toBe(true);
    expect(hasTask('BAC-')).toBe(false);
    expect(hasTask('—')).toBe(false);
    expect(hasTask('')).toBe(false);
  });

  it('tier thresholds are configurable', () => {
    expect(tierOf(20)).toBe('Ядро');
    expect(tierOf(19)).toBe('Средние');
    expect(tierOf(4)).toBe('Хвост');
    expect(tierOf(20, { coreMin: 30, midMin: 5, priority: () => 0 })).toBe('Средние'); // retuned
  });
});
