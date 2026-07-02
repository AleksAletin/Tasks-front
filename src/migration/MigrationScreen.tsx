// «Карта и бэклог переезда» — master edition (два бэклога: перенос + новинки). Renders the
// oracle-tested domain over the Support MASTER dataset: the Score-ranked 🎯 Бэклог (волны В1–В7),
// the «взять следующим»/WIP queues, Новинки, the Роль×Модуль матрица, the registries with «дёрни
// за ниточку», and the aggregations incl. the вердикт funnel (перенос × новинки). нужность is
// recomputed from the role↔module membership. All numbers come from ./domain.
import { useMemo, useState } from 'react';
import supportData from './data/support.json';
import rolesData from './data/support-roles.json';
import noveltiesData from './data/support-novelties.json';
import {
  applyMembership,
  funnel,
  crosstab,
  masterDashboard,
  masterDerive,
  takeNext,
  inProgress,
  BUCKET_ORDER,
  TIER_ORDER,
  type Bucket,
  type DerivedModule,
  type MasterModule,
  type ModuleRow,
  type NoveltyRow,
  type RoleRow,
} from './domain';
import {
  BUCKET_COLOR,
  BucketPill,
  CARD,
  SectionTitle,
  TD,
  TH,
  TIER_COLOR,
  TierPill,
  VERDICT_COLOR,
  VerdictPill,
} from './ui';
import { ScoreBacklogView } from './ScoreBacklogView';
import { NoveltyView } from './NoveltyView';
import { MatrixView } from './MatrixView';
import { RegistryView } from './RegistryView';
import { TraceView } from './TraceView';

const MODULES = supportData as ModuleRow[];
const ROLES = rolesData as RoleRow[];
const NOVELTIES = noveltiesData as NoveltyRow[];

type TabKey = 'backlog' | 'next' | 'wip' | 'novelties' | 'matrix' | 'registry' | 'trace' | 'agg';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'backlog', label: '🎯 Бэклог' },
  { key: 'next', label: 'Взять следующим' },
  { key: 'wip', label: 'В работе / блок' },
  { key: 'novelties', label: 'Новинки' },
  { key: 'matrix', label: 'Матрица' },
  { key: 'registry', label: 'Реестры' },
  { key: 'trace', label: 'Ниточка' },
  { key: 'agg', label: 'Агрегации' },
];

