// «Карта и бэклог переезда» — v1 screen (brief §4.1–4.5). Renders the tested domain over the
// Support dataset: the ranked Бэклог, the «взять следующим» build queue, the WIP list, the
// Роль×Модуль матрица, the module/role registries with «дёрни за ниточку», and the aggregations.
// нужность is recomputed from the role↔module membership (never trusted from a COUNT — brief §3).
// All numbers come from ./domain — this file is presentation only.
import { useMemo, useState } from 'react';
import supportData from './data/support.json';
import rolesData from './data/support-roles.json';
import {
  applyMembership,
  backlog,
  funnel,
  crosstab,
  takeNext,
  inProgress,
  BUCKET_ORDER,
  TIER_ORDER,
  type Bucket,
  type DerivedModule,
  type ModuleRow,
  type RoleRow,
  type Tier,
} from './domain';
import {
  BUCKET_COLOR,
  BucketPill,
  CARD,
  Filter,
  SectionTitle,
  TD,
  TH,
  TIER_COLOR,
  TierPill,
} from './ui';
import { MatrixView } from './MatrixView';
import { RegistryView } from './RegistryView';
import { TraceView } from './TraceView';

const MODULES = supportData as ModuleRow[];
const ROLES = rolesData as RoleRow[];

type TabKey = 'backlog' | 'next' | 'wip' | 'matrix' | 'registry' | 'trace' | 'agg';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'backlog', label: 'Бэклог' },
  { key: 'next', label: 'Взять следующим' },
  { key: 'wip', label: 'В работе / блок' },
  { key: 'matrix', label: 'Матрица' },
  { key: 'registry', label: 'Реестры' },
  { key: 'trace', label: 'Ниточка' },
  { key: 'agg', label: 'Агрегации' },
];

