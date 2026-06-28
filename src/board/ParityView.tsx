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
    const pct = counted.length
      ? Math.round((done / counted.length) * 100)
      : 100;
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
      gateBg: ready ? '#4a9b7f' : 'var(--hover)',
      gateFg: ready ? '#fff' : 'var(--text-faint)',
    };
  });

  const legend = PARITY_ORDER.map((k) => ({
    label: PARITY_STATES[k].label,
    color: PARITY_STATES[k].color,
    hatch: k === 'skip',
  }));

  return (
    <div style={{ padding: '20px 22px 50px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-.4px',
          }}
        >
          Паритет-матрица
        </h2>
        <span
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)' }}
        >
          состояние «старое ↔ новое» по (роль × модуль) · клик по ячейке меняет
        </span>
      </div>

      <div
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          border: '1px solid var(--glass)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 var(--glass)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            borderBottom: '1px solid var(--hover)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-soft)',
            }}
          >
            Роль · модуль
          </div>
          {PARITY_COLS.map((c) => (
            <div
              key={c}
              style={{
                padding: '12px 6px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-soft)',
                borderLeft: '1px solid var(--hover)',
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
              color: 'var(--text-soft)',
              borderLeft: '1px solid var(--hover)',
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
              borderBottom: '1px solid var(--hover)',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 16px',
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  background: r.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-2)',
                }}
              >
                {r.name}
              </span>
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
                  borderLeft: '1px solid var(--hover)',
                }}
              >
                {cell.hatch ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 5,
                      borderRadius: 6,
                      background:
                        'repeating-linear-gradient(45deg,var(--surf-2),var(--surf-2) 4px,var(--surf-1) 4px,var(--surf-1) 8px)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 5,
                      borderRadius: 6,
                      background: cell.color,
                      boxShadow: 'inset 0 1px 0 var(--glass-edge)',
                    }}
                  />
                )}
                {cell.diverged && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: '#cf6b6b',
                      border: '1.5px solid #fff',
                      animation:
                        'blinkdot 1.1s ease-in-out infinite, pulsering 1.6s ease-out infinite',
                    }}
                  />
                )}
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 16px',
                borderLeft: '1px solid var(--hover)',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 4,
                  background: 'var(--surf-1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: r.pct + '%',
                    background: r.barColor,
                  }}
                />
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: r.barColor,
                  minWidth: 36,
                  textAlign: 'right',
                }}
              >
                {r.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginTop: 14,
        }}
      >
        <span
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-soft)' }}
        >
          Легенда:
        </span>
        {legend.map((lg) => (
          <div
            key={lg.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--text-mut)',
            }}
          >
            {lg.hatch ? (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background:
                    'repeating-linear-gradient(45deg,var(--surf-2),var(--surf-2) 3px,var(--surf-1) 3px,var(--surf-1) 6px)',
                }}
              />
            ) : (
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: lg.color,
                }}
              />
            )}
            {lg.label}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 800, margin: '26px 0 12px' }}>
        Гейт переключения ролей
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--glass)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
              border: '1px solid var(--glass)',
              borderRadius: 13,
              padding: '12px 14px',
              boxShadow: 'inset 0 1px 0 var(--glass)',
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: r.color,
              }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 800, color: r.barColor }}
            >
              {r.pct}%
            </span>
            <button
              disabled={viewer || !r.ready}
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
