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
 * Бакет — the 7 ordered rules (first match wins), brief §2. State-driven rules 1–4 fire on the
 * raw YouTrack state; then a linked-but-not-started task is «Готово к работе»; then the two
 * no-task buckets split by ярус. Note the dev/prod nuance: «ожидает заливку на прод» is release-
 * ready → Готово, while «…на dev» is still → В работе.
 */
export function bucketOf(m: ModuleRow, cfg: MigrationConfig = DEFAULT_CONFIG): Bucket {
  const s = (m.state ?? '').toLowerCase().trim();

  // 1. Готово — released / deployed to prod / awaiting the prod deploy.
  if (s.includes('готово') || s.includes('выложен') || s.includes('заливку на прод')) {
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
  // 4. В работе — active dev / analysis / testing / awaiting the DEV deploy.
  if (
    s.includes('разработк') ||
    s.includes('аналитик') ||
    s.includes('тестирован') ||
    s.includes('заливку на dev') ||
    s.includes('заливку на дев')
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
  done: number;
  pctDone: number;
}

/** Per-role rollup: #modules, ярус split, #готово and %готово (done = bucket «Готово»). */
export function roleStats(role: RoleRow, byId: Map<number, DerivedModule>): RoleStats {
  const stats: RoleStats = { total: 0, core: 0, mid: 0, tail: 0, done: 0, pctDone: 0 };
  for (const id of role.modules) {
    const m = byId.get(id);
    if (!m) continue;
    stats.total++;
    if (m.tier === 'Ядро') stats.core++;
    else if (m.tier === 'Средние') stats.mid++;
    else stats.tail++;
    if (m.bucket === 'Готово') stats.done++;
  }
  stats.pctDone = stats.total ? stats.done / stats.total : 0;
  return stats;
}
