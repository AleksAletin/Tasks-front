// Board table view (brief §5.4) — grouped rows with solid status/priority cells,
// colored left border, mini-gantt timeline, summary "battery" rows, inline-edit popups.
import { useMemo } from 'react';
import { useBoard } from './store';
import {
  type CustomCol,
  type Sub,
  type Task,
  CUSTOM_STATES,
  PEOPLE,
  PHASES,
  PRIO,
  SOURCE,
  STATUS,
  TODAY,
  TYPE,
  dayNum,
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
// Each custom column appends a 160px slot to the grid (brief §5.10).
const CUSTOM_COL_W = '160px';
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
  const customCols = useBoard((s) => s.customCols);
  const colLabels = useBoard((s) => s.colLabels);
  const toggleCollapse = useBoard((s) => s.toggleCollapse);
  const toggleSelect = useBoard((s) => s.toggleSelect);
  const openHeaderMenu = useBoard((s) => s.openHeaderMenu);
  const openAddColMenu = useBoard((s) => s.openAddColMenu);

  const { groups: viewGroups, tableEmptyAll } = useMemo(
    () => buildView({ groups, query, filterStatus, filterOwner, sortBy, sortDir, groupBy }),
    [groups, query, filterStatus, filterOwner, sortBy, sortDir, groupBy],
  );

  const allTasks = groups.flatMap((g) => g.tasks);
  const allChecked = allTasks.length > 0 && allTasks.every((t) => selectedIds[t.id]);
  const gridCols = GRID + customCols.map(() => ' ' + CUSTOM_COL_W).join('');
  const minWidth = 1684 + customCols.length * 160;

  const onHeader = (key: string, custom: boolean, e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 6;
    if (x + 240 > window.innerWidth - 10) x = window.innerWidth - 10 - 240;
    openHeaderMenu(key, custom, x, y);
  };

  const onAddCol = (e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.right - 220;
    const y = r.bottom + 6;
    if (x < 10) x = 10;
    openAddColMenu(x, y);
  };

  return (
    <div style={{ minWidth, paddingBottom: 80 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 6,
          display: 'grid',
          gridTemplateColumns: `${gridCols} 44px`,
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
            className="colhead"
            onClick={(e) => onHeader(key, false, e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: key === 'task' ? 'flex-start' : key === 'updated' ? 'flex-start' : 'center',
              paddingLeft: key === 'task' ? 6 : key === 'updated' ? 18 : 0,
              borderRight: '1px solid #efefeb',
              cursor: viewer ? 'default' : 'pointer',
            }}
          >
            {colLabels[key] ?? label}
          </div>
        ))}
        {customCols.map((c) => (
          <div
            key={c.id}
            className="colhead"
            onClick={(e) => onHeader(c.id, true, e)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              borderRight: '1px solid #efefeb',
              cursor: viewer ? 'default' : 'pointer',
              position: 'relative',
            }}
          >
            <span className="colgrip" style={{ opacity: 0, transition: 'opacity .12s', color: '#c4c4bf', display: 'flex' }}>
              <svg width="9" height="13" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
            </span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
          </div>
        ))}
        {!viewer ? (
          <div
            onClick={onAddCol}
            title="Добавить столбец"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a6a8ab' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        ) : (
          <div />
        )}
      </div>

      {tableEmptyAll && <NoResults query={query} />}

      {viewGroups.map((g) => (
        <GroupBlock
          key={g.id}
          g={g}
          gridCols={gridCols}
          customCols={customCols}
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
  gridCols,
  customCols,
  collapsed,
  onToggle,
  selectedIds,
  viewer,
  onSelect,
}: {
  g: ViewGroup;
  gridCols: string;
  customCols: CustomCol[];
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
            <Row
              key={t.id}
              t={t}
              g={g}
              gridCols={gridCols}
              customCols={customCols}
              selected={!!selectedIds[t.id]}
              viewer={viewer}
              onSelect={onSelect}
            />
          ))}

          {!g.empty && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
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
              {customCols.map((c) => (
                <div key={c.id} />
              ))}
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
  gridCols,
  customCols,
  selected,
  viewer,
  onSelect,
}: {
  t: Task;
  g: ViewGroup;
  gridCols: string;
  customCols: CustomCol[];
  selected: boolean;
  viewer: boolean;
  onSelect: (id: string) => void;
}) {
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const openCtx = useBoard((s) => s.openCtx);
  const expanded = useBoard((s) => !!s.expanded[t.id]);
  const toggleExpand = useBoard((s) => s.toggleExpand);
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
    <>
    <div
      onContextMenu={onContextMenu}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: gridCols,
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
          padding: '0 8px 0 4px',
          borderRight: '1px solid #efefeb',
          minWidth: 0,
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(t.id);
          }}
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 5,
            color: '#a6a8ab',
            cursor: 'pointer',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .12s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
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

      {customCols.map((c) => (
        <CustomCell key={c.id} col={c} taskId={t.id} viewer={viewer} />
      ))}
    </div>

    {expanded && <SubRows t={t} g={g} gridCols={gridCols} customCols={customCols} viewer={viewer} />}
    </>
  );
}

