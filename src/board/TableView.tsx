// Board table view (brief §5.4) — grouped rows with solid status/priority cells,
// colored left border, mini-gantt timeline, summary "battery" rows, inline-edit popups.
import { useMemo } from 'react';
import { useBoard } from './store';
import {
  type Task,
  PHASES,
  PRIO,
  SOURCE,
  STATUS,
  TYPE,
  fmt,
  pct,
  personById,
} from './model';
import { buildView, deriveDue, type ViewGroup } from './derive';
import { Avatar, AvatarEmpty, Pill } from './ui';

const ACCENT = '#4263d8';
// checkbox 56 · Задача 264 · Владелец 100 · Статус 138 · Срок 118 · Приоритет 138
// · Шкала времени 184 · Примечания 172 · Обновлено 132 · Раздел 128 · Тип 116 · Источник 138
const GRID = '56px 264px 100px 138px 118px 138px 184px 172px 132px 128px 116px 138px';
const ROW_H = 40;

const COL_LABELS: [string, string][] = [
  ['task', 'Задача'],
  ['owner', 'Владелец'],
  ['status', 'Статус'],
  ['due', 'Срок'],
  ['priority', 'Приоритет'],
  ['tl', 'Шкала времени'],
  ['note', 'Примечания'],
  ['updated', 'Обновлено'],
  ['section', 'Раздел'],
  ['type', 'Тип'],
  ['source', 'Источник'],
];

export function TableView() {
  const groups = useBoard((s) => s.groups);
  const query = useBoard((s) => s.query);
  const filterStatus = useBoard((s) => s.filterStatus);
  const filterOwner = useBoard((s) => s.filterOwner);
  const sortBy = useBoard((s) => s.sortBy);
  const sortDir = useBoard((s) => s.sortDir);
  const groupBy = useBoard((s) => s.groupBy);
  const collapsed = useBoard((s) => s.collapsed);
  const selectedIds = useBoard((s) => s.selectedIds);
  const viewer = useBoard((s) => s.viewer);
  const toggleCollapse = useBoard((s) => s.toggleCollapse);
  const toggleSelect = useBoard((s) => s.toggleSelect);

  const { groups: viewGroups, tableEmptyAll } = useMemo(
    () => buildView({ groups, query, filterStatus, filterOwner, sortBy, sortDir, groupBy }),
    [groups, query, filterStatus, filterOwner, sortBy, sortDir, groupBy],
  );

  const allTasks = groups.flatMap((g) => g.tasks);
  const allChecked = allTasks.length > 0 && allTasks.every((t) => selectedIds[t.id]);

  return (
    <div style={{ minWidth: 1684, paddingBottom: 80 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          display: 'grid',
          gridTemplateColumns: `${GRID} 44px`,
          background: 'rgba(252,252,253,0.66)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          height: 38,
          fontSize: 12,
          fontWeight: 700,
          color: '#8a8d92',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb' }}>
          <div
            style={{
              width: 17,
              height: 17,
              borderRadius: 5,
              border: `2px solid ${allChecked ? ACCENT : '#cfcfca'}`,
              background: allChecked ? ACCENT : '#fff',
              cursor: viewer ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {allChecked && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                <path d="M5 12l5 5L20 6" />
              </svg>
            )}
          </div>
        </div>
        {COL_LABELS.map(([key, label]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: key === 'task' ? 'flex-start' : key === 'updated' ? 'flex-start' : 'center',
              paddingLeft: key === 'task' ? 6 : key === 'updated' ? 18 : 0,
              borderRight: '1px solid #efefeb',
            }}
          >
            {label}
          </div>
        ))}
        <div />
      </div>

      {tableEmptyAll && <NoResults query={query} />}

      {viewGroups.map((g) => (
        <GroupBlock
          key={g.id}
          g={g}
          collapsed={!!collapsed[g.id]}
          onToggle={() => toggleCollapse(g.id)}
          selectedIds={selectedIds}
          viewer={viewer}
          onSelect={toggleSelect}
        />
      ))}

      {!viewer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '18px 0 0 14px',
            padding: '8px 12px',
            width: 'fit-content',
            border: '1px solid #e6e6e2',
            background: '#fff',
            borderRadius: 9,
            color: '#5b5f66',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить группу
        </div>
      )}
    </div>
  );
}

