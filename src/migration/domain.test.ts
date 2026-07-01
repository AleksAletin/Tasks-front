import { describe, it, expect } from 'vitest';
import facts from './data/support.json';
import oracle from './data/support-oracle.json';
import rolesData from './data/support-roles.json';
import rolesOracle from './data/support-roles-oracle.json';
import {
  applyMembership,
  backlog,
  computeNeeds,
  derive,
  funnel,
  crosstab,
  roleStats,
  takeNext,
  inProgress,
  tierOf,
  hasTask,
  TIER_ORDER,
  type ModuleRow,
  type RoleRow,
} from './domain';

const modules = facts as ModuleRow[];
const roles = rolesData as RoleRow[];
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

describe('migration domain — role↔module membership (v1b)', () => {
  it('нужность recomputed from membership equals the stored value for all 198 modules', () => {
    // Brief §3: recompute нужность ourselves, never trust a precomputed COUNT. On the Support
    // data the two agree exactly — which validates both the membership and the module registry.
    const needs = computeNeeds(roles);
    const mismatches = modules
      .filter((m) => (needs.get(m.id) ?? 0) !== m.need)
      .map((m) => `#${m.id}: stored ${m.need}, recomputed ${needs.get(m.id) ?? 0}`);
    expect(mismatches).toEqual([]);
  });

  it('applyMembership feeds the same backlog (same needs → identical derivation)', () => {
    const viaMembership = backlog(applyMembership(modules, roles));
    const direct = backlog(modules);
    expect(viaMembership.map((r) => [r.id, r.tier, r.bucket, r.priority])).toEqual(
      direct.map((r) => [r.id, r.tier, r.bucket, r.priority]),
    );
  });

  it('has the full scope: 34 roles', () => {
    expect(roles).toHaveLength(34);
  });

  it('roleStats reproduces the MAP prototype numbers for ALL 34 roles', () => {
    const byId = new Map(backlog(applyMembership(modules, roles)).map((m) => [m.id, m]));
    type RoleOracle = {
      id: number;
      total: number;
      core: number;
      mid: number;
      tail: number;
      done: number;
      pctDone: number;
    };
    const mismatches: string[] = [];
    for (const exp of rolesOracle as RoleOracle[]) {
      const role = roles.find((r) => r.id === exp.id)!;
      const got = roleStats(role, byId);
      if (
        got.total !== exp.total ||
        got.core !== exp.core ||
        got.mid !== exp.mid ||
        got.tail !== exp.tail ||
        got.done !== exp.done ||
        Math.abs(got.pctDone - exp.pctDone) > 1e-9
      ) {
        mismatches.push(`role ${exp.id}: got ${JSON.stringify(got)}, exp ${JSON.stringify(exp)}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('role 1122 «Поддержка.Блок» matches the prototype card: 80 модулей, 75/3/2, 41 готово', () => {
    const byId = new Map(backlog(applyMembership(modules, roles)).map((m) => [m.id, m]));
    const stats = roleStats(roles.find((r) => r.id === 1122)!, byId);
    expect(stats).toMatchObject({ total: 80, core: 75, mid: 3, tail: 2, done: 41 });
    expect(stats.pctDone).toBeCloseTo(0.5125, 6);
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
