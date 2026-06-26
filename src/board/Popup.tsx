// Inline-edit popover (brief §5.5, prototype ~1183 + buildPopup ~2037).
// Driven by `popup` state: status/priority/type/source pills, section list, people picker, calendar.
import { useState } from 'react';
import { useBoard } from './store';
import {
  type PrioKey,
  type SourceKey,
  type StatusKey,
  type Sub,
  type Task,
  type TypeKey,
  DOWS,
  MONTHS_FULL,
  PEOPLE,
  PHASE_ORDER,
  PHASES,
  PRIO,
  PRIO_ORDER,
  SECTIONS,
  SOURCE,
  SOURCE_ORDER,
  STATUS,
  STATUS_ORDER,
  TODAY,
  TYPE,
  TYPE_ORDER,
  fmt,
  iso,
  personById,
} from './model';
import { computePhases } from './phases';
import { GlassPopover } from './ui';

const ACCENT = '#4263d8';

export function Popup() {
  const popup = useBoard((s) => s.popup);
  const groups = useBoard((s) => s.groups);
  const closePopup = useBoard((s) => s.closePopup);
  const updateTask = useBoard((s) => s.updateTask);
  const updateSub = useBoard((s) => s.updateSub);

  if (!popup) return null;
  const task: Task | undefined = groups.flatMap((g) => g.tasks).find((t) => t.id === popup.taskId);
  const sub: Sub | undefined = popup.subId ? task?.subs?.find((x) => x.id === popup.subId) : undefined;
  const dueSeed = (popup.subId ? sub?.due : task?.due) ?? null;

  const apply = (patch: Partial<Task> & Partial<Sub>) => {
    if (popup.taskId && popup.subId) updateSub(popup.taskId, popup.subId, patch);
    else if (popup.taskId) updateTask(popup.taskId, patch);
    closePopup();
  };

  const w = popup.kind === 'date' ? 280 : popup.kind === 'phases' ? 340 : 200;

  return (
    <GlassPopover x={popup.x} y={popup.y} onClose={closePopup} minWidth={w}>
      {popup.kind === 'phases' && task && task.phases && <PhaseEditor task={task} />}
      {popup.kind === 'status' && (
        <Pills
          items={STATUS_ORDER.map((k) => ({ label: STATUS[k].label, bg: STATUS[k].bg, key: k }))}
          onPick={(k) => apply({ status: k as StatusKey })}
        />
      )}
      {popup.kind === 'priority' && (
        <Pills
          items={PRIO_ORDER.map((k) => ({ label: PRIO[k].label, bg: PRIO[k].bg, key: k }))}
          onPick={(k) => apply({ priority: k as PrioKey })}
        />
      )}
      {popup.kind === 'type' && (
        <Pills
          items={TYPE_ORDER.map((k) => ({ label: TYPE[k].label, bg: TYPE[k].bg, key: k }))}
          onPick={(k) => apply({ type: k as TypeKey })}
        />
      )}
      {popup.kind === 'source' && (
        <Pills
          items={SOURCE_ORDER.map((k) => ({ label: SOURCE[k].label, bg: SOURCE[k].bg, key: k }))}
          onPick={(k) => apply({ source: k as SourceKey })}
        />
      )}
      {popup.kind === 'section' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
          {SECTIONS.map((sec) => (
            <div
              key={sec}
              onClick={() => apply({ section: sec })}
              style={{
                padding: '8px 10px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                color: '#3a3d42',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c4c4bf' }} />
              {sec}
            </div>
          ))}
        </div>
      )}
      {popup.kind === 'people' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 220 }}>
          <div
            onClick={() => apply({ owner: null })}
            style={{
              padding: '8px 10px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              color: '#9a9da2',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px dashed #cfcfca' }} />
            Без владельца
          </div>
          {PEOPLE.map((p) => (
            <div
              key={p.id}
              onClick={() => apply({ owner: p.id })}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                color: '#3a3d42',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                className="noinv"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: p.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {p.initials}
              </div>
              {p.name}
            </div>
          ))}
        </div>
      )}
      {popup.kind === 'date' && task && (
        <Calendar due={dueSeed} onPick={(d) => apply({ due: d })} onClear={() => apply({ due: null })} />
      )}
    </GlassPopover>
  );
}

