// Column header overlays for the board table (brief §5.10).
//  • addColMenu  — the «＋» type picker (6 COL_TYPES) → addColumn (the header «+» button).
//  • headerMenu  — the per-column «⋮» menu: filter / sort / collapse / wrap text / group-by /
//    duplicate / add-right / change-type / rename / delete, with drill-down submenus.
import { useEffect, useState, type ReactNode } from 'react';
import { useBoard } from './store';
import { COL_TYPES, BUILTIN_COL_LABEL, GROUPABLE_COLS } from './model';

const ACCENT = '#4263d8';

const panel: React.CSSProperties = {
  position: 'fixed',
  zIndex: 89,
  width: 250,
  background: 'var(--glass-hi)',
  backdropFilter: 'blur(30px) saturate(185%)',
  WebkitBackdropFilter: 'blur(30px) saturate(185%)',
  border: '1px solid var(--glass)',
  borderRadius: 13,
  boxShadow: '0 16px 44px var(--shadow), inset 0 1px 0 var(--glass-hi)',
  padding: 6,
  animation: 'popIn .12s ease',
};

function ic(d: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={d} />
    </svg>
  );
}

const ICON = {
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  sort: 'M7 4v15M4 8l3-4 3 4M17 20V5M14 16l3 4 3-4',
  collapse: 'M8 4l4 4 4-4M8 20l4-4 4 4',
  expand: 'M8 8l4-4 4 4M8 16l4 4 4-4',
  wrap: 'M4 6h16M4 12h12a3 3 0 0 1 0 6h-3m1.5-2.5L13 18l2.5 2',
  group: 'M4 5h10M4 12h16M4 19h7',
  duplicate: 'M9 9h11v11H9zM4 4h11v2M4 4v11h2',
  add: 'M12 5v14M5 12h14',
  type: 'M16 3l5 5-5 5M21 8H9M8 21l-5-5 5-5M3 16h12',
  ext: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z',
  rename: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  back: 'M15 18l-6-6 6-6',
  check: 'M5 12l5 5L20 6',
  hide: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM1 1l22 22',
};

function MenuItem({
  icon,
  label,
  onClick,
  arrow,
  disabled,
  danger,
  checked,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  arrow?: boolean;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.background = danger
            ? 'rgba(207,107,107,0.1)'
            : 'rgba(66,99,216,0.08)';
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '8px 9px',
        borderRadius: 8,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13.5,
        fontWeight: 600,
        color: disabled
          ? 'var(--text-faint)'
          : danger
            ? '#cf6b6b'
            : 'var(--text-2)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          display: 'flex',
          flexShrink: 0,
          color: disabled
            ? 'var(--text-faint)'
            : danger
              ? '#cf6b6b'
              : 'var(--text-mut)',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      {checked && (
        <span style={{ display: 'flex', color: ACCENT }}>{ic(ICON.check)}</span>
      )}
      {arrow && (
        <span style={{ display: 'flex', color: 'var(--text-faint)' }}>
          {ic('M9 6l6 6-6 6')}
        </span>
      )}
    </div>
  );
}

const divider = (
  <div style={{ height: 1, background: 'var(--surf-1)', margin: '5px 4px' }} />
);

function SubHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div
      onClick={onBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        marginBottom: 2,
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--text-soft)',
      }}
    >
      <span style={{ display: 'flex' }}>{ic(ICON.back)}</span>
      {label}
    </div>
  );
}

type View = 'main' | 'sort' | 'add' | 'type' | 'rename';

