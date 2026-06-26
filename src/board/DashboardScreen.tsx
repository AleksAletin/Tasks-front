// Дашборд переезда — бизнес-витрина (brief §5.18, prototype ~780 template + buildDonut ~1908,
// runCountUp ~1866, kpis/milestones/risks ~2182). Read-only showcase: count-up KPIs, one wide
// status battery, an SVG status donut animated via the `drawdash` keyframe, a milestone timeline,
// and a data-derived risk list. Adapts to a single column on narrow (projector / TV) viewports.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBoard } from './store';
import { STATUS, STATUS_ORDER, type StatusKey, type Task } from './model';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.58)',
  backdropFilter: 'blur(20px) saturate(165%)',
  WebkitBackdropFilter: 'blur(20px) saturate(165%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
  borderRadius: 14,
};

interface Kpi {
  value: string;
  label: string;
  sub: string;
}
interface Milestone {
  date: string;
  label: string;
  done: boolean;
}
interface Segment {
  key: StatusKey;
  label: string;
  bg: string;
  val: number;
  pct: string;
  frac: number;
}

// rAF count-up easing (cubic ease-out), mirrors the prototype's runCountUp over ~900ms.
function useCountUp(): number {
  const [t, setT] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const dur = 900;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setT(e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  return t;
}

// Single width breakpoint for the projector / TV collapse to one column.
function useNarrow(threshold = 1040): boolean {
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < threshold : false));
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < threshold);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [threshold]);
  return narrow;
}

