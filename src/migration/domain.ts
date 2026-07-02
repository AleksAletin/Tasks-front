// Domain model for «Карта и бэклог переезда» (XRM migration backlog), per the brief §2.
// Everything derives from ONE number — нужность (module reuse across roles):
//   нужность → ярус → бакет → волна → приоритет → «что брать следующим».
// Pure and config-driven: thresholds and the priority formula are overridable (defaults were
// derived from the Support data), so a lead can retune them without touching code.

export type Tier = 'Ядро' | 'Средние' | 'Хвост';

export type Bucket =
  | 'В работе'
  | 'Заблокировано'
  | 'Готово к работе'
  | 'Нужна задача'
  | 'Хвост — потом'
  | 'Готово'
  | 'Не переносим';

/** Raw facts about a migration module (one atomic access grant: to a report / field / function). */
export interface ModuleRow {
  id: number;
  name: string;
  /** Тип (= доступ к): Отчёт / Доп. Модуль / Базовый / Стороннее ПО / … */
  type: string;
  /** нужность — in how many in-scope roles this module appears (reuse). The core priority signal. */
  need: number;
  /** Linked YouTrack task «BAC-<число>»; a bare «BAC-» / «—» / «» is a placeholder = no task. */
  bac: string;
  /** Raw YouTrack state, e.g. «Разработка», «Ожидание третьей стороны», «неизвестно». */
  state: string;
  /** Free-form editorial note from the master workbook (context for the flag below). */
  note?: string;
  /** Editorial «не переносим» verdict — an INPUT, not a derivation: for modules with no task and
   * no state it lives only in a human decision (the note text doesn't encode it reliably). */
  notMigrating?: boolean;
}

/** Tunable thresholds / weights (brief §2 — defaults derived from the Support distribution). */
export interface MigrationConfig {
  /** Ядро: нужность ≥ coreMin. */
  coreMin: number;
  /** Средние: нужность ≥ midMin (and < coreMin); Хвост: below midMin. */
  midMin: number;
  /** Приоритет from (волна, нужность). Default: (10 − wave) × 100 + need. */
  priority: (wave: number, need: number) => number;
}

export const DEFAULT_CONFIG: MigrationConfig = {
  coreMin: 20,
  midMin: 5,
  priority: (wave, need) => (10 - wave) * 100 + need,
};

/** «Есть реальная задача»: a BAC-<number> link. A bare «BAC-» / «—» / «» is a placeholder = no task. */
export function hasTask(bac: string): boolean {
  return /^BAC-\d+/.test((bac ?? '').trim());
}

/** Ярус = f(нужность). */
export function tierOf(need: number, cfg: MigrationConfig = DEFAULT_CONFIG): Tier {
  if (need >= cfg.coreMin) return 'Ядро';
  if (need >= cfg.midMin) return 'Средние';
  return 'Хвост';
}

/**
 * Бакет — the 7 ordered rules (first match wins), brief §2 + master semantics. State-driven rules
 * 1–4 fire on the raw YouTrack state; then a linked-but-not-started task is «Готово к работе»;
 * then the two no-task buckets split by ярус. Master nuance: ANY «ожидает заливку» (dev или prod)
 * is still «В работе» — Готово начинается с «готово»/«выложено».
 */
export function bucketOf(m: ModuleRow, cfg: MigrationConfig = DEFAULT_CONFIG): Bucket {
  const s = (m.state ?? '').toLowerCase().trim();

  // 0. Editorial override — «не переносим» decided by a human in the master (see ModuleRow).
  if (m.notMigrating) {
    return 'Не переносим';
  }
  // 1. Готово — released / deployed to prod.
  if (s.includes('готово') || s.includes('выложен')) {
    return 'Готово';
  }
  // 2. Не переносим — cancelled / explicitly not migrating.
  if (s.includes('отменено') || s.includes('не переносим') || s.includes('не нужно переносить')) {
    return 'Не переносим';
  }
  // 3. Заблокировано — waiting on a third party / on hold.
  if (s.includes('третьей стороны') || s.includes('стоп')) {
    return 'Заблокировано';
  }
  // 4. В работе — active dev / analysis / testing / awaiting a deploy (dev or prod).
  if (
    s.includes('разработк') ||
    s.includes('аналитик') ||
    s.includes('тестирован') ||
    s.includes('заливку')
  ) {
    return 'В работе';
  }
  // 5. Готово к работе — a task exists but it hasn't really started (backlog / unknown state).
  if (hasTask(m.bac)) {
    return 'Готово к работе';
  }
  // 6. Нужна задача — no task, and the module matters (Ядро / Средние).
  if (tierOf(m.need, cfg) !== 'Хвост') {
    return 'Нужна задача';
  }
  // 7. Хвост — потом — no task, low reuse.
  return 'Хвост — потом';
}

