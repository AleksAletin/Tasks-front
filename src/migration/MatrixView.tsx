// Матрица Роль × Модуль (brief §4.1): rows = modules from Ядро down to Хвост, columns = roles,
// ● = the role has the module. Row meta shows ярус/нужность; column footers roll up #modules /
// #done / %done per role. The «правый-низ пустеет» reading — core modules span every role, the
// tail barely any — is the whole point of the sort.
import { useMemo, useState } from 'react';
import {
  roleStats,
  BUCKET_ORDER,
  TIER_ORDER,
  type Bucket,
  type DerivedModule,
  type RoleRow,
  type Tier,
} from './domain';
import { BUCKET_COLOR, CARD, Filter, SearchBox, TIER_COLOR } from './ui';

export function MatrixView({
  rows,
  roles,
  byId,
}: {
  rows: DerivedModule[];
  roles: RoleRow[];
  byId: Map<number, DerivedModule>;
}) {
  const [tierF, setTierF] = useState<Tier | 'все'>('все');
  const [bucketF, setBucketF] = useState<Bucket | 'все'>('все');
  const [q, setQ] = useState('');

  // Rows: core → tail (by нужность), the prototype's reading order.
  const modules = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.need - a.need || a.id - b.id)
        .filter(
          (m) =>
            (tierF === 'все' || m.tier === tierF) &&
            (bucketF === 'все' || m.bucket === bucketF) &&
            (q === '' || m.name.toLowerCase().includes(q.toLowerCase()) || String(m.id).includes(q)),
        ),
    [rows, tierF, bucketF, q],
  );

  // Columns: widest roles first (like the prototype).
  const cols = useMemo(() => [...roles].sort((a, b) => b.modules.length - a.modules.length), [roles]);
  const roleSets = useMemo(() => new Map(cols.map((r) => [r.id, new Set(r.modules)])), [cols]);
  const stats = useMemo(() => new Map(cols.map((r) => [r.id, roleStats(r, byId)])), [cols, byId]);

  const stickyCell = (left: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
    position: 'sticky',
    left,
    background: 'var(--bg)',
    zIndex: 2,
    ...extra,
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск модуля…" />
        <Filter label="Ярус" value={tierF} onChange={setTierF} options={['все', ...TIER_ORDER]} />
        <Filter label="Бакет" value={bucketF} onChange={setBucketF} options={['все', ...BUCKET_ORDER]} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {modules.length} модулей × {cols.length} ролей · ● цветом бакета
        </span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflow: 'auto', maxHeight: '68vh' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ ...matrixTh, ...stickyCell(0, { zIndex: 3, minWidth: 240, textAlign: 'left' }) }}>
                  Модуль
                </th>
                <th style={{ ...matrixTh, ...stickyCell(240, { zIndex: 3, width: 64 }) }}>Ярус</th>
                <th style={{ ...matrixTh, ...stickyCell(304, { zIndex: 3, width: 44 }) }}>#рол.</th>
                {cols.map((r) => (
                  <th key={r.id} style={{ ...matrixTh, height: 148, width: 30, verticalAlign: 'bottom' }}>
                    <div
                      title={`${r.name} · id ${r.id} · ${r.modules.length} модулей`}
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: 'var(--text-soft)',
                        maxHeight: 138,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        margin: '0 auto',
                      }}
                    >
                      {r.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id}>
                  <td
                    title={`${m.name} · ${m.bucket}`}
                    style={{
                      ...matrixTd,
                      ...stickyCell(0),
                      minWidth: 240,
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                      color: 'var(--text-3)',
                    }}
                  >
                    <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{m.id} · </span>
                    {m.name}
                  </td>
                  <td style={{ ...matrixTd, ...stickyCell(240), width: 64, color: TIER_COLOR[m.tier], fontWeight: 700, fontSize: 11 }}>
                    {m.tier}
                  </td>
                  <td style={{ ...matrixTd, ...stickyCell(304), width: 44, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {m.need}
                  </td>
                  {cols.map((r) => (
                    <td key={r.id} style={{ ...matrixTd, width: 30, textAlign: 'center', padding: '4px 0' }}>
                      {roleSets.get(r.id)!.has(m.id) ? (
                        <span style={{ color: BUCKET_COLOR[m.bucket], fontSize: 12 }}>●</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <FootRow label="#модулей" cols={cols} value={(id) => String(stats.get(id)!.total)} sticky={stickyCell} />
              <FootRow label="#готово" cols={cols} value={(id) => String(stats.get(id)!.done)} sticky={stickyCell} />
              <FootRow
                label="%готово"
                cols={cols}
                value={(id) => Math.round(stats.get(id)!.pctDone * 100) + '%'}
                sticky={stickyCell}
              />
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const matrixTh: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  background: 'var(--bg)',
  zIndex: 1,
  padding: '6px 8px',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '.3px',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  borderBottom: '1px solid var(--surf-2)',
};

const matrixTd: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  color: 'var(--text-2)',
  borderTop: '1px solid var(--surf-1)',
};

function FootRow({
  label,
  cols,
  value,
  sticky,
}: {
  label: string;
  cols: RoleRow[];
  value: (roleId: number) => string;
  sticky: (left: number, extra?: React.CSSProperties) => React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    ...matrixTd,
    fontSize: 10.5,
    fontWeight: 700,
    color: 'var(--text-soft)',
    background: 'var(--bg)',
    borderTop: '1px solid var(--surf-2)',
  };
  return (
    <tr>
      <td style={{ ...base, ...sticky(0), textAlign: 'right' }} colSpan={1}>
        {label}
      </td>
      <td style={{ ...base, ...sticky(240) }} />
      <td style={{ ...base, ...sticky(304) }} />
      {cols.map((r) => (
        <td key={r.id} style={{ ...base, textAlign: 'center', padding: '4px 1px', fontVariantNumeric: 'tabular-nums' }}>
          {value(r.id)}
        </td>
      ))}
    </tr>
  );
}