export function DashboardScreen() {
  const groups = useBoard((s) => s.groups);
  const openPanel = useBoard((s) => s.openPanel);
  const t = useCountUp();
  const narrow = useNarrow();

  const allTasks = useMemo<Task[]>(() => groups.flatMap((g) => g.tasks), [groups]);

  // Status distribution — shared by the battery, donut, and done%. Computed from live data.
  const dist = useMemo(() => {
    const cnt: Record<StatusKey, number> = { work: 0, done: 0, stuck: 0, plan: 0 };
    allTasks.forEach((task) => {
      cnt[task.status]++;
    });
    const total = allTasks.length || 1;
    const segs: Segment[] = STATUS_ORDER.filter((k) => cnt[k] > 0).map((k) => {
      const frac = cnt[k] / total;
      return { key: k, label: STATUS[k].label, bg: STATUS[k].bg, val: cnt[k], pct: (frac * 100).toFixed(1) + '%', frac };
    });
    return { segs, total: allTasks.length, donePct: Math.round((cnt.done / total) * 100) };
  }, [allTasks]);

  // KPI set — exact values / labels from the prototype, animated on mount by `t`.
  const kpiNum = (n: number, dec?: boolean) => {
    const v = n * t;
    return dec ? v.toFixed(1) : String(Math.round(v));
  };
  const kpis: Kpi[] = [
    { value: kpiNum(62) + '%', label: 'Ролей переключено', sub: '8 из 13 модулей' },
    { value: kpiNum(14) + ' дн', label: 'Окно overlap', sub: 'старое ↔ Work параллельно' },
    { value: kpiNum(8.4, true), label: 'Скорость', sub: 'задач / неделю' },
    { value: kpiNum(91) + '%', label: 'Hit-rate витрины', sub: '+4 п.п. за неделю' },
    { value: kpiNum(3), label: 'Escaped defects', sub: 'за текущий спринт' },
  ];

  const milestones: Milestone[] = [
    { date: '20 июн', label: 'Справочники ролей перенесены', done: true },
    { date: '30 июн', label: 'Импорт базы клиентов завершён', done: false },
    { date: '05 июл', label: 'Синк с YouTrack включён', done: false },
    { date: '14 июл', label: 'Приёмка SLA и витрины', done: false },
  ];

  // Risks — stuck or critical tasks (data-derived), capped at 4. Same shape the prototype shows.
  const risks = useMemo(
    () =>
      allTasks
        .filter((task) => task.status === 'stuck' || task.priority === 'crit')
        .slice(0, 4)
        .map((task) => {
          const g = groups.find((gr) => gr.tasks.some((x) => x.id === task.id));
          const high = task.status === 'stuck';
          return {
            id: task.id,
            title: task.name,
            sub: (task.note || 'требует внимания') + ' · ' + (g ? g.name : ''),
            bg: high ? '#fbf0f0' : '#fbf6ef',
            dot: high ? '#cf6b6b' : '#d6953f',
          };
        }),
    [allTasks, groups],
  );

  const kpiCols = narrow ? '1fr' : 'repeat(5, 1fr)';
  const mainCols = narrow ? '1fr' : '1fr 1fr';

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1280 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.4px' }}>
          Дашборд переезда — бизнес-витрина
        </h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
            color: '#3a7d63',
            background: '#e8f3ee',
            padding: '3px 10px',
            borderRadius: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Витрина для бизнеса · только просмотр
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#797d84' }}>обновлено 14 мин назад</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: 14, marginTop: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="dashkpi" style={{ ...CARD, padding: '16px 18px' }}>
            <div
              className="mono"
              style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: '#23262b' }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3d42', marginTop: 6 }}>{k.label}</div>
            <div style={{ fontSize: 12, color: '#9a9da2', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mainCols, gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Общий прогресс переезда</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#4a9b7f' }}>
                {dist.donePct}% готово
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                height: 26,
                borderRadius: 8,
                overflow: 'hidden',
                marginTop: 14,
                boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              {dist.segs.map((s) => (
                <div key={s.key} className="noinv" style={{ width: s.pct, background: s.bg }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
              {dist.segs.map((s) => (
                <div
                  key={s.key}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#5b5f66' }}
                >
                  <span className="noinv" style={{ width: 11, height: 11, borderRadius: 3, background: s.bg }} />
                  {s.label} · {s.val}
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Таймлайн вех</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '8px 0' }}>
                  <div
                    className="mono"
                    style={{ width: 60, textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#9a9da2' }}
                  >
                    {m.date}
                  </div>
                  <div
                    className="noinv"
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: m.done ? '#4a9b7f' : '#fff',
                      border: `2.5px solid ${m.done ? '#4a9b7f' : '#d2d2cc'}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: m.done ? '#9a9da2' : '#3a3d42' }}>{m.label}</div>
                  {m.done && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#4a9b7f',
                        background: '#e8f3ee',
                        padding: '2px 8px',
                        borderRadius: 5,
                      }}
                    >
                      готово
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Распределение статусов</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 12, flexWrap: 'wrap' }}>
              <Donut segs={dist.segs} total={dist.total} progress={t} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dist.segs.map((s) => (
                  <div
                    key={s.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#3a3d42' }}
                  >
                    <span className="noinv" style={{ width: 11, height: 11, borderRadius: 3, background: s.bg }} />
                    {s.label}
                    <span style={{ color: '#9a9da2', fontWeight: 700, marginLeft: 2 }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Риски и блокеры</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {risks.map((r) => (
                <div
                  key={r.id}
                  onClick={() => openPanel(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '9px 11px',
                    background: r.bg,
                    borderRadius: 9,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="noinv"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: r.dot, marginTop: 5, flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3a3d42' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#797d84', marginTop: 1 }}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SVG donut of task counts by status. Each segment is a stroked arc; the `drawdash` keyframe
// sweeps stroke-dashoffset from --circ (hidden) to --off (placed) so segments draw in on entry.
function Donut({ segs, total, progress }: { segs: Segment[]; total: number; progress: number }) {
  const size = 128;
  const stroke = 24;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={stroke} />
        {segs.map((s) => {
          const len = s.frac * circ * progress;
          const off = -acc * circ * progress;
          acc += s.frac;
          return (
            <circle
              key={s.key}
              className="noinv"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.bg}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={off}
              style={
                {
                  '--circ': `${circ}px`,
                  '--off': `${off}px`,
                  animation: 'drawdash .9s ease-out',
                } as React.CSSProperties
              }
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="mono" style={{ fontSize: 24, fontWeight: 800 }}>
          {total}
        </span>
        <span style={{ fontSize: 10, color: '#9a9da2', fontWeight: 600 }}>задач</span>
      </div>
    </div>
  );
}