const WAVE: Record<Bucket, number> = {
  'В работе': 1,
  'Готово к работе': 2,
  'Нужна задача': 3,
  'Хвост — потом': 4,
  Заблокировано: 8,
  Готово: 9,
  'Не переносим': 9,
};

/** Волна (sequencing): active → ready → need-a-task → tail; done / blocked / not-migrating sink. */
export function waveOf(bucket: Bucket): number {
  return WAVE[bucket];
}

const ACTION: Record<Bucket, string> = {
  'В работе': '🔵 закончить (не начинать новое сверх лимита)',
  Заблокировано: '⛔ пушить 3-ю сторону / разблокировать',
  'Готово к работе': '🟢 брать в спринт (задача есть)',
  'Нужна задача': '🟡 завести задачу — аналитика (ядро без тикета!)',
  'Хвост — потом': '⚪ отложить (низкая нужность)',
  Готово: '✅ готово',
  'Не переносим': '🚫 вне scope',
};

/** Рекомендуемое действие per bucket. */
export function actionOf(bucket: Bucket): string {
  return ACTION[bucket];
}

/** All derived attributes for one module. */
export interface Derived {
  tier: Tier;
  bucket: Bucket;
  wave: number;
  priority: number;
  action: string;
}

export type DerivedModule = ModuleRow & Derived;

export function derive(m: ModuleRow, cfg: MigrationConfig = DEFAULT_CONFIG): DerivedModule {
  const tier = tierOf(m.need, cfg);
  const bucket = bucketOf(m, cfg);
  const wave = waveOf(bucket);
  return { ...m, tier, bucket, wave, priority: cfg.priority(wave, m.need), action: actionOf(bucket) };
}

/** The backlog: every module derived, ranked by приоритет desc (нужность, then id, break ties). */
export function backlog(modules: ModuleRow[], cfg: MigrationConfig = DEFAULT_CONFIG): DerivedModule[] {
  return modules
    .map((m) => derive(m, cfg))
    .sort((a, b) => b.priority - a.priority || b.need - a.need || a.id - b.id);
}

/** Stable presentation order for buckets (funnel / cross-tab columns). */
export const BUCKET_ORDER: Bucket[] = [
  'В работе',
  'Заблокировано',
  'Готово к работе',
  'Нужна задача',
  'Хвост — потом',
  'Готово',
  'Не переносим',
];

export const TIER_ORDER: Tier[] = ['Ядро', 'Средние', 'Хвост'];

export interface FunnelRow {
  bucket: Bucket;
  count: number;
  pct: number;
}

/** Воронка по бакетам — count + share per bucket, in BUCKET_ORDER. */
export function funnel(rows: DerivedModule[]): FunnelRow[] {
  const total = rows.length || 1;
  return BUCKET_ORDER.map((bucket) => {
    const count = rows.filter((r) => r.bucket === bucket).length;
    return { bucket, count, pct: count / total };
  });
}

export interface CrosstabRow {
  key: string;
  cells: Record<Bucket, number>;
  total: number;
}

/** Кросс-таблица: rows = distinct values of `dim` (Ярус / Тип), cols = buckets, cells = counts. */
export function crosstab(
  rows: DerivedModule[],
  dim: 'tier' | 'type',
  keyOrder?: string[],
): CrosstabRow[] {
  const keys = keyOrder ?? [...new Set(rows.map((r) => String(r[dim])))];
  return keys.map((key) => {
    const subset = rows.filter((r) => String(r[dim]) === key);
    const cells = Object.fromEntries(
      BUCKET_ORDER.map((b) => [b, subset.filter((r) => r.bucket === b).length]),
    ) as Record<Bucket, number>;
    return { key, cells, total: subset.length };
  });
}

/**
 * «Взять следующим» — the actionable build queue: not-started items («Нужна задача» + «Готово к
 * работе»), ranked by НУЖНОСТЬ (raw reuse), so a core module with no ticket still outranks a tail
 * one that happens to have a ticket. Ядро naturally leads (higher reuse).
 */
