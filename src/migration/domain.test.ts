import { describe, it, expect } from 'vitest';
import facts from './data/support.json';
import boardOracle from './data/master-board-oracle.json';
import rolesData from './data/support-roles.json';
import rolesOracle from './data/master-roles-oracle.json';
import noveltiesData from './data/support-novelties.json';
import backlogOracle from './data/master-backlog-oracle.json';
import dashboardOracle from './data/master-dashboard-oracle.json';
import {
  applyMembership,
  backlog,
  computeNeeds,
  derive,
  funnel,
  crosstab,
  masterBacklog,
  masterDashboard,
  masterDerive,
  noveltiesByModule,
  roleStats,
  takeNext,
  inProgress,
  tierOf,
  hasTask,
  TIER_ORDER,
  WAVE_INFO,
  type ModuleRow,
  type NoveltyRow,
  type RoleRow,
} from './domain';

const modules = facts as ModuleRow[];
const roles = rolesData as RoleRow[];
const novelties = noveltiesData as NoveltyRow[];

type BoardOracle = {
  id: number;
  tier: string;
  bucket: string;
  wave: number;
  priority: number;
  novelties: number;
  verdict: string;
  trulyDone: string;
};
const board = boardOracle as BoardOracle[];
const boardById = new Map(board.map((o) => [o.id, o]));

const master = masterDerive(modules, novelties, roles);
const masterById = new Map(master.map((m) => [m.id, m]));