function CustomCell({ col, taskId, viewer }: { col: CustomCol; taskId: string; viewer: boolean }) {
  const value = useBoard((s) => s.colValues[taskId + '::' + col.id]);
  const setColValue = useBoard((s) => s.setColValue);

  const inputBase: React.CSSProperties = {
    width: '100%',
    height: 26,
    border: '1px solid transparent',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 13,
    background: 'transparent',
    outline: 'none',
    color: '#3a3d42',
  };

  const wrap = (child: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', borderRight: '1px solid #efefeb' }}>
      {child}
    </div>
  );

  if (col.type === 'text') {
    return wrap(
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setColValue(taskId, col.id, e.target.value)}
        readOnly={viewer}
        placeholder="—"
        style={inputBase}
      />,
    );
  }
  if (col.type === 'number') {
    return wrap(
      <input
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setColValue(taskId, col.id, e.target.value)}
        readOnly={viewer}
        inputMode="decimal"
        placeholder="0"
        style={{ ...inputBase, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}
      />,
    );
  }
  if (col.type === 'date') {
    return wrap(
      <input
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setColValue(taskId, col.id, e.target.value)}
        readOnly={viewer}
        style={{ ...inputBase, padding: '0 6px', fontSize: 12.5 }}
      />,
    );
  }
  if (col.type === 'check') {
    const checked = !!value;
    return wrap(
      <div
        onClick={() => {
          if (!viewer) setColValue(taskId, col.id, !checked);
        }}
        style={{
          width: 19,
          height: 19,
          borderRadius: 5,
          border: `2px solid ${checked ? ACCENT : '#cfcfca'}`,
          background: checked ? ACCENT : '#fff',
          cursor: viewer ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
            <path d="M5 12l5 5L20 6" />
          </svg>
        )}
      </div>,
    );
  }
  if (col.type === 'status') {
    const cur = value as { label: string; color: string } | null | undefined;
    return wrap(
      <div
        className="noinv"
        onClick={() => {
          if (viewer) return;
          const i = cur ? CUSTOM_STATES.findIndex((x) => x.label === cur.label) : -1;
          setColValue(taskId, col.id, CUSTOM_STATES[(i + 1) % CUSTOM_STATES.length]);
        }}
        style={{
          width: '100%',
          height: 28,
          borderRadius: 6,
          background: cur ? cur.color : 'rgba(0,0,0,0.05)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          cursor: viewer ? 'default' : 'pointer',
          boxShadow: cur ? 'inset 0 1px 0 rgba(255,255,255,0.25)' : 'none',
        }}
      >
        {cur ? cur.label : '—'}
      </div>,
    );
  }
  // people
  const p = typeof value === 'string' && value ? personById(value) : undefined;
  return wrap(
    <div
      onClick={() => {
        if (viewer) return;
        const ids: (string | null)[] = [null, ...PEOPLE.map((x) => x.id)];
        const i = ids.indexOf(typeof value === 'string' && value ? value : null);
        setColValue(taskId, col.id, ids[(i + 1) % ids.length] ?? '');
      }}
      style={{ cursor: viewer ? 'default' : 'pointer', display: 'flex' }}
    >
      {p ? <Avatar initials={p.initials} color={p.color} /> : <AvatarEmpty />}
    </div>,
  );
}