function ColumnMenu() {
  const headerMenu = useBoard((s) => s.headerMenu);
  const customCols = useBoard((s) => s.customCols);
  const colLabels = useBoard((s) => s.colLabels);
  const colWrap = useBoard((s) => s.colWrap);
  const colCollapsed = useBoard((s) => s.colCollapsed);
  const sortBy = useBoard((s) => s.sortBy);
  const sortDir = useBoard((s) => s.sortDir);

  const setColLabel = useBoard((s) => s.setColLabel);
  const setColType = useBoard((s) => s.setColType);
  const duplicateColumn = useBoard((s) => s.duplicateColumn);
  const deleteColumn = useBoard((s) => s.deleteColumn);
  const addColumn = useBoard((s) => s.addColumn);
  const toggleColWrap = useBoard((s) => s.toggleColWrap);
  const toggleColCollapse = useBoard((s) => s.toggleColCollapse);
  const sortColumn = useBoard((s) => s.sortColumn);
  const setGroupBy = useBoard((s) => s.setGroupBy);
  const openTool = useBoard((s) => s.openTool);
  const closeHeaderMenu = useBoard((s) => s.closeHeaderMenu);

  const [view, setView] = useState<View>('main');
  // Reset the drill-down when a different column's menu opens (rename mode when requested).
  const stamp = headerMenu ? headerMenu.key + (headerMenu.rename ? ':r' : '') : '';
  useEffect(() => {
    setView(headerMenu?.rename ? 'rename' : 'main');
  }, [stamp, headerMenu?.rename]);

  if (!headerMenu) return null;
  const key = headerMenu.key;
  const custom = headerMenu.custom;
  const curCol = custom ? customCols.find((c) => c.id === key) : undefined;
  const label = custom
    ? (curCol?.label ?? '')
    : (colLabels[key] ?? BUILTIN_COL_LABEL[key] ?? key);
  const groupable = GROUPABLE_COLS.has(key);
  const collapsed = !!colCollapsed[key];

  // Clamp the panel to the viewport.
  const x = Math.min(headerMenu.x, window.innerWidth - 250 - 10);
  const maxH = window.innerHeight - headerMenu.y - 16;
  const style: React.CSSProperties = {
    ...panel,
    left: Math.max(8, x),
    top: headerMenu.y,
    maxHeight: maxH,
    overflowY: 'auto',
  };

  let body: ReactNode;
  if (view === 'rename') {
    body = (
      <input
        defaultValue={label}
        autoFocus
        onChange={(e) => setColLabel(key, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') closeHeaderMenu();
        }}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          width: '100%',
          height: 34,
          border: `1px solid ${ACCENT}`,
          borderRadius: 8,
          padding: '0 10px',
          fontSize: 13.5,
          fontWeight: 600,
          outline: 'none',
          background: 'var(--card)',
          color: 'var(--text)',
        }}
      />
    );
  } else if (view === 'sort') {
    body = (
      <>
        <SubHeader label="Сортировать" onBack={() => setView('main')} />
        <MenuItem
          icon={ic('M12 19V5M5 12l7-7 7 7')}
          label="По возрастанию"
          checked={sortBy === key && sortDir === 'asc'}
          onClick={() => sortColumn(key, 'asc')}
        />
        <MenuItem
          icon={ic('M12 5v14M5 12l7 7 7-7')}
          label="По убыванию"
          checked={sortBy === key && sortDir === 'desc'}
          onClick={() => sortColumn(key, 'desc')}
        />
      </>
    );
  } else if (view === 'add' || view === 'type') {
    const adding = view === 'add';
    body = (
      <>
        <SubHeader
          label={adding ? 'Добавить столбец справа' : 'Тип столбца'}
          onBack={() => setView('main')}
        />
        {COL_TYPES.map((t) => (
          <MenuItem
            key={t.key}
            icon={ic(t.d)}
            label={t.label}
            checked={!adding && curCol?.type === t.key}
            onClick={() =>
              adding ? addColumn(t.key, key) : setColType(key, t.key)
            }
          />
        ))}
      </>
    );
  } else {
    body = (
      <>
        <MenuItem
          icon={ic(ICON.filter)}
          label="Фильтр"
          onClick={() =>
            openTool({ kind: 'filter', x: headerMenu.x, y: headerMenu.y })
          }
        />
        <MenuItem
          icon={ic(ICON.sort)}
          label="Сортировать"
          arrow
          disabled={custom}
          onClick={() => !custom && setView('sort')}
        />
        <MenuItem
          icon={ic(collapsed ? ICON.expand : ICON.collapse)}
          label={collapsed ? 'Развернуть' : 'Свернуть'}
          onClick={() => {
            toggleColCollapse(key);
            closeHeaderMenu();
          }}
        />
        <MenuItem
          icon={ic(ICON.wrap)}
          label="Перенос текста"
          checked={!!colWrap[key]}
          onClick={() => toggleColWrap(key)}
        />
        <MenuItem
          icon={ic(ICON.group)}
          label="Группировать по"
          disabled={!groupable}
          onClick={() => {
            setGroupBy(key);
            closeHeaderMenu();
          }}
        />
        {divider}
        <MenuItem
          icon={ic(ICON.duplicate)}
          label="Дублировать столбец"
          disabled={!custom}
          onClick={() => duplicateColumn(key)}
        />
        <MenuItem
          icon={ic(ICON.add)}
          label="Добавить столбец справа"
          arrow
          onClick={() => setView('add')}
        />
        <MenuItem
          icon={ic(ICON.type)}
          label="Изменить тип столбца"
          arrow
          disabled={!custom}
          onClick={() => custom && setView('type')}
        />
        {divider}
        <MenuItem icon={ic(ICON.ext)} label="Расширения столбцов" arrow disabled />
        {divider}
        <MenuItem
          icon={ic(ICON.rename)}
          label="Переименовать"
          onClick={() => setView('rename')}
        />
        <MenuItem
          icon={ic(ICON.trash)}
          label="Удалить"
          danger={custom}
          disabled={!custom}
          onClick={() => custom && deleteColumn(key)}
        />
      </>
    );
  }

  return (
    <>
      <div
        onClick={closeHeaderMenu}
        style={{ position: 'fixed', inset: 0, zIndex: 88 }}
      />
      <div style={style}>{body}</div>
    </>
  );
}

export function HeaderMenus() {
  const addColMenu = useBoard((s) => s.addColMenu);
  const addColumn = useBoard((s) => s.addColumn);
  const closeAddColMenu = useBoard((s) => s.closeAddColMenu);

  return (
    <>
      {addColMenu && (
        <>
          <div
            onClick={closeAddColMenu}
            style={{ position: 'fixed', inset: 0, zIndex: 88 }}
          />
          <div
            style={{
              ...panel,
              left: addColMenu.x,
              top: addColMenu.y,
              padding: 8,
            }}
          >
            {COL_TYPES.map((ty) => (
              <div
                key={ty.key}
                onClick={() => addColumn(ty.key)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(66,99,216,0.08)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '8px 9px',
                  borderRadius: 9,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    borderRadius: 8,
                    background: 'var(--hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-mut)',
                  }}
                >
                  {ic(ty.d)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: 'var(--text-2)',
                    }}
                  >
                    {ty.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                    {ty.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ColumnMenu />
    </>
  );
}