export function takeNext(rows: DerivedModule[]): DerivedModule[] {
  return rows
    .filter((r) => r.bucket === 'Нужна задача' || r.bucket === 'Готово к работе')
    .sort((a, b) => b.need - a.need || a.id - b.id);
}

/** «В работе / Заблокировано» — WIP: finish or unblock these before pulling anything new. */
export function inProgress(rows: DerivedModule[]): DerivedModule[] {
  return rows
    .filter((r) => r.bucket === 'В работе' || r.bucket === 'Заблокировано')
    .sort((a, b) => b.need - a.need || a.id - b.id);
}

// ---------------------------------------------------------------------------
// Role ↔ Module membership (v1b): the bipartite edge set the whole model hangs off.

/** A role in the migration scope with its module membership (the authoritative source). */
export interface RoleRow {
  id: number;
  name: string;
  /** Module ids this role has access to — one edge per entry. */
  modules: number[];
}

/** нужность recomputed from the membership itself (brief §3: recompute, never trust a
 * precomputed COUNT). Modules in no role simply don't appear (need 0). */
export function computeNeeds(roles: RoleRow[]): Map<number, number> {
  const needs = new Map<number, number>();
  for (const role of roles) {
    for (const id of role.modules) {
      needs.set(id, (needs.get(id) ?? 0) + 1);
    }
  }
  return needs;
}

/** Modules with `need` replaced by the value recomputed from membership. */
export function applyMembership(modules: ModuleRow[], roles: RoleRow[]): ModuleRow[] {
  const needs = computeNeeds(roles);
  return modules.map((m) => ({ ...m, need: needs.get(m.id) ?? 0 }));
}

export interface RoleStats {
  total: number;
  core: number;
  mid: number;
  tail: number;
  /** Бакет «Готово» (наивно — без учёта новинок). */
  done: number;
  /** Editorial/derived «Не переносим» — excluded from the migration denominator. */
  notMigrating: number;
  /** total − notMigrating: модулей К ПЕРЕНОСУ (the honest denominator, master semantics). */
  toMigrate: number;
  /** done / toMigrate — «наивная» готовность к переносу. */
  pctDone: number;
  /** Готово И новинок 0. */
  trueDone: number;
  /** trueDone / toMigrate — «истинная» готовность. */
  pctTrue: number;
}

/** Per-role rollup, master semantics: the denominator is «к переносу» (без «Не переносим»),
 * and «истинно готово» additionally requires zero pending новинки on the module. */
export function roleStats(
  role: RoleRow,
  byId: Map<number, DerivedModule>,
  noveltyCount?: Map<number, number>,
): RoleStats {
  const stats: RoleStats = {
    total: 0,
    core: 0,
    mid: 0,
    tail: 0,
    done: 0,
    notMigrating: 0,
    toMigrate: 0,
    pctDone: 0,
    trueDone: 0,
    pctTrue: 0,
  };
  for (const id of role.modules) {
    const m = byId.get(id);
    if (!m) continue;
    stats.total++;
    if (m.tier === 'Ядро') stats.core++;
    else if (m.tier === 'Средние') stats.mid++;
    else stats.tail++;
    if (m.bucket === 'Не переносим') stats.notMigrating++;
    if (m.bucket === 'Готово') {
      stats.done++;
      if ((noveltyCount?.get(id) ?? 0) === 0) stats.trueDone++;
    }
  }
  stats.toMigrate = stats.total - stats.notMigrating;
  stats.pctDone = stats.toMigrate ? stats.done / stats.toMigrate : 0;
  stats.pctTrue = stats.toMigrate ? stats.trueDone / stats.toMigrate : 0;
  return stats;
}

// ---------------------------------------------------------------------------
// Новинки (the second backlog): changes landing in the OLD system that must be re-applied to the
// new one. Each links to 0+ modules; the cross product «перенос × новинки» yields the вердикт.

export interface NoveltyRow {
  bac: string;
  title: string;
  /** Modules this change touches (may be empty — net-new features with no module yet). */
  modules: number[];
  /** «🔴 Критично» | «🟠 Существенно» | «🟡 Обычное» | «⚪ Низкое». */
  criticality: string;
  changeType: string;
  priority: string;
  state: string;
}

/** Pending новинки per module (a novelty touching N modules counts once for each). */
export function noveltiesByModule(novelties: NoveltyRow[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const n of novelties) {
    for (const id of new Set(n.modules)) {
      map.set(id, (map.get(id) ?? 0) + 1);
    }
  }
  return map;
}

