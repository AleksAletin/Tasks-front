// Реестры (brief §4.2, master edition): the module registry (…+ вердикт «перенос × новинки» и
// счёт новинок) and the role registry (наивная и истинная готовность «к переносу»). Every row
// links into «Дёрни за ниточку» for the full chain.
import { useMemo, useState } from 'react';
import {
  noveltiesByModule,
  roleStats,
  BUCKET_ORDER,
  TIER_ORDER,
  type Bucket,
  type MasterModule,
  type NoveltyRow,
  type RoleRow,
  type Tier,
} from './domain';
import { BucketPill, CARD, Filter, SearchBox, TD, TH, TIER_COLOR, TierPill, VerdictPill } from './ui';

export function RegistryView({
  rows,
  roles,
  byId,
  novelties,
  onTraceModule,
  onTraceRole,
}: {
  rows: MasterModule[];
  roles: RoleRow[];
  byId: Map<number, MasterModule>;
  novelties: NoveltyRow[];
  onTraceModule: (id: number) => void;
  onTraceRole: (id: number) => void;
}) {
  const [mode, setMode] = useState<'modules' | 'roles'>('modules');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(
          [
            ['modules', 'Реестр модулей'],
            ['roles', 'Реестр ролей'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 9,
              border: '1px solid ' + (mode === key ? '#4263d8' : 'var(--surf-2)'),
              background: mode === key ? 'var(--blue-tint)' : 'transparent',
              color: mode === key ? '#4263d8' : 'var(--text-soft)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'modules' ? (
        <ModuleRegistry rows={rows} roles={roles} onTrace={onTraceModule} />
      ) : (
        <RoleRegistry roles={roles} byId={byId} novelties={novelties} onTrace={onTraceRole} />
      )}
    </div>
  );
}

function ModuleRegistry({
  rows,
  roles,
  onTrace,
}: {
  rows: MasterModule[];
  roles: RoleRow[];
  onTrace: (id: number) => void;
}) {
  const [tierF, setTierF] = useState<Tier | 'все'>('все');
  const [bucketF, setBucketF] = useState<Bucket | 'все'>('все');
  const [q, setQ] = useState('');

  const rolesOf = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const r of roles) {
      for (const id of r.modules) {
        const list = map.get(id) ?? [];
        list.push(r.id);
        map.set(id, list);
      }
    }
    return map;
  }, [roles]);

  const shown = rows.filter(
    (m) =>
      (tierF === 'все' || m.tier === tierF) &&
      (bucketF === 'все' || m.bucket === bucketF) &&
      (q === '' || m.name.toLowerCase().includes(q.toLowerCase()) || String(m.id).includes(q)),
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск по названию / ID…" />
        <Filter label="Ярус" value={tierF} onChange={setTierF} options={['все', ...TIER_ORDER]} />
        <Filter label="Бакет" value={bucketF} onChange={setBucketF} options={['все', ...BUCKET_ORDER]} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{shown.length} модулей</span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: '64vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={TH}>ID</th>
                <th style={TH}>Название</th>
                <th style={TH}>Ярус</th>
                <th style={{ ...TH, textAlign: 'right' }}>Нужность</th>
                <th style={{ ...TH, textAlign: 'right' }}>Ролей</th>
                <th style={TH}>Задача</th>
                <th style={TH}>Бакет</th>
                <th style={{ ...TH, textAlign: 'right' }}>Новинок</th>
                <th style={TH}>Вердикт</th>
                <th style={TH} />
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...TD, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{m.id}</td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-3)', maxWidth: 320 }} title={m.note || undefined}>
                    {m.name}
                  </td>
                  <td style={TD}>
                    <TierPill tier={m.tier} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {m.need}
                  </td>
                  <td
                    title={(rolesOf.get(m.id) ?? []).join(', ')}
                    style={{ ...TD, textAlign: 'right', color: 'var(--text-soft)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {(rolesOf.get(m.id) ?? []).length}
                  </td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
                    {/^BAC-\d+/.test(m.bac) ? (
                      <span style={{ color: '#4263d8' }}>{m.bac}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>—</span>
                    )}
                  </td>
                  <td style={TD}>
                    <BucketPill bucket={m.bucket} />
                  </td>
                  <td
                    style={{
                      ...TD,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: m.noveltyCount ? 800 : 400,
                      color: m.noveltyCount ? '#cf6b6b' : 'var(--text-faint)',
                    }}
                  >
                    {m.noveltyCount || '·'}
                  </td>
                  <td style={TD}>
                    <VerdictPill verdict={m.verdict} />
                  </td>
                  <td style={TD}>
                    <TraceButton onClick={() => onTrace(m.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RoleRegistry({
  roles,
  byId,
  novelties,
  onTrace,
}: {
  roles: RoleRow[];
  byId: Map<number, MasterModule>;
  novelties: NoveltyRow[];
  onTrace: (id: number) => void;
}) {
  const [q, setQ] = useState('');
  const novByModule = useMemo(() => noveltiesByModule(novelties), [novelties]);
  const stats = useMemo(
    () => new Map(roles.map((r) => [r.id, roleStats(r, byId, novByModule)])),
    [roles, byId, novByModule],
  );
  const shown = roles
    .filter((r) => q === '' || r.name.toLowerCase().includes(q.toLowerCase()) || String(r.id).includes(q))
    .sort((a, b) => b.modules.length - a.modules.length);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск роли…" />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {shown.length} ролей · % считаются «к переносу» (без «Не переносим»)
        </span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: '64vh' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={TH}>ID</th>
                <th style={TH}>Роль</th>
                <th style={{ ...TH, textAlign: 'right' }}>#модулей</th>
                <th style={{ ...TH, textAlign: 'right' }}>
                  <span style={{ color: TIER_COLOR['Ядро'] }}>Ядро</span> /{' '}
                  <span style={{ color: TIER_COLOR['Средние'] }}>Средн.</span> /{' '}
                  <span style={{ color: TIER_COLOR['Хвост'] }}>Хвост</span>
                </th>
                <th style={{ ...TH, textAlign: 'right' }}>К переносу</th>
                <th style={{ ...TH, textAlign: 'right' }}>Готово</th>
                <th style={TH}>%готово (наив)</th>
                <th style={TH}>%истинно</th>
                <th style={TH} />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const s = stats.get(r.id)!;
                return (
                  <tr key={r.id}>
                    <td style={{ ...TD, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{r.id}</td>
                    <td style={{ ...TD, fontWeight: 600, color: 'var(--text-3)' }}>{r.name}</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {s.total}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-soft)' }}>
                      {s.core} / {s.mid} / {s.tail}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.toMigrate}</td>
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.done}</td>
                    <td style={{ ...TD, minWidth: 130 }}>
                      <PctBar pct={s.pctDone} color="#4263d8" />
                    </td>
                    <td style={{ ...TD, minWidth: 130 }}>
                      <PctBar pct={s.pctTrue} color="#4a9b7f" />
                    </td>
                    <td style={TD}>
                      <TraceButton onClick={() => onTrace(r.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--surf-1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function TraceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Дёрнуть за ниточку"
      style={{
        padding: '3px 10px',
        borderRadius: 7,
        border: '1px solid var(--surf-2)',
        background: 'transparent',
        color: '#4263d8',
        fontSize: 11.5,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      ниточка →
    </button>
  );
}