// Phase-dates editor (brief §5.6, prototype buildPhaseEditor ~1589 + template ~1274).
// Per-phase duration steppers + resource avatar, a Старт/Дедлайн anchor toggle with a
// date stepper, and an auto summary. Edits go through the store's phase* actions, which
// recompute the timeline so the gantt bar updates live; the popover stays open.
function PhaseEditor({ task }: { task: Task }) {
  const phaseDays = useBoard((s) => s.phaseDays);
  const phaseRes = useBoard((s) => s.phaseRes);
  const phaseAnchorType = useBoard((s) => s.phaseAnchorType);
  const phaseAnchorShift = useBoard((s) => s.phaseAnchorShift);
  if (!task.phases) return null;
  const phases = task.phases;
  const cp = computePhases({ phases, anchor: task.anchor });
  const a = task.anchor ?? { type: 'start' as const, date: cp.start };
  const isStart = a.type === 'start';

  const stepBtn = (label: string, onClick: () => void) => (
    <div
      onClick={onClick}
      className="phstep"
      style={{
        width: 25,
        height: 25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        cursor: 'pointer',
        background: 'rgba(0,0,0,0.05)',
        fontSize: 16,
        fontWeight: 700,
        color: '#5b5f66',
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ minWidth: 324, padding: '4px 4px 2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '2px 4px 12px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Даты по фазам
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 2 }}>
          <div
            onClick={() => phaseAnchorType(task.id, 'start')}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: isStart ? ACCENT : 'transparent',
              color: isStart ? '#fff' : '#797d84',
            }}
          >
            Старт
          </div>
          <div
            onClick={() => phaseAnchorType(task.id, 'end')}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: isStart ? 'transparent' : ACCENT,
              color: isStart ? '#797d84' : '#fff',
            }}
          >
            Дедлайн
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {stepBtn('−', () => phaseAnchorShift(task.id, -1))}
        <div style={{ fontSize: 13, fontWeight: 700, minWidth: 58, textAlign: 'center' }}>{fmt(a.date)}</div>
        {stepBtn('+', () => phaseAnchorShift(task.id, 1))}
      </div>

      {PHASE_ORDER.map((k) => {
        const ph = phases[k];
        const res = personById(ph.res);
        return (
          <div
            key={k}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 4px', borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span className="noinv" style={{ width: 9, height: 9, borderRadius: 3, background: PHASES[k].color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{PHASES[k].label}</span>
            <div
              onClick={() => phaseRes(task.id, k)}
              className="noinv phres"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: res ? res.color : '#c4c4bf',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {res ? res.initials : '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                onClick={() => phaseDays(task.id, k, -1)}
                className="phstep"
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.05)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#5b5f66',
                }}
              >
                −
              </div>
              <div style={{ minWidth: 46, textAlign: 'center', fontSize: 12.5, fontWeight: 700 }}>{ph.days} дн</div>
              <div
                onClick={() => phaseDays(task.id, k, 1)}
                className="phstep"
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.05)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#5b5f66',
                }}
              >
                +
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginTop: 11,
          padding: '10px 11px',
          background: 'rgba(66,99,216,0.07)',
          borderRadius: 10,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#8a8d92' }}>Старт</span>
        <span>{fmt(cp.start)}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a6a8ab" strokeWidth="2.4">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span style={{ color: '#8a8d92' }}>Финал</span>
        <span>{fmt(cp.end)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: ACCENT }}>{cp.total} дн</span>
      </div>
    </div>
  );
}

function Pills({
  items,
  onPick,
}: {
  items: { label: string; bg: string; key: string }[];
  onPick: (key: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((it) => (
        <div
          key={it.key}
          onClick={() => onPick(it.key)}
          className="noinv"
          style={{
            height: 34,
            borderRadius: 8,
            background: it.bg,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
          }}
        >
          {it.label}
        </div>
      ))}
    </div>
  );
}

function Calendar({
  due,
  onPick,
  onClear,
}: {
  due: string | null;
  onPick: (d: string) => void;
  onClear: () => void;
}) {
  const seed = due || TODAY;
  const [m, setM] = useState({ y: parseInt(seed.slice(0, 4), 10), m0: parseInt(seed.slice(5, 7), 10) - 1 });

  const first = new Date(Date.UTC(m.y, m.m0, 1));
  const startW = (first.getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(m.y, m.m0 + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startW; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const nav = (delta: number) => {
    let { y, m0 } = m;
    m0 += delta;
    if (m0 < 0) {
      m0 = 11;
      y--;
    }
    if (m0 > 11) {
      m0 = 0;
      y++;
    }
    setM({ y, m0 });
  };

  return (
    <div style={{ minWidth: 260, padding: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
        <div
          onClick={() => nav(-1)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, cursor: 'pointer', color: '#6b6f76' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>
          {MONTHS_FULL[m.m0]} {m.y}
        </div>
        <div
          onClick={() => nav(1)}
          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, cursor: 'pointer', color: '#6b6f76' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DOWS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#b0b2b6', padding: '3px 0' }}>
            {d}
          </div>
        ))}
      </div>
      {weeks.map((w, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {w.map((d, di) => {
            if (!d) return <div key={di} />;
            const isoDate = iso(m.y, m.m0, d);
            const sel = due === isoDate;
            const today = isoDate === TODAY;
            return (
              <div
                key={di}
                onClick={() => onPick(isoDate)}
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: sel ? ACCENT : 'transparent',
                  color: sel ? '#fff' : today ? ACCENT : '#3a3d42',
                  boxShadow: today && !sel ? `inset 0 0 0 1.5px ${ACCENT}` : 'none',
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid #eeeeea', marginTop: 8, paddingTop: 8 }}>
        <button
          onClick={() => onPick(TODAY)}
          style={{ flex: 1, height: 30, border: '1px solid #e6e6e2', background: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#3a3d42' }}
        >
          Сегодня
        </button>
        <button
          onClick={onClear}
          style={{ flex: 1, height: 30, border: '1px solid #e6e6e2', background: '#fff', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#cf6b6b' }}
        >
          Очистить
        </button>
      </div>
    </div>
  );
}
