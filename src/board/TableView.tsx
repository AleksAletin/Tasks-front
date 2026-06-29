// Board table view (brief §5.4) — grouped rows with solid status/priority cells,
// colored left border, mini-gantt timeline, summary "battery" rows, inline-edit popups.
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
const ROW_H = 40;
// FLIP settle for reordered rows (brief §5.8) — matches the prototype's easing/duration.
const FLIP_EASE = 'cubic-bezier(.22,.85,.25,1)';
const FLIP_MS = 360;
const CHECKBOX_W = 56;
const ADDCOL_W = 44;
const CUSTOM_COL_W = 160;

// Built-in columns with their default widths (px). This array's order is the default order;
// the user can reorder (persisted colOrder) and resize (persisted colWidths) any column — both
// are reconciled against the live column set at render, so stale/partial state is harmless.
const BUILTIN: { key: string; label: string; w: number }[] = [
  { key: 'task', label: 'Задача', w: 264 },
  { key: 'owner', label: 'Владелец', w: 100 },
  { key: 'status', label: 'Статус', w: 138 },
  { key: 'due', label: 'Срок', w: 118 },
  { key: 'priority', label: 'Приоритет', w: 138 },
  { key: 'tl', label: 'Шкала времени', w: 184 },
  { key: 'note', label: 'Примечания', w: 172 },
  { key: 'updated', label: 'Обновлено', w: 132 },
  { key: 'section', label: 'Раздел', w: 128 },
  { key: 'type', label: 'Тип', w: 116 },
  { key: 'source', label: 'Источник', w: 138 },
];
const BUILTIN_KEYS = BUILTIN.map((c) => c.key);
const DEFAULT_W: Record<string, number> = Object.fromEntries(
  BUILTIN.map((c) => [c.key, c.w]),
);
const BASE_LABEL: Record<string, string> = Object.fromEntries(
  BUILTIN.map((c) => [c.key, c.label]),
);