/** Вердикт «перенос × новинки» — the master's 14 outcomes (7 buckets × has-novelties). */
export function verdictOf(bucket: Bucket, noveltyCount: number): string {
  const has = noveltyCount > 0;
  switch (bucket) {
    case 'Готово':
      return has ? '🔴 ПЕРЕОТКРЫТЬ' : '✅ готово-актуально';
    case 'В работе':
      return has ? '🎯 влить новинки' : '🔵 в работе';
    case 'Заблокировано':
      return has ? '⛔ заблок+нов' : '⛔ заблокировано';
    case 'Готово к работе':
      return has ? '📌 строить с новинками' : '🟢 готово к работе';
    case 'Нужна задача':
      return has ? '🆕 задача+новинки' : '🟡 завести задачу';
    case 'Не переносим':
      return has ? '❓ пересмотреть' : '🚫 не переносим';
    case 'Хвост — потом':
      return has ? '⏸ хвост+нов' : '⏸ хвост';
  }
}

/** «Истинно готово» — done AND no pending новинки (naive %-done overstates without this). */
export function isTrulyDone(bucket: Bucket, noveltyCount: number): boolean {
  return bucket === 'Готово' && noveltyCount === 0;
}

/** Scoring config — the master's «Скоринг» sheet, all tunable. */
export interface ScoringConfig {
  waveWeight: number;
  needWeight: number;
  noveltyWeight: number;
  noveltyCap: number;
  bonusCritical: number;
  bonusMajor: number;
  bonusAnyNovelty: number;
  bonusTargetRole: number;
  targetRoleId: number;
  /** бакет × есть-новинки → волна 1–7 (9 = вне бэклога). */
  bucketWave: Record<Bucket, { withNovelties: number; without: number }>;
}

export const DEFAULT_SCORING: ScoringConfig = {
  waveWeight: 1000,
  needWeight: 10,
  noveltyWeight: 20,
  noveltyCap: 9,
  bonusCritical: 60,
  bonusMajor: 30,
  bonusAnyNovelty: 10,
  bonusTargetRole: 100,
  targetRoleId: 1122,
  bucketWave: {
    'В работе': { withNovelties: 1, without: 1 },
    Заблокировано: { withNovelties: 2, without: 2 },
    Готово: { withNovelties: 3, without: 9 }, // готово + новинки = досинхрон; чистое готово — вне очереди
    'Готово к работе': { withNovelties: 4, without: 4 },
    'Нужна задача': { withNovelties: 5, without: 5 },
    'Не переносим': { withNovelties: 6, without: 9 }, // прилетели новинки → пересмотреть решение
    'Хвост — потом': { withNovelties: 7, without: 7 },
  },
};

/** The master's В1–В7 wave names + actions, keyed by wave number. */
export const WAVE_INFO: Record<number, { label: string; action: string }> = {
  1: { label: '🔵 В1 · закончить', action: 'довести до готово; влить вложенные новинки' },
  2: { label: '⛔ В2 · разблокировать', action: 'пушить 3-ю сторону — старт сразу (длинный лид)' },
  3: { label: '🔴 В3 · досинхрон новинок', action: 'переоткрыть и влить новинки перед переключением роли' },
  4: { label: '🟢 В4 · строить', action: 'в спринт; строить сразу по актуалу (с новинками)' },
  5: { label: '🟡 В5 · завести задачу', action: 'завести задачу (аналитика) и строить' },
  6: { label: '❓ В6 · пересмотреть', action: 'решить: брать в scope / пересмотреть не-переносим' },
  7: { label: '⏸ В7 · хвост', action: 'после ядра и средних' },
};

/** Волна нового бэклога: бакет × есть-новинки, per the config table. 9 = вне бэклога. */
export function masterWaveOf(
  bucket: Bucket,
  noveltyCount: number,
  cfg: ScoringConfig = DEFAULT_SCORING,
): number {
  const row = cfg.bucketWave[bucket];
  return noveltyCount > 0 ? row.withNovelties : row.without;
}

// Highest applicable criticality bonus (tiered, not cumulative — matches the master's Score).
function criticalityBonus(novelties: NoveltyRow[], cfg: ScoringConfig): number {
  if (novelties.length === 0) return 0;
  if (novelties.some((n) => n.criticality.includes('🔴'))) return cfg.bonusCritical;
  if (novelties.some((n) => n.criticality.includes('🟠'))) return cfg.bonusMajor;
  return cfg.bonusAnyNovelty;
}