export function MigrationScreen() {
  // нужность из членства роль→модуль; на данных Саппорта совпадает с выгрузкой 1:1 (тест).
  const rows = useMemo(() => backlog(applyMembership(MODULES, ROLES)), []);
  const byId = useMemo(() => new Map(rows.map((m) => [m.id, m])), [rows]);
  const [tab, setTab] = useState<TabKey>('backlog');

  // «Дёрни за ниточку» selection — deep-linked from the registries.
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

  const fun = useMemo(() => funnel(rows), [rows]);
  const total = rows.length;
  const doneCount = fun.find((f) => f.bucket === 'Готово')?.count ?? 0;
  const core = rows.filter((r) => r.tier === 'Ядро');
  const coreDone = core.filter((r) => r.bucket === 'Готово').length;
  const coreNoTask = rows.filter((r) => r.tier === 'Ядро' && r.bucket === 'Нужна задача').length;

  return (
    <div style={{ padding: '22px 26px 60px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 4, fontSize: 21, fontWeight: 800, letterSpacing: '-.3px' }}>
        Карта и бэклог переезда
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 18 }}>
        Скоуп: Саппорт · {ROLES.length} ролей · {total} модулей · нужность считается из членства
        роль↔модуль. Приоритет = что разблокирует больше ролей за единицу работы.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <Kpi label="Всего модулей" value={String(total)} />
        <Kpi
          label="Готово (честно)"
          value={`${Math.round((doneCount / total) * 100)}%`}
          sub={`${doneCount} из ${total}`}
          tone="#4a9b7f"
        />
        <Kpi label="Ядро готово" value={`${coreDone}/${core.length}`} sub="максимальный рычаг" tone="#4263d8" />
        <Kpi
          label="Ядро без тикета"
          value={String(coreNoTask)}
          sub="🟡 завести задачу"
          tone="#d9a441"
        />
        <Kpi
          label="В работе / блок"
          value={`${fun.find((f) => f.bucket === 'В работе')?.count ?? 0} / ${
            fun.find((f) => f.bucket === 'Заблокировано')?.count ?? 0
          }`}
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

      {tab === 'backlog' && <BacklogTable rows={rows} />}
      {tab === 'next' && <QueueList rows={takeNext(rows)} showTask emptyHint="Нет модулей к взятию" />}
      {tab === 'wip' && <QueueList rows={inProgress(rows)} showState emptyHint="Нет активных модулей" />}
      {tab === 'matrix' && <MatrixView rows={rows} roles={ROLES} byId={byId} />}
      {tab === 'registry' && (
        <RegistryView
          rows={rows}
          roles={ROLES}
          byId={byId}
          onTraceModule={goTraceModule}
          onTraceRole={goTraceRole}
        />
      )}
      {tab === 'trace' && (
        <TraceView
          rows={rows}
          roles={ROLES}
          byId={byId}
          roleId={traceRole}
          moduleId={traceModule}
          onSelectRole={setTraceRole}
          onSelectModule={setTraceModule}
        />
      )}
      {tab === 'agg' && <Aggregations rows={rows} funnelRows={fun} />}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div style={{ ...CARD, padding: '13px 16px', minWidth: 132, flex: '1 1 132px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone ?? 'var(--text-3)', letterSpacing: '-.5px' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function BacklogTable({ rows }: { rows: DerivedModule[] }) {
  const [bucketF, setBucketF] = useState<Bucket | 'все'>('все');
  const [tierF, setTierF] = useState<Tier | 'все'>('все');

  const shown = rows.filter(
    (r) => (bucketF === 'все' || r.bucket === bucketF) && (tierF === 'все' || r.tier === tierF),
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter label="Бакет" value={bucketF} onChange={setBucketF} options={['все', ...BUCKET_ORDER]} />
        <Filter label="Ярус" value={tierF} onChange={setTierF} options={['все', ...TIER_ORDER]} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{shown.length} модулей</span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 940 }}>
            <thead>
              <tr>
                <th style={TH}>Ранг</th>
                <th style={TH}>ID</th>
                <th style={TH}>Модуль</th>
                <th style={TH}>Тип</th>
                <th style={TH}>Ярус</th>
                <th style={{ ...TH, textAlign: 'right' }}>Разбл. ролей</th>
                <th style={TH}>Задача</th>
                <th style={TH}>Состояние</th>
                <th style={TH}>Бакет</th>
                <th style={{ ...TH, textAlign: 'right' }}>Приоритет</th>
                <th style={TH}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ ...TD, color: 'var(--text-faint)' }}>{i + 1}</td>
                  <td style={{ ...TD, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                    {r.id}
                  </td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-3)', maxWidth: 300 }}>{r.name}</td>
                  <td style={{ ...TD, color: 'var(--text-soft)' }}>{r.type}</td>
                  <td style={TD}>
                    <TierPill tier={r.tier} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {r.need}
                  </td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
                    {/^BAC-\d+/.test(r.bac) ? (
                      <span style={{ color: '#4263d8' }}>{r.bac}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...TD, color: 'var(--text-soft)', maxWidth: 160, fontSize: 11.5 }}>
                    {r.state && r.state !== 'неизвестно' ? r.state : '·'}
                  </td>
                  <td style={TD}>
                    <BucketPill bucket={r.bucket} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {r.priority}
                  </td>
                  <td style={{ ...TD, fontSize: 11.5, color: 'var(--text-soft)', maxWidth: 220 }}>{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
                <TierPill tier={r.tier} /> · {r.type}
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
  funnelRows,
}: {
  rows: DerivedModule[];
  funnelRows: ReturnType<typeof funnel>;
}) {
  const maxCount = Math.max(...funnelRows.map((f) => f.count), 1);
  const byTier = useMemo(() => crosstab(rows, 'tier', TIER_ORDER), [rows]);
  const types = useMemo(() => [...new Set(rows.map((r) => r.type))], [rows]);
  const byType = useMemo(() => crosstab(rows, 'type', types), [rows, types]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section>
        <SectionTitle>Воронка по бакетам</SectionTitle>
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