/** A resolved column: its key, current label, current width, and whether it is a custom column. */
interface Col {
  key: string;
  label: string;
  width: number;
  custom: boolean;
}

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
  const activeBoardId = useBoard((s) => s.activeBoardId);
  const addGroup = useBoard((s) => s.addGroup);

  // Only the active board's groups are shown — groups are scoped per board.
  const boardGroups = useMemo(
    () => groups.filter((g) => (g.boardId ?? 'b1') === activeBoardId),
    [groups, activeBoardId],
  );
  const boardEmpty = boardGroups.length === 0;

  const colWidths = useBoard((s) => s.colWidths);
  const colOrder = useBoard((s) => s.colOrder);
  const setColWidth = useBoard((s) => s.setColWidth);
  const setColOrder = useBoard((s) => s.setColOrder);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<string | null>(null);

  // Resolve the ordered, sized column set: saved order first (minus removed columns), then any
  // columns not yet in the saved order (new built-ins/custom) appended in their natural order.
  const cols: Col[] = useMemo(() => {
    const customIds = customCols.map((c) => c.id);
    const allKeys = [...BUILTIN_KEYS, ...customIds];
    const ordered = [
      ...colOrder.filter((k) => allKeys.includes(k)),
      ...allKeys.filter((k) => !colOrder.includes(k)),
    ];
    return ordered.map((k) => {
      const custom = customIds.includes(k);
      return {
        key: k,
        custom,
        label: custom
          ? (customCols.find((c) => c.id === k)?.label ?? '')
          : (colLabels[k] ?? BASE_LABEL[k] ?? k),
        width: colWidths[k] ?? (custom ? CUSTOM_COL_W : (DEFAULT_W[k] ?? CUSTOM_COL_W)),
      };
    });
  }, [colOrder, customCols, colLabels, colWidths]);

  // Row grid = checkbox + the ordered columns; the header adds the trailing «+» add-column slot.
  const rowGrid = `${CHECKBOX_W}px ${cols.map((c) => c.width + 'px').join(' ')}`;
  const headGrid = `${rowGrid} ${ADDCOL_W}px`;

  // Drop the dragged column before/after the target (by drag direction) and persist the order.
  const reorderCol = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const order = cols.map((c) => c.key);
    const fromIdx = order.indexOf(fromKey);
    const toIdx = order.indexOf(toKey);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    const at = order.indexOf(toKey) + (fromIdx < toIdx ? 1 : 0);
    order.splice(at, 0, fromKey);
    setColOrder(order);
  };

  // FLIP settle: after the persisted `groups` change (a row/group reorder or
  // cross-group move), glide every [data-row-id] from its previous top to its new
  // one. We keep the last measured tops in a ref and diff against the post-update
  // layout, matching the prototype's getSnapshotBeforeUpdate/componentDidUpdate.
  const flipTops = useRef<Record<string, number>>({});
  const flipReady = useRef(false);
  const prevGroups = useRef(boardGroups);
  useLayoutEffect(() => {
    // Animate only on a real reorder (groups changed). On other layout-affecting
    // changes (filter/sort/group/collapse) just re-measure, so the NEXT reorder
    // still flips from correct positions instead of stale ones.
    const animate = flipReady.current && prevGroups.current !== boardGroups;
    prevGroups.current = boardGroups;
    const prev = flipTops.current;
    const next: Record<string, number> = {};
    const nodes = document.querySelectorAll<HTMLElement>('[data-row-id]');
    nodes.forEach((el) => {
      const id = el.getAttribute('data-row-id');
      if (!id) return;
      const top = el.getBoundingClientRect().top;
      next[id] = top;
      if (!animate) return;
      const pt = prev[id];
      if (pt == null) return;
      const dy = pt - top;
      if (Math.abs(dy) <= 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
      el.style.zIndex = '2';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
          el.style.transform = '';
          window.setTimeout(() => {
            el.style.zIndex = '';
          }, FLIP_MS + 20);
        }),
      );
    });
    flipTops.current = next;
    flipReady.current = true;
  }, [
    boardGroups,
    collapsed,
    query,
    filterStatus,
    filterOwner,
    sortBy,
    sortDir,
    groupBy,
  ]);

  const { groups: viewGroups, tableEmptyAll } = useMemo(
    () =>
      buildView({
        groups: boardGroups,
        query,
        filterStatus,
        filterOwner,
        sortBy,
        sortDir,
        groupBy,
      }),
    [boardGroups, query, filterStatus, filterOwner, sortBy, sortDir, groupBy],
  );

  // Reflect the VISIBLE (filtered/grouped) rows, not the whole board.
  const allTasks = viewGroups.flatMap((g) => g.tasks);
  const allChecked =
    allTasks.length > 0 && allTasks.every((t) => selectedIds[t.id]);
  const minWidth =
    CHECKBOX_W + ADDCOL_W + cols.reduce((sum, c) => sum + c.width, 0);

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
          gridTemplateColumns: headGrid,
          background: 'var(--glass)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
          borderBottom: '1px solid var(--hover)',
          height: 38,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text-soft)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--surf-1)',
          }}
        >
          <div
            style={{
              width: 17,
              height: 17,
              borderRadius: 5,
              border: `2px solid ${allChecked ? ACCENT : 'var(--line)'}`,
              background: allChecked ? ACCENT : 'var(--card)',
              cursor: viewer ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {allChecked && (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3.5"
              >
                <path d="M5 12l5 5L20 6" />
              </svg>
            )}
          </div>
        </div>
        {cols.map((c) => (
          <ColumnHeader
            key={c.key}
            col={c}
            viewer={viewer}
            dragging={dragCol === c.key}
            dropTarget={!!dragCol && dragCol !== c.key && dropCol === c.key}
            onRename={onHeader}
            onResize={setColWidth}
            onDragStartCol={() => setDragCol(c.key)}
            onDragOverCol={() => {
              if (dragCol && dragCol !== c.key && dropCol !== c.key) {
                setDropCol(c.key);
              }
            }}
            onDropCol={() => {
              if (dragCol && dragCol !== c.key) reorderCol(dragCol, c.key);
              setDragCol(null);
              setDropCol(null);
            }}
            onDragEndCol={() => {
              setDragCol(null);
              setDropCol(null);
            }}
          />
        ))}
        {!viewer ? (
          <div
            onClick={onAddCol}
            title="Добавить столбец"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-faint)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        ) : (
          <div />
        )}
      </div>

      {boardEmpty ? (
        <BoardEmptyState viewer={viewer} onAdd={addGroup} />
      ) : (
        <>
          {tableEmptyAll && <NoResults query={query} />}

          {viewGroups.map((g, gi) => (
            <GroupBlock
              key={g.id}
              g={g}
              gi={gi}
              total={viewGroups.length}
              rowGrid={rowGrid}
              cols={cols}
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
              onClick={addGroup}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '18px 0 0 14px',
                padding: '8px 12px',
                width: 'fit-content',
                border: '1px solid var(--surf-2)',
                background: 'var(--card)',
                borderRadius: 9,
                color: 'var(--text-mut)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить группу
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Shown when the active board has no groups yet (e.g. a freshly added board) — the entry
// point to fill it (add a group here, or use the Импорт tab to load an Excel file).
function BoardEmptyState({
  viewer,
  onAdd,
}: {
  viewer: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '70px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: 'var(--glass)',
          border: '1px solid var(--glass)',
          boxShadow: 'inset 0 1px 0 var(--glass-hi)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="1.8"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 4v16" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>
        На этой доске пока пусто
      </div>
      <div
        style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 18 }}
      >
        Добавьте группу или загрузите данные на вкладке «Импорт».
      </div>
      {!viewer && (
        <button
          onClick={onAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 38,
            padding: '0 18px',
            border: 'none',
            background: ACCENT,
            color: '#fff',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить группу
        </button>
      )}
    </div>
  );
}

// One column header cell: rename on click, drag to reorder, right-edge handle to resize.
function ColumnHeader({
  col,
  viewer,
  dragging,
  dropTarget,
  onRename,
  onResize,
  onDragStartCol,
  onDragOverCol,
  onDropCol,
  onDragEndCol,
}: {
  col: Col;
  viewer: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onRename: (key: string, custom: boolean, e: React.MouseEvent) => void;
  onResize: (key: string, width: number) => void;
  onDragStartCol: () => void;
  onDragOverCol: () => void;
  onDropCol: () => void;
  onDragEndCol: () => void;
}) {
  const resizedRef = useRef(false);
  const left = col.key === 'task' || col.key === 'updated';
  return (
    <div
      className="colhead"
      draggable={!viewer}
      onDragStart={
        viewer
          ? undefined
          : (e) => {
              // Some browsers/synthetic events leave dataTransfer null — guard, like the row DnD.
              if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              onDragStartCol();
            }
      }
      onDragOver={
        viewer
          ? undefined
          : (e) => {
              e.preventDefault();
              onDragOverCol();
            }
      }
      onDrop={
        viewer
          ? undefined
          : (e) => {
              e.preventDefault();
              onDropCol();
            }
      }
      onDragEnd={viewer ? undefined : onDragEndCol}
      onClick={(e) => {
        // Suppress the rename click that would otherwise follow a resize drag.
        if (resizedRef.current) {
          resizedRef.current = false;
          return;
        }
        onRename(col.key, col.custom, e);
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: left ? 'flex-start' : 'center',
        paddingLeft: col.key === 'task' ? 6 : col.key === 'updated' ? 18 : 0,
        borderRight: '1px solid var(--surf-1)',
        cursor: viewer ? 'default' : 'grab',
        background: dropTarget ? 'var(--blue-tint)' : 'transparent',
        opacity: dragging ? 0.4 : 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
        }}
      >
        {col.label}
      </span>
      {!viewer && (
        <ResizeHandle
          width={col.width}
          onResize={(w) => onResize(col.key, w)}
          onResized={() => (resizedRef.current = true)}
        />
      )}
    </div>
  );
}

// Thin right-edge grip: drag to resize the column live, suppressing the header's drag/click.
function ResizeHandle({
  width,
  onResize,
  onResized,
}: {
  width: number;
  onResize: (width: number) => void;
  onResized: () => void;
}) {
  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = width;
    let moved = false;
    const move = (ev: MouseEvent) => {
      moved = true;
      onResize(startW + (ev.clientX - startX));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved) onResized();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <span
      onMouseDown={onDown}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
      title="Потяните, чтобы изменить ширину"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: 9,
        cursor: 'col-resize',
        zIndex: 2,
      }}
    />
  );
}

function GroupBlock({
  g,
  gi,
  total,
  rowGrid,
  cols,
  customCols,
  collapsed,
  onToggle,
  selectedIds,
  viewer,
  onSelect,
}: {
  g: ViewGroup;
  gi: number;
  total: number;
  rowGrid: string;
  cols: Col[];
  customCols: CustomCol[];
  collapsed: boolean;
  onToggle: () => void;
  selectedIds: Record<string, boolean>;
  viewer: boolean;
  onSelect: (id: string) => void;
}) {
  const groupDragStart = useBoard((s) => s.groupDragStart);
  const groupDragOver = useBoard((s) => s.groupDragOver);
  const groupDrop = useBoard((s) => s.groupDrop);
  const groupDragEnd = useBoard((s) => s.groupDragEnd);
  const moveGroup = useBoard((s) => s.moveGroup);
  const addTaskToGroup = useBoard((s) => s.addTaskToGroup);
  const dragging = useBoard((s) => s.groupDrag?.id === g.id);
  const dropActive = useBoard(
    (s) => !!s.groupDrag && s.groupDrag.id !== g.id && s.groupDropId === g.id,
  );

  // Row/group DnD only applies when grouping by role and not in viewer mode (brief §5.8).
  const canDrag = g.isRole && !viewer;
  const canMoveUp = g.isRole && !viewer && gi > 0;
  const canMoveDown = g.isRole && !viewer && gi < total - 1;

  return (
    <div
      className="grouprow"
      draggable={canDrag}
      onDragStart={canDrag ? () => groupDragStart(g.id) : undefined}
      onDragOver={
        canDrag
          ? (e) => {
              e.preventDefault();
              groupDragOver(g.id);
            }
          : undefined
      }
      onDrop={
        canDrag
          ? (e) => {
              e.preventDefault();
              groupDrop(g.id);
            }
          : undefined
      }
      onDragEnd={canDrag ? () => groupDragEnd() : undefined}
      style={{
        marginTop: 14,
        position: 'relative',
        opacity: dragging ? 0.45 : 1,
      }}
    >
      {dropActive && (
        <div
          style={{
            position: 'absolute',
            top: 7,
            left: 8,
            right: 8,
            height: 2.5,
            borderRadius: 2,
            background: ACCENT,
            zIndex: 4,
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 0 6px 6px',
          height: 34,
        }}
      >
        {canDrag && (
          <span
            className="ghandle"
            title="Перетащите, чтобы переместить группу"
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              color: 'var(--line)',
              opacity: 0,
              transition: 'opacity .12s',
            }}
          >
            <svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.6" />
              <circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" />
              <circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" />
              <circle cx="15" cy="18" r="1.6" />
            </svg>
          </span>
        )}
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: g.color,
            letterSpacing: '-.2px',
          }}
        >
          {g.name}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-faint)',
            background: 'var(--surf-1)',
            padding: '1px 8px',
            borderRadius: 10,
          }}
        >
          {g.count}
        </span>
        {canMoveUp && (
          <div
            onClick={() => moveGroup(g.id, -1)}
            className="gmove"
            title="Выше"
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text-faint)',
              opacity: 0,
              transition: 'opacity .12s, background .12s',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </div>
        )}
        {canMoveDown && (
          <div
            onClick={() => moveGroup(g.id, 1)}
            className="gmove"
            title="Ниже"
            style={{
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text-faint)',
              opacity: 0,
              transition: 'opacity .12s, background .12s',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
        {collapsed && (
          <div
            style={{
              display: 'flex',
              height: 9,
              width: 120,
              borderRadius: 5,
              overflow: 'hidden',
              marginLeft: 6,
            }}
          >
            {g.summary.statusSegs.map((s, i) => (
              <div key={i} style={{ width: s.pct, background: s.bg }} />
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
              rowGrid={rowGrid}
              cols={cols}
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
                gridTemplateColumns: rowGrid,
                height: 34,
                borderLeft: `3px solid ${g.color}`,
                borderBottom: '1px solid var(--surf-1)',
                background: 'var(--glass-soft)',
              }}
            >
              <div />
              {cols.map((c) => {
                if (c.key === 'status' || c.key === 'priority') {
                  return (
                    <div
                      key={c.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                      }}
                    >
                      <Battery
                        segs={
                          c.key === 'status'
                            ? g.summary.statusSegs
                            : g.summary.prioSegs
                        }
                      />
                    </div>
                  );
                }
                if (c.key === 'tl') {
                  return (
                    <div
                      key={c.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-faint)',
                      }}
                    >
                      {g.summary.tlLabel}
                    </div>
                  );
                }
                return <div key={c.key} />;
              })}
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
              onClick={() => addTaskToGroup(g.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 0 0 19px',
                height: 36,
                borderLeft: '3px solid transparent',
                color: 'var(--text-faint)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
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

const Row = memo(function Row({
  t,
  g,
  rowGrid,
  cols,
  customCols,
  selected,
  viewer,
  onSelect,
}: {
  t: Task;
  g: ViewGroup;
  rowGrid: string;
  cols: Col[];
  customCols: CustomCol[];
  selected: boolean;
  viewer: boolean;
  onSelect: (id: string) => void;
}) {
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const openCtx = useBoard((s) => s.openCtx);
  const initPhases = useBoard((s) => s.initPhases);
  const expanded = useBoard((s) => !!s.expanded[t.id]);
  const toggleExpand = useBoard((s) => s.toggleExpand);
  const dragStart = useBoard((s) => s.dragStart);
  const dragOver = useBoard((s) => s.dragOver);
  const dropRow = useBoard((s) => s.dropRow);
  const dragEnd = useBoard((s) => s.dragEnd);
  const dragging = useBoard((s) => s.drag?.id === t.id);
  const dropBefore = useBoard(
    (s) => s.dropTarget?.taskId === t.id && s.dropTarget.before === true,
  );
  const dropAfter = useBoard(
    (s) => s.dropTarget?.taskId === t.id && s.dropTarget.before === false,
  );

  // Row drag only when grouping by role and not viewing (brief §5.8); it must not
  // interfere with the cell click/popover/context-menu handlers (those stopPropagation).
  const canDrag = g.isRole && !viewer;
  const st = STATUS[t.status];
  const pr = t.priority ? PRIO[t.priority] : null;
  const ty = TYPE[t.type];
  const so = SOURCE[t.source];
  const owner = personById(t.owner);
  // No fallback to a real person: imported/edited tasks may have an empty lastBy — show an
  // empty avatar rather than misleadingly attributing the change to «АК» (p1).
  const lastBy = personById(t.lastBy);
  const due = deriveDue(t);

  // Visual column order via CSS grid `order` (checkbox stays first at 0), so the cells keep their
  // place in the JSX while the grid lays them out in the user's chosen column order.
  const orderOf: Record<string, number> = {};
  cols.forEach((c, i) => {
    orderOf[c.key] = i + 1;
  });

  const cellPopup = (
    kind: string,
    field: string | undefined,
    e: React.MouseEvent,
  ) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 5;
    const w =
      kind === 'date' ? 280 : kind === 'phases' ? 340 : Math.max(r.width, 180);
    if (x + w > window.innerWidth - 10) x = window.innerWidth - 10 - w;
    openPopup({ kind, taskId: t.id, field, x, y });
  };

  // Timeline cell opens the phase-dates editor (brief §5.6, prototype onTlClick ~1808):
  // seed default phases if the task has none, then open the editor anchored at the cell.
  const onTlClick = (e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    initPhases(t.id);
    cellPopup('phases', 'tl', e);
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
    if (y + H > window.innerHeight - 10)
      y = Math.max(10, window.innerHeight - 10 - H);
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
        data-row-id={t.id}
        draggable={canDrag}
        onContextMenu={onContextMenu}
        onDragStart={
          canDrag
            ? (e) => {
                if (e.dataTransfer) {
                  e.dataTransfer.effectAllowed = 'move';
                  try {
                    e.dataTransfer.setData('text/plain', t.id);
                  } catch {
                    /* some browsers throw on setData during synthetic events */
                  }
                }
                dragStart(t.id);
              }
            : undefined
        }
        onDragOver={
          canDrag
            ? (e) => {
                e.preventDefault();
                const r = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                dragOver(g.id, t.id, e.clientY - r.top < r.height / 2);
              }
            : undefined
        }
        onDrop={
          canDrag
            ? (e) => {
                e.preventDefault();
                dropRow();
              }
            : undefined
        }
        onDragEnd={canDrag ? () => dragEnd() : undefined}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: rowGrid,
          height: ROW_H,
          background: dragging
            ? 'var(--glass-hi)'
            : selected
              ? 'var(--sel)'
              : 'var(--glass)',
          borderBottom: '1px solid var(--surf-1)',
          borderLeft: `3px solid ${g.color}`,
          boxShadow: dragging
            ? '0 18px 40px var(--shadow), 0 2px 10px var(--shadow), inset 0 1px 0 var(--glass-hi)'
            : 'none',
          transform: dragging ? 'scale(1.004)' : 'none',
          opacity: dragging ? 0.96 : 1,
          zIndex: dragging ? 5 : 0,
          transition:
            'box-shadow .16s ease, transform .16s ease, opacity .16s ease',
        }}
      >
        {dropBefore && (
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: 0,
              right: 0,
              height: 2,
              background: ACCENT,
              zIndex: 3,
            }}
          />
        )}
        {dropAfter && (
          <div
            style={{
              position: 'absolute',
              bottom: -1,
              left: 0,
              right: 0,
              height: 2,
              background: ACCENT,
              zIndex: 3,
            }}
          />
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            borderRight: '1px solid var(--surf-1)',
          }}
        >
          {canDrag && (
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                gridTemplateColumns: '2px 2px',
                gridTemplateRows: '2px 2px 2px',
                gap: 2,
                cursor: 'grab',
                opacity: 0.45,
              }}
            >
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
              <i
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: 'var(--text-faint)',
                }}
              />
            </span>
          )}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!viewer) onSelect(t.id);
            }}
            style={{
              width: 17,
              height: 17,
              borderRadius: 5,
              border: `2px solid ${selected ? ACCENT : 'var(--line)'}`,
              background: selected ? ACCENT : 'var(--card)',
              cursor: viewer ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected && (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3.5"
              >
                <path d="M5 12l5 5L20 6" />
              </svg>
            )}
          </div>
        </div>

        <div
          style={{
            order: orderOf.task,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '0 8px 0 4px',
            borderRight: '1px solid var(--surf-1)',
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
              color: 'var(--text-faint)',
              cursor: 'pointer',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform .12s',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
            >
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
              color: 'var(--text-2)',
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
                color: 'var(--text-soft)',
                background: 'var(--surf-1)',
                padding: '2px 8px',
                borderRadius: 9,
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 26,
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--surf-2)',
                  overflow: 'hidden',
                }}
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
          style={{
            order: orderOf.owner,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          {owner ? (
            <Avatar initials={owner.initials} color={owner.color} />
          ) : (
            <AvatarEmpty />
          )}
        </div>

        <div
          onClick={(e) => cellPopup('status', undefined, e)}
          style={{
            order: orderOf.status,
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          <div
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
              boxShadow: 'inset 0 0 0 1px var(--hover)',
            }}
          >
            {st.label}
          </div>
        </div>

        <div
          onClick={(e) => cellPopup('date', 'due', e)}
          style={{
            order: orderOf.due,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
            color: due.color,
            textDecoration: due.strike,
          }}
        >
          {due.check && (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12l5 5L20 6" />
            </svg>
          )}
          {due.clock && (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          )}
          {due.label}
        </div>

        <div
          onClick={(e) => cellPopup('priority', undefined, e)}
          style={{
            order: orderOf.priority,
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          {pr ? (
            <div
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
                boxShadow: 'inset 0 0 0 1px var(--hover)',
              }}
            >
              {pr.label}
            </div>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--line)',
                fontSize: 16,
              }}
            >
              +
            </div>
          )}
        </div>

        <div
          onClick={onTlClick}
          style={{
            order: orderOf.tl,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          {t.tl ? (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 20,
                background: 'var(--surf-1)',
                borderRadius: 7,
              }}
            >
              {t.phases ? (
                <PhasedBar task={t} fallback={g.color} />
              ) : (
                <div
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
            <span
              style={{
                color: 'var(--line)',
                fontSize: 16,
                width: '100%',
                textAlign: 'center',
              }}
            >
              +
            </span>
          )}
        </div>

        <div
          style={{
            order: orderOf.note,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderRight: '1px solid var(--surf-1)',
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--text-soft)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t.note || '—'}
          </span>
        </div>

        <div
          style={{
            order: orderOf.updated,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 7,
            paddingLeft: 18,
            borderRight: '1px solid var(--surf-1)',
          }}
        >
          {lastBy ? (
            <Avatar
              initials={lastBy.initials}
              color={lastBy.color}
              size={22}
              font={9.5}
            />
          ) : (
            <AvatarEmpty size={22} />
          )}
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-faint)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {t.lastAgo}
          </span>
        </div>

        <div
          onClick={(e) => cellPopup('section', undefined, e)}
          style={{
            order: orderOf.section,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-mut)',
              background: 'var(--surf-1)',
              padding: '3px 10px',
              borderRadius: 6,
            }}
          >
            {t.section}
          </span>
        </div>

        <div
          onClick={(e) => cellPopup('type', undefined, e)}
          style={{
            order: orderOf.type,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          <Pill label={ty.label} bg={ty.bg} />
        </div>

        <div
          onClick={(e) => cellPopup('source', undefined, e)}
          style={{
            order: orderOf.source,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--surf-1)',
            cursor: viewer ? 'default' : 'pointer',
          }}
        >
          <Pill label={so.label} bg={so.bg} />
        </div>

        {customCols.map((c) => (
          <CustomCell
            key={c.id}
            col={c}
            taskId={t.id}
            viewer={viewer}
            order={orderOf[c.id]}
          />
        ))}
      </div>

      {expanded && (
        <SubRows t={t} g={g} rowGrid={rowGrid} cols={cols} viewer={viewer} />
      )}
    </>
  );
});