/** Score = (8−волна)×вес + нужность×вес + MIN(новинки, кап)×вес + бонус критичности + бонус
 * целевой роли — the master's formula, verbatim. */
export function scoreOf(
  wave: number,
  need: number,
  moduleNovelties: NoveltyRow[],
  inTargetRole: boolean,
  cfg: ScoringConfig = DEFAULT_SCORING,
): number {
  return (
    (8 - wave) * cfg.waveWeight +
    need * cfg.needWeight +
    Math.min(moduleNovelties.length, cfg.noveltyCap) * cfg.noveltyWeight +
    criticalityBonus(moduleNovelties, cfg) +
    (inTargetRole ? cfg.bonusTargetRole : 0)
  );
}

/** A module fully derived under the master model (verdict / new wave / score / истинно). */
export interface MasterModule extends DerivedModule {
  noveltyCount: number;
  verdict: string;
  /** В1–В7 wave (9 = вне бэклога). */
  masterWave: number;
  score: number;
  trulyDone: boolean;
  inTargetRole: boolean;
}

/** Derive the master model for every module (novelty counts, verdicts, В1–В7 waves, scores). */
export function masterDerive(
  modules: ModuleRow[],
  novelties: NoveltyRow[],
  roles: RoleRow[],
  cfg: MigrationConfig = DEFAULT_CONFIG,
  scoring: ScoringConfig = DEFAULT_SCORING,
): MasterModule[] {
  const byModule = new Map<number, NoveltyRow[]>();
  for (const n of novelties) {
    for (const id of new Set(n.modules)) {
      const list = byModule.get(id) ?? [];
      list.push(n);
      byModule.set(id, list);
    }
  }
  const target = new Set(roles.find((r) => r.id === scoring.targetRoleId)?.modules ?? []);
  return modules.map((m) => {
    const d = derive(m, cfg);
    const list = byModule.get(m.id) ?? [];
    const wave = masterWaveOf(d.bucket, list.length, scoring);
    const inTargetRole = target.has(m.id);
    return {
      ...d,
      noveltyCount: list.length,
      verdict: verdictOf(d.bucket, list.length),
      masterWave: wave,
      score: scoreOf(wave, m.need, list, inTargetRole, scoring),
      trulyDone: isTrulyDone(d.bucket, list.length),
      inTargetRole,
    };
  });
}

/** The score backlog: only waves 1–7 (9 = вне очереди), ranked by Score desc. */
export function masterBacklog(rows: MasterModule[]): MasterModule[] {
  return rows
    .filter((r) => r.masterWave <= 7)
    .sort((a, b) => b.score - a.score || b.need - a.need || a.id - b.id);
}

export interface MasterDashboard {
  /** Истинная готовность целевой роли: готово-без-новинок / к переносу. */
  trueReadinessTarget: number;
  /** Наивная готовность целевой роли: готово / к переносу. */
  naiveReadinessTarget: number;
  /** «Готово», но прилетели новинки → переоткрыть (все 198). */
  reopenCount: number;
  noveltiesTotal: number;
  verdictCounts: Record<string, number>;
}

export function masterDashboard(
  rows: MasterModule[],
  novelties: NoveltyRow[],
  roles: RoleRow[],
  scoring: ScoringConfig = DEFAULT_SCORING,
): MasterDashboard {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const target = roles.find((r) => r.id === scoring.targetRoleId);
  const targetModules = (target?.modules ?? [])
    .map((id) => byId.get(id))
    .filter((m): m is MasterModule => !!m);
  const toMigrate = targetModules.filter((m) => m.bucket !== 'Не переносим');
  const done = toMigrate.filter((m) => m.bucket === 'Готово');
  const trulyDone = done.filter((m) => m.trulyDone);

  const verdictCounts: Record<string, number> = {};
  for (const r of rows) {
    verdictCounts[r.verdict] = (verdictCounts[r.verdict] ?? 0) + 1;
  }

  return {
    trueReadinessTarget: toMigrate.length ? trulyDone.length / toMigrate.length : 0,
    naiveReadinessTarget: toMigrate.length ? done.length / toMigrate.length : 0,
    reopenCount: rows.filter((r) => r.verdict === '🔴 ПЕРЕОТКРЫТЬ').length,
    noveltiesTotal: novelties.length,
    verdictCounts,
  };
}