function GroupBlock({
  g,
  collapsed,
  onToggle,
  selectedIds,
  viewer,
  onSelect,
}: {
  g: ViewGroup;
  collapsed: boolean;
  onToggle: () => void;
  selectedIds: Record<string, boolean>;
  viewer: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ marginTop: 14, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0 6px 6px', height: 34 }}>
        <div
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: g.color,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform .12s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <span className="noinv" style={{ fontWeight: 700, fontSize: 15, color: g.color, letterSpacing: '-.2px' }}>
          {g.name}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#a6a8ab',
            background: '#f0f0ec',
            padding: '1px 8px',
            borderRadius: 10,
          }}
        >
          {g.count}
        </span>
        {collapsed && (
          <div style={{ display: 'flex', height: 9, width: 120, borderRadius: 5, overflow: 'hidden', marginLeft: 6 }}>
            {g.summary.statusSegs.map((s, i) => (
              <div key={i} className="noinv" style={{ width: s.pct, background: s.bg }} />
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div>
          {g.tasks.map((t) => (
            <Row key={t.id} t={t} g={g} selected={!!selectedIds[t.id]} viewer={viewer} onSelect={onSelect} />
          ))}

          {!g.empty && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                height: 34,
                borderLeft: `3px solid ${g.color}`,
                borderBottom: '1px solid #efefeb',
                background: 'rgba(252,252,251,0.45)',
              }}
            >
              <div />
              <div />
              <div />
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <Battery segs={g.summary.statusSegs} />
              </div>
              <div />
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <Battery segs={g.summary.prioSegs} />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9a9da2',
                }}
              >
                {g.summary.tlLabel}
              </div>
              <div />
              <div />
              <div />
              <div />
              <div />
            </div>
          )}

          {g.emptyPlain && (
            <EmptyRow color={g.color} icon="board">
              В роли пока нет задач.
            </EmptyRow>
          )}
          {g.emptyFiltered && (
            <EmptyRow color={g.color} icon="search">
              Под фильтр в этой группе ничего не подошло.
            </EmptyRow>
          )}

          {!viewer && !g.empty && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 0 0 19px',
                height: 36,
                borderLeft: '3px solid transparent',
                color: '#9a9da2',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить задача
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  t,
  g,
  selected,
  viewer,
  onSelect,
}: {
  t: Task;
  g: ViewGroup;
  selected: boolean;
  viewer: boolean;
  onSelect: (id: string) => void;
}) {
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const openCtx = useBoard((s) => s.openCtx);
  const st = STATUS[t.status];
  const pr = t.priority ? PRIO[t.priority] : null;
  const ty = TYPE[t.type];
  const so = SOURCE[t.source];
  const owner = personById(t.owner);
  const lastBy = personById(t.lastBy) ?? personById('p1')!;
  const due = deriveDue(t);

  const cellPopup = (kind: string, field: string | undefined, e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 5;
    const w = kind === 'date' ? 280 : kind === 'phases' ? 340 : Math.max(r.width, 180);
    if (x + w > window.innerWidth - 10) x = window.innerWidth - 10 - w;
    openPopup({ kind, taskId: t.id, field, x, y });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (viewer) return;
    e.preventDefault();
    e.stopPropagation();
    let x = e.clientX;
    let y = e.clientY;
    const W = 230;
    const H = 300;
    if (x + W > window.innerWidth - 10) x = window.innerWidth - 10 - W;
    if (y + H > window.innerHeight - 10) y = Math.max(10, window.innerHeight - 10 - H);
    openCtx({ taskId: t.id, x, y });
  };

  // timeline bar position within the window
  let tlLeft = '0%';
  let tlWidth = '0%';
  let tlLabel = '';
  if (t.tl) {
    const a = pct(t.tl.start);
    const b = pct(t.tl.end);
    tlLeft = a + '%';
    tlWidth = Math.max(b - a, 4) + '%';
    tlLabel = fmt(t.tl.start) + ' – ' + fmt(t.tl.end);
  }
  const subs = t.subs ?? [];
  const subDone = subs.filter((x) => x.status === 'done').length;

  return (
    <div
      onContextMenu={onContextMenu}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: GRID,
        height: ROW_H,
        background: selected ? 'rgba(238,242,253,0.82)' : 'rgba(255,255,255,0.55)',
        borderBottom: '1px solid #efefeb',
        borderLeft: `3px solid ${g.color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb' }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!viewer) onSelect(t.id);
          }}
          style={{
            width: 17,
            height: 17,
            borderRadius: 5,
            border: `2px solid ${selected ? ACCENT : '#cfcfca'}`,
            background: selected ? ACCENT : '#fff',
            cursor: viewer ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
              <path d="M5 12l5 5L20 6" />
            </svg>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '0 8px 0 8px',
          borderRight: '1px solid #efefeb',
          minWidth: 0,
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            openPanel(t.id);
          }}
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: '#2a2d32',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
          }}
        >
          {t.name}
        </span>
        {subs.length > 0 && (
          <span
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: '#797d84',
              background: '#f0f0ec',
              padding: '2px 8px',
              borderRadius: 9,
            }}
          >
            <span
              style={{ position: 'relative', width: 26, height: 5, borderRadius: 3, background: '#dcdcd7', overflow: 'hidden' }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: (subDone / subs.length) * 100 + '%',
                  background: subDone === subs.length ? '#4a9b7f' : ACCENT,
                }}
              />
            </span>
            {subDone}/{subs.length}
          </span>
        )}
      </div>

      <div
        onClick={(e) => cellPopup('people', undefined, e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        {owner ? <Avatar initials={owner.initials} color={owner.color} /> : <AvatarEmpty />}
      </div>

      <div
        onClick={(e) => cellPopup('status', undefined, e)}
        style={{ borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        <div
          className="noinv"
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: st.bg,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
          }}
        >
          {st.label}
        </div>
      </div>

      <div
        onClick={(e) => cellPopup('date', 'due', e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          borderRight: '1px solid #efefeb',
          cursor: viewer ? 'default' : 'pointer',
          fontSize: 12.5,
          fontWeight: 600,
          color: due.color,
          textDecoration: due.strike,
        }}
      >
        {due.check && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12l5 5L20 6" />
          </svg>
        )}
        {due.clock && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        )}
        {due.label}
      </div>

      <div
        onClick={(e) => cellPopup('priority', undefined, e)}
        style={{ borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        {pr ? (
          <div
            className="noinv"
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: pr.bg,
              color: '#fff',
              fontSize: 12.5,
              fontWeight: 600,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
            }}
          >
            {pr.label}
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4c4bf', fontSize: 16 }}>
            +
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRight: '1px solid #efefeb' }}>
        {t.tl ? (
          <div style={{ position: 'relative', width: '100%', height: 20, background: '#eeeeea', borderRadius: 7 }}>
            {t.phases ? (
              <PhasedBar task={t} fallback={g.color} />
            ) : (
              <div
                className="noinv"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: tlLeft,
                  width: tlWidth,
                  background: g.color,
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 7px',
                  color: '#fff',
                  fontSize: 10.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  minWidth: 34,
                }}
              >
                {tlLabel}
              </div>
            )}
          </div>
        ) : (
          <span style={{ color: '#c4c4bf', fontSize: 16, width: '100%', textAlign: 'center' }}>+</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', borderRight: '1px solid #efefeb', minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: '#797d84', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.note || '—'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 7, paddingLeft: 18, borderRight: '1px solid #efefeb' }}>
        <Avatar initials={lastBy.initials} color={lastBy.color} size={22} font={9.5} />
        <span style={{ fontSize: 11.5, color: '#9a9da2', fontWeight: 500, whiteSpace: 'nowrap' }}>{t.lastAgo}</span>
      </div>

      <div
        onClick={(e) => cellPopup('section', undefined, e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#5b5f66', background: '#f0f0ec', padding: '3px 10px', borderRadius: 6 }}>
          {t.section}
        </span>
      </div>

      <div
        onClick={(e) => cellPopup('type', undefined, e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        <Pill label={ty.label} bg={ty.bg} />
      </div>

      <div
        onClick={(e) => cellPopup('source', undefined, e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        <Pill label={so.label} bg={so.bg} />
      </div>
    </div>
  );
}

function PhasedBar({ task, fallback }: { task: Task; fallback: string }) {
  // Segment the bar across the window by phase days, colored per phase.
  if (!task.tl || !task.phases) return null;
  const a = pct(task.tl.start);
  const b = pct(task.tl.end);
  const span = Math.max(b - a, 4);
  const order = ['analysis', 'dev', 'test'] as const;
  const totalDays = order.reduce((acc, k) => acc + (task.phases![k].days || 0), 0) || 1;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: a + '%',
        width: span + '%',
        borderRadius: 7,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {order.map((k) => {
        const days = task.phases![k].days || 0;
        if (!days) return null;
        return (
          <div
            key={k}
            className="noinv"
            title={PHASES[k].label}
            style={{
              width: (days / totalDays) * 100 + '%',
              background: PHASES[k].color || fallback,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {PHASES[k].label[0]}
          </div>
        );
      })}
    </div>
  );
}

function Battery({ segs }: { segs: { pct: string; bg: string }[] }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 11,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
    >
      {segs.map((s, i) => (
        <div key={i} className="noinv" style={{ width: s.pct, background: s.bg }} />
      ))}
    </div>
  );
}

function EmptyRow({ color, icon, children }: { color: string; icon: 'board' | 'search'; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '14px 18px 14px 22px',
        borderLeft: `3px solid ${color}`,
        borderBottom: '1px solid #efefeb',
        background: 'rgba(255,255,255,0.4)',
      }}
    >
      {icon === 'board' ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#bcbcb7" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#bcbcb7" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      )}
      <span style={{ fontSize: 13, color: '#9a9da2' }}>{children}</span>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  const setQuery = useBoard((s) => s.setQuery);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 20px', textAlign: 'center' }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a6a8ab" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>Ничего не найдено</div>
      <div style={{ fontSize: 13.5, color: '#797d84', marginBottom: 18 }}>
        По запросу «{query}» нет задач ни в одной роли.
      </div>
      <button
        onClick={() => setQuery('')}
        style={{
          height: 38,
          padding: '0 18px',
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.6)',
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 700,
          color: '#3a3d42',
          cursor: 'pointer',
        }}
      >
        Сбросить поиск
      </button>
    </div>
  );
}