function CustomCell({
  col,
  taskId,
  viewer,
  order,
}: {
  col: CustomCol;
  taskId: string;
  viewer: boolean;
  order: number;
}) {
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
    color: 'var(--text-3)',
  };

  const wrap = (child: React.ReactNode) => (
    <div
      style={{
        order,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
        borderRight: '1px solid var(--surf-1)',
      }}
    >
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
        style={{
          ...inputBase,
          textAlign: 'right',
          fontFamily: "'JetBrains Mono', monospace",
        }}
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
          border: `2px solid ${checked ? ACCENT : 'var(--line)'}`,
          background: checked ? ACCENT : 'var(--card)',
          cursor: viewer ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
          >
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
        onClick={() => {
          if (viewer) return;
          const i = cur
            ? CUSTOM_STATES.findIndex((x) => x.label === cur.label)
            : -1;
          setColValue(
            taskId,
            col.id,
            CUSTOM_STATES[(i + 1) % CUSTOM_STATES.length],
          );
        }}
        style={{
          width: '100%',
          height: 28,
          borderRadius: 6,
          background: cur ? cur.color : 'var(--hover)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          cursor: viewer ? 'default' : 'pointer',
          boxShadow: cur ? 'inset 0 1px 0 var(--glass-edge)' : 'none',
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
        const i = ids.indexOf(
          typeof value === 'string' && value ? value : null,
        );
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
  rowGrid,
  cols,
  viewer,
}: {
  t: Task;
  g: ViewGroup;
  rowGrid: string;
  cols: Col[];
  viewer: boolean;
}) {
  const subs = t.subs ?? [];
  const addingSub = useBoard((s) => s.addingSub === t.id);
  const subDraft = useBoard((s) => s.subDraft);
  const setSubDraft = useBoard((s) => s.setSubDraft);
  const addSub = useBoard((s) => s.addSub);
  const cancelAddSub = useBoard((s) => s.cancelAddSub);
  const startAddSub = useBoard((s) => s.startAddSub);

  return (
    <>
      {subs.map((sub) => (
        <SubRow
          key={sub.id}
          sub={sub}
          taskId={t.id}
          g={g}
          rowGrid={rowGrid}
          cols={cols}
          viewer={viewer}
        />
      ))}
      {!viewer && addingSub && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0 0 84px',
            height: 36,
            borderLeft: `3px solid ${g.color}`,
            borderBottom: '1px solid var(--surf-1)',
            background: 'var(--glass-hi)',
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
            color: 'var(--text-faint)',
            fontSize: 12.5,
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
            strokeWidth="2.2"
          >
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
  rowGrid,
  cols,
  viewer,
}: {
  sub: Sub;
  taskId: string;
  g: ViewGroup;
  rowGrid: string;
  cols: Col[];
  viewer: boolean;
}) {
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const sst = STATUS[sub.status];
  const so = personById(sub.owner);
  const orderOf: Record<string, number> = {};
  cols.forEach((c, i) => {
    orderOf[c.key] = i + 1;
  });
  const subKeys = ['task', 'owner', 'status', 'due'];

  let sdueLabel = '—';
  let sdueColor = 'var(--line)';
  let sdueStrike = 'none';
  if (sub.due) {
    sdueLabel = fmt(sub.due);
    if (sub.status === 'done') {
      sdueColor = '#4a9b7f';
      sdueStrike = 'line-through';
    } else {
      sdueColor =
        dayNum(sub.due) < dayNum(TODAY) ? '#cf6b6b' : 'var(--text-mut)';
    }
  }

  const subPopup = (
    kind: string,
    field: string | undefined,
    e: React.MouseEvent,
  ) => {
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
        gridTemplateColumns: rowGrid,
        height: 36,
        background: 'var(--glass)',
        borderBottom: '1px solid var(--surf-1)',
        borderLeft: `3px solid ${g.color}`,
      }}
    >
      <div style={{ borderRight: '1px solid var(--surf-1)' }} />
      <div
        onClick={() => openPanel(taskId)}
        style={{
          order: orderOf.task,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px 0 28px',
          borderRight: '1px solid var(--surf-1)',
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--line)"
          strokeWidth="2.2"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 5v8a3 3 0 0 0 3 3h11" />
        </svg>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--text-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub.name}
        </span>
      </div>
      <div
        onClick={(e) => subPopup('people', undefined, e)}
        style={{
          order: orderOf.owner,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid var(--surf-1)',
          cursor: viewer ? 'default' : 'pointer',
        }}
      >
        {so ? (
          <Avatar initials={so.initials} color={so.color} size={24} font={10} />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1.5px dashed var(--line)',
            }}
          />
        )}
      </div>
      <div
        onClick={(e) => subPopup('status', undefined, e)}
        style={{
          order: orderOf.status,
          borderRight: '1px solid var(--surf-1)',
          cursor: viewer ? 'default' : 'pointer',
        }}
      >
        <div
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
            boxShadow: 'inset 0 0 0 1px var(--hover)',
          }}
        >
          {sst.label}
        </div>
      </div>
      <div
        onClick={(e) => subPopup('date', 'due', e)}
        style={{
          order: orderOf.due,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid var(--surf-1)',
          cursor: viewer ? 'default' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: sdueColor,
          textDecoration: sdueStrike,
        }}
      >
        {sdueLabel}
      </div>
      {cols
        .filter((c) => !subKeys.includes(c.key))
        .map((c) => (
          <div
            key={c.key}
            style={{
              order: orderOf[c.key],
              borderRight: '1px solid var(--surf-1)',
            }}
          />
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
  const totalDays =
    order.reduce((acc, k) => acc + (task.phases![k].days || 0), 0) || 1;
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
        boxShadow:
          'inset 0 1px 1px var(--scrim), inset 0 1px 0 var(--glass-edge)',
      }}
    >
      {segs.map((s, i) => (
        <div key={i} style={{ width: s.pct, background: s.bg }} />
      ))}
    </div>
  );
}

function EmptyRow({
  color,
  icon,
  children,
}: {
  color: string;
  icon: 'board' | 'search';
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '14px 18px 14px 22px',
        borderLeft: `3px solid ${color}`,
        borderBottom: '1px solid var(--surf-1)',
        background: 'var(--glass-soft)',
      }}
    >
      {icon === 'board' ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--line)"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ) : (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--line)"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      )}
      <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
        {children}
      </span>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  const setQuery = useBoard((s) => s.setQuery);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '70px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: 'var(--glass)',
          border: '1px solid var(--glass)',
          boxShadow: 'inset 0 1px 0 var(--glass-hi)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 5 }}>
        Ничего не найдено
      </div>
      <div
        style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 18 }}
      >
        По запросу «{query}» нет задач ни в одной роли.
      </div>
      <button
        onClick={() => setQuery('')}
        style={{
          height: 38,
          padding: '0 18px',
          border: '1px solid var(--hover)',
          background: 'var(--glass)',
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--text-3)',
          cursor: 'pointer',
        }}
      >
        Сбросить поиск
      </button>
    </div>
  );
}