export function MigrationScreen() {
  // нужность из членства роль↔модуль + мастер-модель (новинки → вердикт → волны В1–В7 → Score).
  const rows = useMemo(
    () => masterDerive(applyMembership(MODULES, ROLES), NOVELTIES, ROLES),
    [],
  );
  const byId = useMemo(() => new Map(rows.map((m) => [m.id, m])), [rows]);
  const dash = useMemo(() => masterDashboard(rows, NOVELTIES, ROLES), [rows]);
  const [tab, setTab] = useState<TabKey>('backlog');

  // «Дёрни за ниточку» selection — deep-linked from the registries and новинки.
  const [traceRole, setTraceRole] = useState<number | null>(null);
  const [traceModule, setTraceModule] = useState<number | null>(null);
  const goTraceModule = (id: number) => {
    setTraceModule(id);
    setTab('trace');
  };
  const goTraceRole = (id: number) => {
    setTraceRole(id);
    setTab('trace');
  };

  const total = rows.length;
  const notMigrating = rows.filter((r) => r.bucket === 'Не переносим').length;
  const wipCount = rows.filter((r) => r.bucket === 'В работе').length;
  const blockedCount = rows.filter((r) => r.bucket === 'Заблокировано').length;

  return (
    <div style={{ padding: '22px 26px 60px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 4, fontSize: 21, fontWeight: 800, letterSpacing: '-.3px' }}>
        Карта и бэклог переезда
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 18 }}>
        Скоуп: Саппорт · {ROLES.length} ролей · {total} модулей · два бэклога: перенос + новинки.
        Целевая роль — {dashTargetName(ROLES)} · нужность из членства роль↔модуль.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <Kpi
          label="Истинно готово (цел. роль)"
          value={`${Math.round(dash.trueReadinessTarget * 100)}%`}
          sub={`наивно ${Math.round(dash.naiveReadinessTarget * 100)}% — без учёта новинок`}
          tone="#4a9b7f"
        />
        <Kpi
          label="🔴 ПЕРЕОТКРЫТЬ"
          value={String(dash.reopenCount)}
          sub="«готово», но пришли новинки"
          tone="#cf6b6b"
        />
        <Kpi
          label="Новинок всего"
          value={String(dash.noveltiesTotal)}
          sub="догоняющих задач из старой системы"
          tone="#c8893f"
        />
        <Kpi
          label="Всего модулей"
          value={String(total)}
          sub={`к переносу ${total - notMigrating} · не переносим ${notMigrating}`}
        />
        <Kpi
          label="В работе / блок"
          value={`${wipCount} / ${blockedCount}`}
          sub="WIP — доводить"
          tone="#c8893f"
        />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--surf-1)', flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 14px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                color: active ? 'var(--text-3)' : 'var(--text-soft)',
                borderBottom: active ? '2px solid #4263d8' : '2px solid transparent',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </div>
          );
        })}
      </div>

      {tab === 'backlog' && <ScoreBacklogView rows={rows} />}
      {tab === 'next' && <QueueList rows={takeNext(rows)} showTask emptyHint="Нет модулей к взятию" />}
      {tab === 'wip' && <QueueList rows={inProgress(rows)} showState emptyHint="Нет активных модулей" />}
      {tab === 'novelties' && (
        <NoveltyView novelties={NOVELTIES} byId={byId} onTraceModule={goTraceModule} />
      )}
      {tab === 'matrix' && <MatrixView rows={rows} roles={ROLES} byId={byId} />}
      {tab === 'registry' && (
        <RegistryView
          rows={rows}
          roles={ROLES}
          byId={byId}
          novelties={NOVELTIES}
          onTraceModule={goTraceModule}
          onTraceRole={goTraceRole}
        />
      )}
      {tab === 'trace' && (
        <TraceView
          rows={rows}
          roles={ROLES}
          byId={byId}
          novelties={NOVELTIES}
          roleId={traceRole}
          moduleId={traceModule}
          onSelectRole={setTraceRole}
          onSelectModule={setTraceModule}
        />
      )}
      {tab === 'agg' && <Aggregations rows={rows} verdictCounts={dash.verdictCounts} />}
    </div>
  );
}