// The MASTER workbook (Реестр+Борд / 🎯 Бэклог / Матрица / Дашборд) is the эталон: it carries its
// own computed columns. We recompute everything from raw facts and must match bit-for-bit.
describe('master domain — Реестр+Борд (198 модулей)', () => {
  it('derives tier/bucket/wave/priority identical to the эталон for every module', () => {
    const mismatches = modules
      .map((m) => {
        const d = derive(m);
        const o = boardById.get(m.id)!;
        if (d.tier === o.tier && d.bucket === o.bucket && d.wave === o.wave && d.priority === o.priority) {
          return null;
        }
        return `#${m.id} state="${m.state}" → got [${d.tier}/${d.bucket}/w${d.wave}/p${d.priority}] exp [${o.tier}/${o.bucket}/w${o.wave}/p${o.priority}]`;
      })
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('derives вердикт, счёт новинок и «истинно готово» identical to the эталон', () => {
    const mismatches = master
      .map((m) => {
        const o = boardById.get(m.id)!;
        const okTruly = m.trulyDone === (o.trulyDone === 'да');
        if (m.verdict === o.verdict && m.noveltyCount === o.novelties && okTruly) return null;
        return `#${m.id}: got [${m.verdict}/${m.noveltyCount}/${m.trulyDone}] exp [${o.verdict}/${o.novelties}/${o.trulyDone}]`;
      })
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('has the whole scope (198 modules) and the master funnel', () => {
    expect(modules).toHaveLength(198);
    const f = Object.fromEntries(funnel(backlog(modules)).map((r) => [r.bucket, r.count]));
    expect(f).toMatchObject({
      'В работе': 28,
      Заблокировано: 5,
      'Готово к работе': 6,
      'Нужна задача': 15,
      'Хвост — потом': 25,
      Готово: 66,
      'Не переносим': 53,
    });
  });

  it('tier split stays Ядро 77 / Средние 35 / Хвост 86', () => {
    const t = crosstab(backlog(modules), 'tier', TIER_ORDER);
    expect(t.map((r) => [r.key, r.total])).toEqual([
      ['Ядро', 77],
      ['Средние', 35],
      ['Хвост', 86],
    ]);
  });

  it('module 97 «Авторизация» is now an editorial «Не переносим» (заменён на BOUltraAccess)', () => {
    const d = masterById.get(97)!;
    expect(d).toMatchObject({ tier: 'Ядро', bucket: 'Не переносим', wave: 9, priority: 134 });
    expect(d.verdict).toBe('🚫 не переносим');
  });
});

describe('master domain — 🎯 Бэклог (score, В1–В7)', () => {
  type BacklogOracle = {
    rank: number;
    wave: string;
    id: number;
    targetRole: boolean;
    novelties: number;
    verdict: string;
    score: number;
  };
  const oracle = backlogOracle as BacklogOracle[];
  const ranked = masterBacklog(master);

  it('exactly the эталон set of modules is in the backlog (94, волны 1–7)', () => {
    expect(new Set(ranked.map((r) => r.id))).toEqual(new Set(oracle.map((o) => o.id)));
  });

  it('score, волна и целевая роль совпадают с эталоном для всех 94', () => {
    const byId = new Map(oracle.map((o) => [o.id, o]));
    const mismatches = ranked
      .map((r) => {
        const o = byId.get(r.id)!;
        const waveLabel = WAVE_INFO[r.masterWave]?.label;
        if (r.score === o.score && waveLabel === o.wave && r.inTargetRole === o.targetRole) return null;
        return `#${r.id}: got [${r.score}/${waveLabel}/${r.inTargetRole}] exp [${o.score}/${o.wave}/${o.targetRole}]`;
      })
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('ranking matches the эталон wherever the score is unique (ties may reorder)', () => {
    const scoreCounts = new Map<number, number>();
    for (const o of oracle) scoreCounts.set(o.score, (scoreCounts.get(o.score) ?? 0) + 1);
    const oracleRank = new Map(oracle.map((o) => [o.id, o.rank]));
    const mismatches = ranked
      .map((r, i) =>
        scoreCounts.get(r.score) === 1 && oracleRank.get(r.id) !== i + 1
          ? `#${r.id}: got rank ${i + 1}, exp ${oracleRank.get(r.id)}`
          : null,
      )
      .filter(Boolean);
    expect(mismatches).toEqual([]);
  });

  it('scores are non-increasing down the ranking', () => {
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });
});

describe('master domain — дашборд', () => {
  const dash = masterDashboard(master, novelties, roles);
  const oracle = dashboardOracle as {
    trueReadinessTarget: number;
    naiveReadinessTarget: number;
    reopenCount: number;
    noveltiesTotal: number;
    verdictCounts: Record<string, number>;
  };

  it('истинная и наивная готовность целевой роли 1122 совпадают с эталоном', () => {
    expect(dash.trueReadinessTarget).toBeCloseTo(oracle.trueReadinessTarget, 9); // 46.4%
    expect(dash.naiveReadinessTarget).toBeCloseTo(oracle.naiveReadinessTarget, 9); // 58.0%
  });

  it('ПЕРЕОТКРЫТЬ и всего новинок совпадают', () => {
    expect(dash.reopenCount).toBe(oracle.reopenCount); // 13
    expect(dash.noveltiesTotal).toBe(oracle.noveltiesTotal); // 104
  });

  it('все 14 счётчиков вердиктов совпадают с эталоном', () => {
    for (const [verdict, count] of Object.entries(oracle.verdictCounts)) {
      expect(dash.verdictCounts[verdict] ?? 0, verdict).toBe(count);
    }
  });
});

describe('master domain — role↔module membership', () => {
  it('нужность recomputed from membership equals the stored value for all 198 modules', () => {
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

  it('roleStats reproduces the Матрица footers for ALL 34 roles (total/готово/не переносим/%)', () => {
    const byId = new Map(backlog(modules).map((m) => [m.id, m]));
    const novByModule = noveltiesByModule(novelties);
    type RoleOracle = { id: number; total: number; done: number; notMigrating: number; pct: number };
    const mismatches: string[] = [];
    for (const exp of rolesOracle as RoleOracle[]) {
      const role = roles.find((r) => r.id === exp.id)!;
      const got = roleStats(role, byId, novByModule);
      if (
        got.total !== exp.total ||
        got.done !== exp.done ||
        got.notMigrating !== exp.notMigrating ||
        Math.abs(got.pctDone - exp.pct) > 1e-9
      ) {
        mismatches.push(
          `role ${exp.id}: got ${got.total}/${got.done}/${got.notMigrating}/${got.pctDone}, exp ${exp.total}/${exp.done}/${exp.notMigrating}/${exp.pct}`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('целевая роль 1122: истинно 32 из 69 (46.4%), наивно 40 из 69 (58.0%)', () => {
    const byId = new Map(backlog(modules).map((m) => [m.id, m]));
    const stats = roleStats(roles.find((r) => r.id === 1122)!, byId, noveltiesByModule(novelties));
    expect(stats.toMigrate).toBe(69);
    expect(stats.done).toBe(40);
    expect(stats.trueDone).toBe(32);
  });
});

describe('master domain — queues and pure helpers', () => {
  it('«взять следующим» is not-started work ranked by нужность', () => {
    const next = takeNext(backlog(modules));
    expect(next.length).toBeGreaterThan(0);
    expect(next[0].need).toBe(Math.max(...next.map((n) => n.need)));
    for (let i = 1; i < next.length; i++) {
      expect(next[i - 1].need).toBeGreaterThanOrEqual(next[i].need);
    }
    expect(next.every((r) => r.bucket === 'Нужна задача' || r.bucket === 'Готово к работе')).toBe(true);
  });

  it('«в работе» is WIP only (active + blocked)', () => {
    expect(
      inProgress(backlog(modules)).every((r) => r.bucket === 'В работе' || r.bucket === 'Заблокировано'),
    ).toBe(true);
  });

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
    expect(tierOf(20, { coreMin: 30, midMin: 5, priority: () => 0 })).toBe('Средние');
  });
});
