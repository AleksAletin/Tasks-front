// Новинки — the second backlog: changes landing in the OLD system that must be re-applied to the
// new one. Linked modules are clickable → «Дёрни за ниточку». Unlinked rows are net-new features
// that have no module (yet).
import { useState } from 'react';
import type { MasterModule, NoveltyRow } from './domain';
import { CARD, CritPill, Filter, SearchBox, TD, TH } from './ui';

const CRIT_ORDER = ['🔴 Критично', '🟠 Существенно', '🟡 Обычное', '⚪ Низкое'];

export function NoveltyView({
  novelties,
  byId,
  onTraceModule,
}: {
  novelties: NoveltyRow[];
  byId: Map<number, MasterModule>;
  onTraceModule: (id: number) => void;
}) {
  const [critF, setCritF] = useState<string>('все');
  const [q, setQ] = useState('');

  const shown = novelties.filter(
    (n) =>
      (critF === 'все' || n.criticality === critF) &&
      (q === '' ||
        n.title.toLowerCase().includes(q.toLowerCase()) ||
        n.bac.toLowerCase().includes(q.toLowerCase())),
  );
  const linked = shown.filter((n) => n.modules.length > 0).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск по BAC / заголовку…" />
        <Filter label="Критичность" value={critF} onChange={setCritF} options={['все', ...CRIT_ORDER]} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {shown.length} новинок · {linked} привязано к модулям · {shown.length - linked} без модуля
          (net-new)
        </span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '64vh', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={TH}>BAC</th>
                <th style={TH}>Что меняется</th>
                <th style={TH}>Критичность</th>
                <th style={TH}>Тип изменения</th>
                <th style={TH}>Модули</th>
                <th style={TH}>Состояние</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((n, i) => (
                <tr key={n.bac + i}>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#4263d8', whiteSpace: 'nowrap' }}>
                    {n.bac}
                  </td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-3)', maxWidth: 380 }}>{n.title}</td>
                  <td style={TD}>
                    <CritPill criticality={n.criticality} />
                  </td>
                  <td style={{ ...TD, color: 'var(--text-soft)', fontSize: 11.5 }}>{n.changeType || '—'}</td>
                  <td style={TD}>
                    {n.modules.length === 0 ? (
                      <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>net-new</span>
                    ) : (
                      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                        {n.modules.map((id) => (
                          <button
                            key={id}
                            onClick={() => onTraceModule(id)}
                            title={byId.get(id)?.name ?? String(id)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 7,
                              border: '1px solid var(--surf-2)',
                              background: 'transparent',
                              color: '#4263d8',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {id}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>
                  <td style={{ ...TD, color: 'var(--text-soft)', fontSize: 11.5 }}>{n.state || '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