function dashTargetName(roles: RoleRow[]): string {
  const target = roles.find((r) => r.id === 1122);
  return target ? `${target.name} (${target.id})` : '1122';
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...CARD, padding: '13px 16px', minWidth: 150, flex: '1 1 150px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone ?? 'var(--text-3)', letterSpacing: '-.5px' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// «Взять следующим» / «В работе» — a leaner ranked list emphasising нужность + action.
function QueueList({
  rows,
  showTask,
  showState,
  emptyHint,
}: {
  rows: DerivedModule[];
  showTask?: boolean;
  showState?: boolean;
  emptyHint: string;
}) {
  if (rows.length === 0) {
    return <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: 20 }}>{emptyHint}</div>;
  }
  return (
    <div style={{ ...CARD, overflow: 'hidden' }}>
      <div style={{ maxHeight: '64vh', overflowY: 'auto' }}>
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--surf-1)',
            }}
          >
            <div
              style={{
                width: 34,
                textAlign: 'center',
                fontSize: 17,
                fontWeight: 800,
                color: 'var(--text-faint)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {i + 1}
            </div>
            <div
              title="разблокирует ролей"
              style={{
                minWidth: 44,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: 800,
                color: TIER_COLOR[r.tier],
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.need}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>
                <TierPill tier={r.tier} /> · {r.type || 'тип не задан'}
                {showState && r.state && r.state !== 'неизвестно' ? ` · ${r.state}` : ''}
                {showTask
                  ? /^BAC-\d+/.test(r.bac)
                    ? ` · ${r.bac}`
                    : ' · нет тикета'
                  : ''}
              </div>
            </div>
            <BucketPill bucket={r.bucket} />
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', width: 190, textAlign: 'right' }}>
              {r.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Aggregations({
  rows,
  verdictCounts,
}: {
  rows: MasterModule[];
  verdictCounts: Record<string, number>;
}) {
  const funnelRows = useMemo(() => funnel(rows), [rows]);
  const maxCount = Math.max(...funnelRows.map((f) => f.count), 1);
  const byTier = useMemo(() => crosstab(rows, 'tier', TIER_ORDER), [rows]);
  const types = useMemo(() => [...new Set(rows.map((r) => r.type || '—'))], [rows]);
  const byType = useMemo(
    () => crosstab(rows.map((r) => ({ ...r, type: r.type || '—' })), 'type', types),
    [rows, types],
  );
  const verdicts = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1]);
  const maxVerdict = Math.max(...verdicts.map(([, c]) => c), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section>
        <SectionTitle>Вердикты — перенос × новинки (единый план)</SectionTitle>
        <div style={{ ...CARD, padding: '14px 18px' }}>
          {verdicts.map(([verdict, count]) => (
            <div key={verdict} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <div style={{ width: 200, flexShrink: 0 }}>
                <VerdictPill verdict={verdict} />
              </div>
              <div style={{ flex: 1, height: 16, background: 'var(--surf-1)', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(count / maxVerdict) * 100}%`,
                    height: '100%',
                    background: VERDICT_COLOR[verdict] ?? '#8a8f98',
                    borderRadius: 5,
                  }}
                />
              </div>
              <div style={{ width: 40, textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Воронка по бакетам (перенос)</SectionTitle>
        <div style={{ ...CARD, padding: '14px 18px' }}>
          {funnelRows.map((f) => (
            <div key={f.bucket} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0' }}>
              <div style={{ width: 150, flexShrink: 0 }}>
                <BucketPill bucket={f.bucket} />
              </div>
              <div style={{ flex: 1, height: 18, background: 'var(--surf-1)', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(f.count / maxCount) * 100}%`,
                    height: '100%',
                    background: BUCKET_COLOR[f.bucket],
                    borderRadius: 5,
                    transition: 'width .4s ease',
                  }}
                />
              </div>
              <div style={{ width: 74, textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {f.count} · {Math.round(f.pct * 100)}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <CrosstabCard title="Ярус × Бакет" rows={byTier} keyLabel="Ярус" />
      <CrosstabCard title="Тип × Бакет" rows={byType} keyLabel="Тип" />
    </div>
  );
}

function CrosstabCard({
  title,
  rows,
  keyLabel,
}: {
  title: string;
  rows: ReturnType<typeof crosstab>;
  keyLabel: string;
}) {
  const colTotal = (b: Bucket) => rows.reduce((s, r) => s + r.cells[b], 0);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ ...TH, position: 'static' }}>{keyLabel}</th>
                {BUCKET_ORDER.map((b) => (
                  <th key={b} style={{ ...TH, position: 'static', textAlign: 'right' }}>
                    <span style={{ color: BUCKET_COLOR[b] }}>{b}</span>
                  </th>
                ))}
                <th style={{ ...TH, position: 'static', textAlign: 'right' }}>Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ ...TD, fontWeight: 700, color: 'var(--text-3)' }}>{r.key}</td>
                  {BUCKET_ORDER.map((b) => (
                    <td
                      key={b}
                      style={{
                        ...TD,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: r.cells[b] ? 'var(--text-2)' : 'var(--text-faint)',
                        fontWeight: r.cells[b] ? 600 : 400,
                      }}
                    >
                      {r.cells[b] || '·'}
                    </td>
                  ))}
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {r.total}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ ...TD, fontWeight: 800, color: 'var(--text-faint)' }}>Итого</td>
                {BUCKET_ORDER.map((b) => (
                  <td
                    key={b}
                    style={{ ...TD, textAlign: 'right', fontWeight: 700, color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {colTotal(b) || '·'}
                  </td>
                ))}
                <td style={{ ...TD, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{grand}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
