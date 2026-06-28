// Календарь дедлайнов (brief §5.13, prototype ~527 template + buildCalView ~1956).
// Month grid (weeks × DOWS) with today highlighted, deadline chips per day colored by task
// status, +N overflow, and month navigation (← / → / Сегодня). calMonth lives in the store.
import { useMemo } from 'react';
import { useBoard } from './store';
import { DOWS, MONTHS_FULL, STATUS, TODAY, iso, type Task } from './model';

const ACCENT = '#4263d8';

interface CalChip {
  id: string;
  name: string;
  bg: string;
}
interface CalCell {
  key: string;
  empty: boolean;
  day: number | null;
  cellBg: string;
  dayColor: string;
  dayBg: string;
  chips: CalChip[];
  more: number;
}

export function CalendarView() {
  const allGroups = useBoard((s) => s.groups);
  const activeBoardId = useBoard((s) => s.activeBoardId);
  const groups = useMemo(
    () => allGroups.filter((g) => (g.boardId ?? 'b1') === activeBoardId),
    [allGroups, activeBoardId],
  );
  const calMonth = useBoard((s) => s.calMonth);
  const shiftCalMonth = useBoard((s) => s.shiftCalMonth);
  const setCalMonth = useBoard((s) => s.setCalMonth);
  const openPanel = useBoard((s) => s.openPanel);

  const allTasks = useMemo<Task[]>(
    () => groups.flatMap((g) => g.tasks),
    [groups],
  );

  const weeks = useMemo<CalCell[][]>(() => {
    const { y, m0 } = calMonth;
    const first = new Date(Date.UTC(y, m0, 1));
    const startW = (first.getUTCDay() + 6) % 7;
    const dim = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startW; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const out: CalCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      out.push(
        cells.slice(i, i + 7).map((d, j): CalCell => {
          if (!d) {
            return {
              key: 'e' + i + j,
              empty: true,
              day: null,
              cellBg: 'var(--hover)',
              dayColor: 'var(--text-3)',
              dayBg: 'transparent',
              chips: [],
              more: 0,
            };
          }
          const isoStr = iso(y, m0, d);
          const dayTasks = allTasks.filter((t) => t.due === isoStr);
          const chips = dayTasks
            .slice(0, 3)
            .map((t) => ({ id: t.id, name: t.name, bg: STATUS[t.status].bg }));
          const more = Math.max(0, dayTasks.length - 3);
          const today = isoStr === TODAY;
          return {
            key: isoStr,
            empty: false,
            day: d,
            cellBg: today ? 'rgba(66,99,216,0.05)' : 'transparent',
            dayColor: today ? '#fff' : 'var(--text-3)',
            dayBg: today ? ACCENT : 'transparent',
            chips,
            more,
          };
        }),
      );
    }
    return out;
  }, [calMonth, allTasks]);

  const label = MONTHS_FULL[calMonth.m0] + ' ' + calMonth.y;

  return (
    <div style={{ padding: '18px 22px 50px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
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
          Календарь дедлайнов
        </h2>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            onClick={() => shiftCalMonth(-1)}
            title="Предыдущий месяц"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              cursor: 'pointer',
              color: 'var(--text-mut)',
              background: 'var(--glass)',
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
          <div
            style={{
              minWidth: 150,
              textAlign: 'center',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
          <div
            onClick={() => shiftCalMonth(1)}
            title="Следующий месяц"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              cursor: 'pointer',
              color: 'var(--text-mut)',
              background: 'var(--glass)',
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
          <button
            onClick={() => {
              const p = TODAY.split('-');
              setCalMonth({
                y: parseInt(p[0], 10),
                m0: parseInt(p[1], 10) - 1,
              });
            }}
            style={{
              height: 32,
              padding: '0 14px',
              marginLeft: 6,
              border: '1px solid var(--glass)',
              background: 'var(--glass)',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-3)',
              cursor: 'pointer',
            }}
          >
            Сегодня
          </button>
        </div>
      </div>

      <div
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          border: '1px solid var(--glass)',
          boxShadow: 'inset 0 1px 0 var(--glass)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            borderBottom: '1px solid var(--hover)',
          }}
        >
          {DOWS.map((d) => (
            <div
              key={d}
              style={{
                padding: 9,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-soft)',
              }}
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((w, wi) => (
          <div
            key={wi}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
          >
            {w.map((c) => (
              <div
                key={c.key}
                style={{
                  minHeight: 114,
                  borderRight: '1px solid var(--hover)',
                  borderTop: '1px solid var(--hover)',
                  padding: '7px 7px 6px',
                  background: c.cellBg,
                }}
              >
                {!c.empty && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          minWidth: 22,
                          height: 22,
                          padding: '0 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 11,
                          fontSize: 12,
                          fontWeight: 700,
                          color: c.dayColor,
                          background: c.dayBg,
                        }}
                      >
                        {c.day}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      {c.chips.map((ct) => (
                        <div
                          key={ct.id}
                          onClick={() => openPanel(ct.id)}
                          title={ct.name}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#fff',
                            background: ct.bg,
                            padding: '3px 7px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            boxShadow:
                              'inset 0 0 0 1px var(--hover), inset 0 1px 0 var(--glass-edge)',
                          }}
                        >
                          {ct.name}
                        </div>
                      ))}
                      {c.more > 0 && (
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-faint)',
                            padding: '1px 7px',
                          }}
                        >
                          +{c.more} ещё
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
