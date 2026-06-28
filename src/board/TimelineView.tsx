// Timeline / gantt view (brief §5.13, prototype ~451 + buildTimeline ~1934).
// Day-column header with weekend shading + "сегодня" line, one lane per task with a
// phase-segmented (or solid) bar, and a resource-load band that flags the bottleneck.
import { useMemo } from 'react';
import { useBoard } from './store';
import { TODAY, WIN_START, dayNum, shiftIso } from './model';
import { buildTimeline, DAY_W, LANE_LABEL_W } from './timeline';
import type { TlRow } from './timeline';

export function TimelineView() {
  const groups = useBoard((s) => s.groups);
  const tlDrag = useBoard((s) => s.tlDrag);
  const viewer = useBoard((s) => s.viewer);
  const setTlDrag = useBoard((s) => s.setTlDrag);
  const updateTask = useBoard((s) => s.updateTask);
  const openPanel = useBoard((s) => s.openPanel);

  const tl = useMemo(() => buildTimeline(groups, tlDrag), [groups, tlDrag]);

  // Drag a bar to shift its dates — phased tasks move via anchor, plain tasks via tl.
  // Ported 1:1 from the prototype's tlBarDown; in viewer mode a click opens the panel.
  const onBarDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (viewer) {
      openPanel(id);
      return;
    }
    const sx = e.clientX;
    let moved = false;
    const move = (ev: MouseEvent) => {
      const dd = Math.round((ev.clientX - sx) / DAY_W);
      if (dd !== 0) moved = true;
      setTlDrag({ id, dd });
    };
    const up = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      const dd = Math.round((ev.clientX - sx) / DAY_W);
      const t = groups.flatMap((g) => g.tasks).find((x) => x.id === id);
      if (dd !== 0 && t && t.phases && t.anchor) {
        updateTask(id, {
          anchor: { ...t.anchor, date: shiftIso(t.anchor.date, dd) },
        });
      } else if (dd !== 0 && t && t.tl) {
        updateTask(id, {
          tl: { start: shiftIso(t.tl.start, dd), end: shiftIso(t.tl.end, dd) },
        });
      } else if (!moved) {
        openPanel(id);
      }
      setTlDrag(null);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const ws = dayNum(WIN_START);

  return (
    <div style={{ padding: '18px 0 60px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          padding: '0 22px 14px',
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
          Таймлайн переезда
        </h2>
        <span
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)' }}
        >
          {tl.rangeLabel}
        </span>
      </div>

      <div style={{ overflowX: 'auto', padding: '0 22px' }}>
        <div style={{ minWidth: tl.totalMinW }}>
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--hover)',
              position: 'sticky',
              top: 0,
              zIndex: 4,
              background: 'var(--glass)',
              backdropFilter: 'blur(14px) saturate(150%)',
              WebkitBackdropFilter: 'blur(14px) saturate(150%)',
            }}
          >
            <div style={{ width: LANE_LABEL_W, flexShrink: 0 }} />
            {tl.days.map((d) => (
              <div
                key={d.i}
                style={{
                  width: DAY_W,
                  flexShrink: 0,
                  textAlign: 'center',
                  padding: '6px 0 5px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: d.color,
                  background: d.colBg,
                  position: 'relative',
                }}
              >
                {d.monthFirst && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: 4,
                      fontSize: 9,
                      color: 'var(--text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: '.3px',
                    }}
                  >
                    {d.monthLabel}
                  </span>
                )}
                {d.label}
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: LANE_LABEL_W,
                display: 'flex',
                pointerEvents: 'none',
              }}
            >
              {tl.days.map((d) => (
                <div
                  key={d.i}
                  style={{
                    width: DAY_W,
                    background: d.colBg,
                    borderRight: '1px solid var(--hover)',
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: tl.todayLeftPx,
                width: 2,
                background: '#4263d8',
                opacity: 0.45,
                pointerEvents: 'none',
              }}
            />

            {tl.groups.map((grp) => (
              <div key={grp.name}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 34,
                    paddingLeft: 6,
                    marginTop: 8,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      background: grp.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: grp.color,
                      letterSpacing: '-.2px',
                    }}
                  >
                    {grp.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-faint)',
                      background: 'var(--surf-1)',
                      padding: '1px 7px',
                      borderRadius: 9,
                    }}
                  >
                    {grp.count}
                  </span>
                </div>
                {grp.rows.map((r) => (
                  <Lane key={r.key} r={r} viewer={viewer} onDown={onBarDown} />
                ))}
              </div>
            ))}

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '2px solid var(--hover)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  height: 30,
                  paddingLeft: 6,
                  marginBottom: 4,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-mut)"
                  strokeWidth="2"
                >
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </svg>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: 'var(--text-2)',
                  }}
                >
                  Загрузка ресурсов
                </span>
                {tl.flag && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#cf6b6b',
                      background: 'rgba(207,107,107,0.12)',
                      padding: '3px 10px',
                      borderRadius: 7,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                    </svg>
                    Бутылочное горло · {tl.flag}
                  </span>
                )}
              </div>
              {tl.resources.map((rs) => (
                <div
                  key={rs.id}
                  style={{ display: 'flex', alignItems: 'center', height: 28 }}
                >
                  <div
                    style={{
                      width: LANE_LABEL_W,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      paddingLeft: 18,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: rs.color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9.5,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {rs.initials}
                    </div>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--text-3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {rs.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {rs.cells.map((cl, i) => {
                      const today = ws + i === dayNum(TODAY);
                      return (
                        <div
                          key={i}
                          style={{
                            width: DAY_W,
                            height: 16,
                            flexShrink: 0,
                            background: cl.bg,
                            borderRight: '1px solid var(--glass)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 9,
                            fontWeight: 800,
                            boxShadow: today
                              ? 'inset 0 0 0 9999px rgba(66,99,216,0.05)'
                              : undefined,
                          }}
                        >
                          {cl.count}
                        </div>
                      );
                    })}
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

function Lane({
  r,
  viewer,
  onDown,
}: {
  r: TlRow;
  viewer: boolean;
  onDown: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 38,
        borderTop: '1px solid var(--hover)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: LANE_LABEL_W,
          flexShrink: 0,
          padding: '0 12px 0 18px',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--text-3)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {r.name}
      </div>
      <div style={{ position: 'relative', flex: 1, height: '100%' }}>
        {r.hasBar && (
          <div
            onMouseDown={(e) => onDown(r.key, e)}
            className="tlbar"
            style={{
              position: 'absolute',
              top: 7,
              left: r.left,
              width: r.width,
              height: 24,
              borderRadius: 8,
              cursor: viewer ? 'pointer' : 'grab',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              boxShadow:
                '0 3px 10px var(--shadow), inset 0 1px 0 var(--glass-edge)',
              userSelect: 'none',
            }}
          >
            {r.isPhased &&
              r.segs.map((sg, i) => (
                <div
                  key={i}
                  style={{
                    width: sg.width,
                    height: '100%',
                    background: sg.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  {sg.short}
                </div>
              ))}
            {r.solid && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: r.bg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 9px',
                  color: '#fff',
                  fontSize: 10.5,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: r.statusBg,
                    boxShadow: '0 0 0 1.5px var(--glass)',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.barLabel}
                </span>
              </div>
            )}
          </div>
        )}
        {r.noBar && (
          <span
            style={{
              position: 'absolute',
              left: 6,
              top: 12,
              fontSize: 11,
              color: 'var(--line)',
              fontStyle: 'italic',
            }}
          >
            нет дат
          </span>
        )}
      </div>
    </div>
  );
}
