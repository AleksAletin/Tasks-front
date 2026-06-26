// Parity matrix (brief §5.14, prototype ~724 + buildParity ~1983) — role × module grid,
// solid-color cells, click cycles state, per-role readiness % + switch gate, divergence dot.
import { useBoard } from './store';
import {
  type ParityKey,
  PARITY_COLS,
  PARITY_DIVERGED,
  PARITY_ORDER,
  PARITY_STATES,
} from './model';

const ACCENT = '#4263d8';
const GRID = '200px repeat(6,1fr) 190px';

interface ParityCell {
  col: string;
  state: ParityKey;
  label: string;
  color: string;
  hatch: boolean;
  diverged: boolean;
}
interface ParityRow {
  id: string;
  name: string;
  color: string;
  cells: ParityCell[];
  pct: number;
  ready: boolean;
  barColor: string;
  gateLabel: string;
  gateBg: string;
  gateFg: string;
}

export function ParityView() {
  const groups = useBoard((s) => s.groups);
  const parity = useBoard((s) => s.parity);
  const viewer = useBoard((s) => s.viewer);
  const cycleParity = useBoard((s) => s.cycleParity);

  const rows: ParityRow[] = groups.map((g) => {
    const cells: ParityCell[] = PARITY_COLS.map((c) => {
      const stt: ParityKey = parity[g.id]?.[c] || 'none';
      const m = PARITY_STATES[stt];
      const diverged = PARITY_DIVERGED[g.id] === c && stt !== 'skip';
      return {
        col: c,
        state: stt,
        label: diverged ? m.label + ' · расхождение с тикетом' : m.label,
        color: stt === 'skip' ? 'transparent' : m.color,
        hatch: stt === 'skip',
        diverged,
      };
    });
    const counted = cells.filter((c) => c.state !== 'skip');
    const done = counted.filter((c) => c.state === 'done').length;
    const pct = counted.length ? Math.round((done / counted.length) * 100) : 100;
    const ready = pct === 100;
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      cells,
      pct,
      ready,
      barColor: ready ? '#4a9b7f' : ACCENT,
      gateLabel: ready ? 'Переключить роль' : pct + '% готовности',
      gateBg: ready ? '#4a9b7f' : 'rgba(0,0,0,0.05)',
      gateFg: ready ? '#fff' : '#9a9da2',
    };
  });

  const legend = PARITY_ORDER.map((k) => ({
    label: PARITY_STATES[k].label,
    color: PARITY_STATES[k].color,
    hatch: k === 'skip',
  }));

  return (
    <div style={{ padding: '20px 22px 50px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>Паритет-матрица</h2>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#797d84' }}>
          состояние «старое ↔ новое» по (роль × модуль) · клик по ячейке меняет
        </span>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          border: '1px solid rgba(255,255,255,0.55)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#8a8d92' }}>Роль · модуль</div>
          {PARITY_COLS.map((c) => (
            <div
              key={c}
              style={{
                padding: '12px 6px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#8a8d92',
                borderLeft: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              {c}
            </div>
          ))}
          <div
            style={{
              padding: '12px 16px',
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#8a8d92',
              borderLeft: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            Готовность роли
          </div>
        </div>

        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'grid',
              gridTemplateColumns: GRID,
              borderBottom: '1px solid rgba(0,0,0,0.04)',
              alignItems: 'stretch',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 16px' }}>
              <span className="noinv" style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2a2d32' }}>{r.name}</span>
            </div>
            {r.cells.map((cell) => (
              <div
                key={cell.col}
                onClick={() => {
                  if (!viewer) cycleParity(r.id, cell.col);
                }}
                title={cell.label}
                style={{
                  position: 'relative',
                  minHeight: 48,
                  cursor: viewer ? 'default' : 'pointer',
                  borderLeft: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                {cell.hatch ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 5,
                      borderRadius: 6,
                      background:
                        'repeating-linear-gradient(45deg,#dededa,#dededa 4px,#f3f3ef 4px,#f3f3ef 8px)',
                    }}
                  />
                ) : (
                  <div
                    className="noinv"
                    style={{
                      position: 'absolute',
                      inset: 5,
                      borderRadius: 6,
                      background: cell.color,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                  />
                )}
                {cell.diverged && (
                  <span
                    className="noinv"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: '#cf6b6b',
                      border: '1.5px solid #fff',
                      animation: 'blinkdot 1.1s ease-in-out infinite, pulsering 1.6s ease-out infinite',
                    }}
                  />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderLeft: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#ececea', overflow: 'hidden' }}>
                <div className="noinv" style={{ height: '100%', width: r.pct + '%', background: r.barColor }} />
              </div>
              <span
                className="mono"
                style={{ fontSize: 12.5, fontWeight: 800, color: r.barColor, minWidth: 36, textAlign: 'right' }}
              >
                {r.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#8a8d92' }}>Легенда:</span>
        {legend.map((lg) => (
          <div key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#5b5f66' }}>
            {lg.hatch ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: 'repeating-linear-gradient(45deg,#dededa,#dededa 3px,#f3f3ef 3px,#f3f3ef 6px)',
                }}
              />
            ) : (
              <span className="noinv" style={{ width: 14, height: 14, borderRadius: 4, background: lg.color }} />
            )}
            {lg.label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, margin: '26px 0 12px' }}>Гейт переключения ролей</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.55)',
              borderRadius: 13,
              padding: '12px 14px',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <span className="noinv" style={{ width: 9, height: 9, borderRadius: 3, background: r.color }} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 800, color: r.barColor }}>
              {r.pct}%
            </span>
            <button
              disabled={viewer || !r.ready}
              className="noinv"
              style={{
                height: 32,
                padding: '0 14px',
                border: 'none',
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: r.ready && !viewer ? 'pointer' : 'default',
                background: r.gateBg,
                color: r.gateFg,
              }}
            >
              {r.gateLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
