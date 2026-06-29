// Inline-edit popover (brief §5.5, prototype ~1183 + buildPopup ~2037).
// Driven by `popup` state: status/priority/type/source pills, section list, people picker, calendar.
import { useState, type CSSProperties } from 'react';
import { useBoard } from './store';
import {
  type LabelDef,
  type LabelField,
  type PrioKey,
  type SourceKey,
  type StatusKey,
  type Sub,
  type Task,
  type TypeKey,
  DOWS,
  LABEL_PALETTE,
  MONTHS_FULL,
  PEOPLE,
  PHASE_ORDER,
  PHASES,
  SECTIONS,
  TODAY,
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
  const setDue = useBoard((s) => s.setDue);

  if (!popup) return null;
  const task: Task | undefined = groups
    .flatMap((g) => g.tasks)
    .find((t) => t.id === popup.taskId);
  const sub: Sub | undefined = popup.subId
    ? task?.subs?.find((x) => x.id === popup.subId)
    : undefined;
  const dueSeed = (popup.subId ? sub?.due : task?.due) ?? null;

  const apply = (patch: Partial<Task> & Partial<Sub>) => {
    if (popup.taskId && popup.subId)
      updateSub(popup.taskId, popup.subId, patch);
    else if (popup.taskId) updateTask(popup.taskId, patch);
    closePopup();
  };

  const isLabelKind =
    popup.kind === 'status' ||
    popup.kind === 'priority' ||
    popup.kind === 'type' ||
    popup.kind === 'source';
  const w =
    popup.kind === 'date'
      ? 280
      : popup.kind === 'phases'
        ? 340
        : popup.kind === 'note'
          ? 320
          : isLabelKind
            ? 252
            : 200;

  return (
    <GlassPopover x={popup.x} y={popup.y} onClose={closePopup} minWidth={w}>
      {popup.kind === 'phases' && task && task.phases && (
        <PhaseEditor task={task} />
      )}
      {popup.kind === 'status' && (
        <LabelPicker
          field="status"
          onPick={(k) => apply({ status: k as StatusKey })}
        />
      )}
      {popup.kind === 'priority' && (
        <LabelPicker
          field="priority"
          onPick={(k) => apply({ priority: k as PrioKey })}
        />
      )}
      {popup.kind === 'type' && (
        <LabelPicker
          field="type"
          onPick={(k) => apply({ type: k as TypeKey })}
        />
      )}
      {popup.kind === 'source' && (
        <LabelPicker
          field="source"
          onPick={(k) => apply({ source: k as SourceKey })}
        />
      )}
      {popup.kind === 'section' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {SECTIONS.map((sec) => (
            <div
              key={sec}
              onClick={() => apply({ section: sec })}
              style={{
                padding: '8px 10px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: 'var(--line)',
                }}
              />
              {sec}
            </div>
          ))}
        </div>
      )}
      {popup.kind === 'people' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 220,
          }}
        >
          <div
            onClick={() => apply({ owner: null })}
            style={{
              padding: '8px 10px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-faint)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: '1.5px dashed var(--line)',
              }}
            />
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
                color: 'var(--text-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
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
        <Calendar
          due={dueSeed}
          onPick={(d) => {
            // Task due is linked to the timeline bar (setDue moves the bar); sub due is plain.
            if (popup.subId) updateSub(popup.taskId!, popup.subId, { due: d });
            else setDue(popup.taskId!, d);
            closePopup();
          }}
          onClear={() => {
            if (popup.subId) updateSub(popup.taskId!, popup.subId, { due: null });
            else setDue(popup.taskId!, null);
            closePopup();
          }}
        />
      )}
      {popup.kind === 'note' && task && (
        <NoteEditor
          value={task.note}
          onChange={(v) => updateTask(popup.taskId!, { note: v })}
          onClose={closePopup}
        />
      )}
    </GlassPopover>
  );
}