function SubRows({
  t,
  g,
  gridCols,
  customCols,
  viewer,
}: {
  t: Task;
  g: ViewGroup;
  gridCols: string;
  customCols: CustomCol[];
  viewer: boolean;
}) {
  const subs = t.subs ?? [];
  const addingSub = useBoard((s) => s.addingSub === t.id);
  const subDraft = useBoard((s) => s.subDraft);
  const setSubDraft = useBoard((s) => s.setSubDraft);
  const addSub = useBoard((s) => s.addSub);
  const cancelAddSub = useBoard((s) => s.cancelAddSub);
  const startAddSub = useBoard((s) => s.startAddSub);

  // The sub-rows align under the same grid; cells past the 5th built-in column stay
  // empty (incl. one empty slot per custom column), matching the prototype template.
  const tail = 7 + customCols.length;

  return (
    <>
      {subs.map((sub) => (
        <SubRow key={sub.id} sub={sub} taskId={t.id} g={g} gridCols={gridCols} viewer={viewer} tail={tail} />
      ))}
      {!viewer && addingSub && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0 0 84px',
            height: 36,
            borderLeft: `3px solid ${g.color}`,
            borderBottom: '1px solid #efefeb',
            background: 'rgba(247,247,250,0.75)',
          }}
        >
          <input
            value={subDraft}
            onChange={(e) => setSubDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = subDraft.trim();
                if (n) {
                  addSub(t.id, n);
                  setSubDraft('');
                }
              } else if (e.key === 'Escape') {
                cancelAddSub();
              }
            }}
            autoFocus
            placeholder="Подэлемент, Enter — создать, Esc — отмена"
            style={{
              flex: 1,
              maxWidth: 360,
              height: 28,
              border: `1px solid ${ACCENT}`,
              borderRadius: 7,
              padding: '0 10px',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
        </div>
      )}
      {!viewer && !addingSub && (
        <div
          onClick={() => startAddSub(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 0 0 84px',
            height: 32,
            borderLeft: '3px solid transparent',
            color: '#a6a8ab',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить подэлемент
        </div>
      )}
    </>
  );
}

function SubRow({
  sub,
  taskId,
  g,
  gridCols,
  viewer,
  tail,
}: {
  sub: Sub;
  taskId: string;
  g: ViewGroup;
  gridCols: string;
  viewer: boolean;
  tail: number;
}) {
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const sst = STATUS[sub.status];
  const so = personById(sub.owner);

  let sdueLabel = '—';
  let sdueColor = '#c4c4bf';
  let sdueStrike = 'none';
  if (sub.due) {
    sdueLabel = fmt(sub.due);
    if (sub.status === 'done') {
      sdueColor = '#4a9b7f';
      sdueStrike = 'line-through';
    } else {
      sdueColor = dayNum(sub.due) < dayNum(TODAY) ? '#cf6b6b' : '#6b6f76';
    }
  }

  const subPopup = (kind: string, field: string | undefined, e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 5;
    const w = kind === 'date' ? 280 : Math.max(r.width, 180);
    if (x + w > window.innerWidth - 10) x = window.innerWidth - 10 - w;
    openPopup({ kind, taskId, subId: sub.id, field, x, y });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        height: 36,
        background: 'rgba(247,247,250,0.6)',
        borderBottom: '1px solid #efefeb',
        borderLeft: `3px solid ${g.color}`,
      }}
    >
      <div style={{ borderRight: '1px solid #efefeb' }} />
      <div
        onClick={() => openPanel(taskId)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 28px', borderRight: '1px solid #efefeb', cursor: 'pointer', minWidth: 0 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bcbcc2" strokeWidth="2.2" style={{ flexShrink: 0 }}>
          <path d="M5 5v8a3 3 0 0 0 3 3h11" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#4a4d52', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub.name}
        </span>
      </div>
      <div
        onClick={(e) => subPopup('people', undefined, e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}
      >
        {so ? <Avatar initials={so.initials} color={so.color} size={24} font={10} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed #cfcfca' }} />}
      </div>
      <div onClick={(e) => subPopup('status', undefined, e)} style={{ borderRight: '1px solid #efefeb', cursor: viewer ? 'default' : 'pointer' }}>
        <div
          className="noinv"
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: sst.bg,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.05)',
          }}
        >
          {sst.label}
        </div>
      </div>
      <div
        onClick={(e) => subPopup('date', 'due', e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #efefeb',
          cursor: viewer ? 'default' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: sdueColor,
          textDecoration: sdueStrike,
        }}
      >
        {sdueLabel}
      </div>
      {Array.from({ length: tail }).map((_, i) => (
        <div key={i} style={i === tail - 1 ? undefined : { borderRight: '1px solid #efefeb' }} />
      ))}
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
