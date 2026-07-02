// 🎯 Бэклог (master): every in-scope module (волны В1–В7) ranked by Score. Данные обновились →
// список пересортировался: score = волна > нужность > новинки (+бонусы критичности и целевой
// роли) — the master's Скоринг sheet, reproduced by ./domain and oracle-tested.
import { useMemo, useState } from 'react';
import { masterBacklog, TIER_ORDER, WAVE_INFO, type MasterModule, type Tier } from './domain';
import { CARD, Filter, SearchBox, TD, TH, TierPill, VerdictPill } from './ui';

export function ScoreBacklogView({ rows }: { rows: MasterModule[] }) {
  const ranked = useMemo(() => masterBacklog(rows), [rows]);
  const waveLabels = useMemo(
    () => [...new Set(ranked.map((r) => WAVE_INFO[r.masterWave]?.label ?? String(r.masterWave)))],
    [ranked],
  );
  const [waveF, setWaveF] = useState<string>('все');
  const [tierF, setTierF] = useState<Tier | 'все'>('все');
  const [q, setQ] = useState('');

  const shown = ranked.filter(
    (r) =>
      (waveF === 'все' || WAVE_INFO[r.masterWave]?.label === waveF) &&
      (tierF === 'все' || r.tier === tierF) &&
      (q === '' || r.name.toLowerCase().includes(q.toLowerCase()) || String(r.id).includes(q)),
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск модуля…" />
        <Filter label="Волна" value={waveF} onChange={setWaveF} options={['все', ...waveLabels]} />
        <Filter label="Ярус" value={tierF} onChange={setTierF} options={['все', ...TIER_ORDER]} />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {shown.length} из {ranked.length} в очереди · остальные {rows.length - ranked.length} — вне
          (готово-актуально / не переносим)
        </span>
      </div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1080 }}>
            <thead>
              <tr>
                <th style={TH}>Ранг</th>
                <th style={TH}>Волна</th>
                <th style={TH}>ID</th>
                <th style={TH}>Модуль</th>
                <th style={TH}>Ярус</th>
                <th style={{ ...TH, textAlign: 'right' }}>Нужн</th>
                <th style={{ ...TH, textAlign: 'center' }}>Цел.</th>
                <th style={TH}>Задача</th>
                <th style={{ ...TH, textAlign: 'right' }}>Новинок</th>
                <th style={TH}>Вердикт</th>
                <th style={{ ...TH, textAlign: 'right' }}>Score</th>
                <th style={TH}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...TD, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                    {ranked.indexOf(r) + 1}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 700 }}>
                    {WAVE_INFO[r.masterWave]?.label ?? r.masterWave}
                  </td>
                  <td style={{ ...TD, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{r.id}</td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-3)', maxWidth: 280 }}>{r.name}</td>
                  <td style={TD}>
                    <TierPill tier={r.tier} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {r.need}
                  </td>
                  <td style={{ ...TD, textAlign: 'center', color: '#4263d8', fontWeight: 800 }}>
                    {r.inTargetRole ? '✓' : ''}
                  </td>
                  <td style={{ ...TD, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
                    {/^BAC-\d+/.test(r.bac) ? (
                      <span style={{ color: '#4263d8' }}>{r.bac}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>—</span>
                    )}
                  </td>
                  <td
                    style={{
                      ...TD,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: r.noveltyCount ? 800 : 400,
                      color: r.noveltyCount ? '#cf6b6b' : 'var(--text-faint)',
                    }}
                  >
                    {r.noveltyCount || '·'}
                  </td>
                  <td style={TD}>
                    <VerdictPill verdict={r.verdict} />
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {r.score}
                  </td>
                  <td style={{ ...TD, fontSize: 11.5, color: 'var(--text-soft)', maxWidth: 240 }}>
                    {WAVE_INFO[r.masterWave]?.action ?? ''}
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