// Free-text note editor (the «Примечания» cell). Edits live so the cell + sync update as you type.
function NoteEditor({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div style={{ minWidth: 300, padding: 4 }}>
      <textarea
        value={v}
        autoFocus
        onChange={(e) => {
          setV(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Примечание…"
        style={{
          width: '100%',
          minHeight: 92,
          resize: 'vertical',
          border: '1px solid var(--scrim)',
          borderRadius: 9,
          padding: '9px 11px',
          fontSize: 13,
          lineHeight: 1.45,
          outline: 'none',
          background: 'var(--card)',
          color: 'var(--text)',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
    </div>
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
        background: 'var(--hover)',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text-mut)',
      }}
    >
      {label}
    </div>
  );

  return (
    <div style={{ minWidth: 324, padding: '4px 4px 2px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 13,
          fontWeight: 800,
          padding: '2px 4px 12px',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
        >
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
        Даты по фазам
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'var(--hover)',
            borderRadius: 8,
            padding: 2,
          }}
        >
          <div
            onClick={() => phaseAnchorType(task.id, 'start')}
            style={{
              padding: '5px 11px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: isStart ? ACCENT : 'transparent',
              color: isStart ? '#fff' : 'var(--text-soft)',
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
              color: isStart ? 'var(--text-soft)' : '#fff',
            }}
          >
            Дедлайн
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {stepBtn('−', () => phaseAnchorShift(task.id, -1))}
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            minWidth: 58,
            textAlign: 'center',
          }}
        >
          {fmt(a.date)}
        </div>
        {stepBtn('+', () => phaseAnchorShift(task.id, 1))}
      </div>

      {PHASE_ORDER.map((k) => {
        const ph = phases[k];
        const res = personById(ph.res);
        return (
          <div
            key={k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 4px',
              borderTop: '1px solid var(--hover)',
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: PHASES[k].color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
              {PHASES[k].label}
            </span>
            <div
              onClick={() => phaseRes(task.id, k)}
              className="phres"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: res ? res.color : 'var(--line)',
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
                  background: 'var(--hover)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-mut)',
                }}
              >
                −
              </div>
              <div
                style={{
                  minWidth: 46,
                  textAlign: 'center',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {ph.days} дн
              </div>
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
                  background: 'var(--hover)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-mut)',
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
        <span style={{ color: 'var(--text-soft)' }}>Старт</span>
        <span>{fmt(cp.start)}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="2.4"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span style={{ color: 'var(--text-soft)' }}>Финал</span>
        <span>{fmt(cp.end)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: ACCENT }}>{cp.total} дн</span>
      </div>
    </div>
  );
}

// Editable pill picker for the four label fields (status/priority/type/source).
// Normal mode: click a pill to assign it. Edit mode (toggle «Изменить метки»): recolor
// (swatch → palette), rename (input), remove (✕), and «+ Добавить метку» — all writing
// through the store registry, which syncs to the backend via /prefs.
function LabelPicker({
  field,
  onPick,
}: {
  field: LabelField;
  onPick: (key: string) => void;
}) {
  const labels = useBoard((s) => s.labels[field]);
  const addLabel = useBoard((s) => s.addLabel);
  const editLabel = useBoard((s) => s.editLabel);
  const removeLabel = useBoard((s) => s.removeLabel);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {labels.map((l) => (
          <LabelEditRow
            key={l.key}
            def={l}
            canRemove={labels.length > 1}
            onChange={(patch) => editLabel(field, l.key, patch)}
            onRemove={() => removeLabel(field, l.key)}
          />
        ))}
        <div
          onClick={() => addLabel(field)}
          style={{
            height: 32,
            borderRadius: 8,
            border: '1px dashed var(--line)',
            color: 'var(--text-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Добавить метку
        </div>
        <div
          onClick={() => setEditing(false)}
          style={{
            height: 30,
            borderRadius: 8,
            background: ACCENT,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Готово
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {labels.map((l) => (
        <div
          key={l.key}
          onClick={() => onPick(l.key)}
          style={{
            height: 34,
            borderRadius: 8,
            background: l.bg,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 1px var(--hover)',
          }}
        >
          {l.label}
        </div>
      ))}
      <div
        onClick={() => setEditing(true)}
        style={{
          marginTop: 2,
          height: 28,
          borderRadius: 7,
          color: 'var(--text-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
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
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
        Изменить метки
      </div>
    </div>
  );
}

function LabelEditRow({
  def,
  canRemove,
  onChange,
  onRemove,
}: {
  def: LabelDef;
  canRemove: boolean;
  onChange: (patch: Partial<LabelDef>) => void;
  onRemove: () => void;
}) {
  const [showPalette, setShowPalette] = useState(false);
  const swatch = (c: string, ring: boolean): CSSProperties => ({
    width: 20,
    height: 20,
    flexShrink: 0,
    borderRadius: 6,
    background: c,
    cursor: 'pointer',
    boxShadow: ring
      ? '0 0 0 2px var(--text), inset 0 0 0 2px var(--card)'
      : 'inset 0 0 0 1px var(--hover)',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div
          onClick={() => setShowPalette((v) => !v)}
          title="Цвет"
          style={swatch(def.bg, false)}
        />
        <input
          value={def.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Название"
          style={{
            flex: 1,
            minWidth: 0,
            height: 30,
            border: '1px solid var(--scrim)',
            borderRadius: 7,
            padding: '0 9px',
            fontSize: 13,
            outline: 'none',
            background: 'var(--card)',
            color: 'var(--text)',
          }}
        />
        <div
          onClick={canRemove ? onRemove : undefined}
          title={canRemove ? 'Удалить' : 'Нужна хотя бы одна метка'}
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            color: canRemove ? 'var(--text-faint)' : 'var(--line)',
            cursor: canRemove ? 'pointer' : 'not-allowed',
            fontSize: 15,
          }}
        >
          ✕
        </div>
      </div>
      {showPalette && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '2px 0 4px 27px',
          }}
        >
          {LABEL_PALETTE.map((c) => (
            <div
              key={c}
              onClick={() => {
                onChange({ bg: c });
                setShowPalette(false);
              }}
              style={swatch(c, c === def.bg)}
            />
          ))}
        </div>
      )}
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
  const [m, setM] = useState({
    y: parseInt(seed.slice(0, 4), 10),
    m0: parseInt(seed.slice(5, 7), 10) - 1,
  });

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px 10px',
        }}
      >
        <div
          onClick={() => nav(-1)}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 7,
            cursor: 'pointer',
            color: 'var(--text-mut)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>
          {MONTHS_FULL[m.m0]} {m.y}
        </div>
        <div
          onClick={() => nav(1)}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 7,
            cursor: 'pointer',
            color: 'var(--text-mut)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7,1fr)',
          gap: 2,
          marginBottom: 4,
        }}
      >
        {DOWS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-faint)',
              padding: '3px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((w, wi) => (
        <div
          key={wi}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gap: 2,
          }}
        >
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
                  color: sel ? '#fff' : today ? ACCENT : 'var(--text-3)',
                  boxShadow:
                    today && !sel ? `inset 0 0 0 1.5px ${ACCENT}` : 'none',
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          gap: 6,
          borderTop: '1px solid var(--surf-1)',
          marginTop: 8,
          paddingTop: 8,
        }}
      >
        <button
          onClick={() => onPick(TODAY)}
          style={{
            flex: 1,
            height: 30,
            border: '1px solid var(--surf-2)',
            background: 'var(--card)',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            color: 'var(--text-3)',
          }}
        >
          Сегодня
        </button>
        <button
          onClick={onClear}
          style={{
            flex: 1,
            height: 30,
            border: '1px solid var(--surf-2)',
            background: 'var(--card)',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            color: '#cf6b6b',
          }}
        >
          Очистить
        </button>
      </div>
    </div>
  );
}
