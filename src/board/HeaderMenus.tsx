// Column header overlays for the board table (brief §5.10, prototype ~1157 + ~1171).
// addColMenu: the «＋» type picker (6 COL_TYPES) → addColumn. headerMenu: per-column
// rename (input → colLabels / customCols[].label) plus delete for custom columns.
import { useBoard } from './store';
import { COL_TYPES } from './model';

const ACCENT = '#4263d8';

const BASE_LABELS: Record<string, string> = {
  task: 'Задача',
  owner: 'Владелец',
  status: 'Статус',
  due: 'Срок',
  priority: 'Приоритет',
  tl: 'Шкала времени',
  note: 'Примечания',
  updated: 'Обновлено',
  section: 'Раздел',
  type: 'Тип',
  source: 'Источник',
};

export function HeaderMenus() {
  const addColMenu = useBoard((s) => s.addColMenu);
  const headerMenu = useBoard((s) => s.headerMenu);
  const customCols = useBoard((s) => s.customCols);
  const colLabels = useBoard((s) => s.colLabels);
  const addColumn = useBoard((s) => s.addColumn);
  const closeAddColMenu = useBoard((s) => s.closeAddColMenu);
  const setColLabel = useBoard((s) => s.setColLabel);
  const deleteColumn = useBoard((s) => s.deleteColumn);
  const closeHeaderMenu = useBoard((s) => s.closeHeaderMenu);

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
              position: 'fixed',
              left: addColMenu.x,
              top: addColMenu.y,
              zIndex: 89,
              width: 240,
              background: 'var(--glass-hi)',
              backdropFilter: 'blur(30px) saturate(185%)',
              WebkitBackdropFilter: 'blur(30px) saturate(185%)',
              border: '1px solid var(--glass)',
              borderRadius: 13,
              boxShadow:
                '0 16px 44px var(--shadow), inset 0 1px 0 var(--glass-hi)',
              padding: 8,
              animation: 'popIn .12s ease',
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
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d={ty.d} />
                  </svg>
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

      {headerMenu && (
        <>
          <div
            onClick={closeHeaderMenu}
            style={{ position: 'fixed', inset: 0, zIndex: 88 }}
          />
          <div
            style={{
              position: 'fixed',
              left: headerMenu.x,
              top: headerMenu.y,
              zIndex: 89,
              width: 240,
              background: 'var(--glass-hi)',
              backdropFilter: 'blur(30px) saturate(185%)',
              WebkitBackdropFilter: 'blur(30px) saturate(185%)',
              border: '1px solid var(--glass)',
              borderRadius: 13,
              boxShadow:
                '0 16px 44px var(--shadow), inset 0 1px 0 var(--glass-hi)',
              padding: 12,
              animation: 'popIn .12s ease',
            }}
          >
            <input
              value={
                headerMenu.custom
                  ? (customCols.find((c) => c.id === headerMenu.key)?.label ??
                    '')
                  : (colLabels[headerMenu.key] ??
                    BASE_LABELS[headerMenu.key] ??
                    '')
              }
              onChange={(e) => setColLabel(headerMenu.key, e.target.value)}
              autoFocus
              onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = 'var(--scrim)')
              }
              style={{
                width: '100%',
                height: 34,
                border: '1px solid var(--scrim)',
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 13.5,
                fontWeight: 600,
                outline: 'none',
                background: 'var(--card)',
              }}
            />
            {headerMenu.custom && (
              <div
                onClick={() => deleteColumn(headerMenu.key)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(207,107,107,0.1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 8,
                  padding: '8px 9px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#cf6b6b',
                  cursor: 'pointer',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                </svg>
                Удалить столбец
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
