// Toolbar popover (brief §5.9, prototype ~1119) — Filter / Sort / Group, glass menu.
import { useBoard } from './store';
import { PEOPLE } from './model';

const ACCENT = '#4263d8';

const SORT_OPTS: [string, string][] = [
  ['name', 'По названию'],
  ['due', 'По сроку'],
  ['priority', 'По приоритету'],
  ['status', 'По статусу'],
];
const GROUP_OPTS: [string, string][] = [
  ['role', 'По роли'],
  ['status', 'По статусу'],
  ['priority', 'По приоритету'],
  ['owner', 'По владельцу'],
  ['section', 'По разделу'],
];

export function ToolMenu() {
  const toolMenu = useBoard((s) => s.toolMenu);
  const closeTool = useBoard((s) => s.closeTool);
  const filterStatus = useBoard((s) => s.filterStatus);
  const filterOwner = useBoard((s) => s.filterOwner);
  const sortBy = useBoard((s) => s.sortBy);
  const sortDir = useBoard((s) => s.sortDir);
  const groupBy = useBoard((s) => s.groupBy);
  const setFilterStatus = useBoard((s) => s.setFilterStatus);
  const setFilterOwner = useBoard((s) => s.setFilterOwner);
  const clearFilters = useBoard((s) => s.clearFilters);
  const setSort = useBoard((s) => s.setSort);
  const setGroupBy = useBoard((s) => s.setGroupBy);
  const labels = useBoard((s) => s.labels);

  if (!toolMenu) return null;
  const filterN =
    Object.keys(filterStatus).filter((k) => filterStatus[k]).length +
    (filterOwner ? 1 : 0);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 88 }}
        onClick={closeTool}
      />
      <div
        style={{
          position: 'fixed',
          left: toolMenu.x,
          top: toolMenu.y,
          zIndex: 89,
          width: 248,
          background: 'var(--glass-hi)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid var(--glass)',
          borderRadius: 13,
          boxShadow: '0 16px 44px var(--shadow), inset 0 1px 0 var(--glass-hi)',
          padding: 10,
          animation: 'popIn .12s ease',
        }}
      >
        {toolMenu.kind === 'filter' && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px 6px 8px',
              }}
            >
              <span style={sectionLabel}>Статус</span>
              {filterN > 0 && (
                <span
                  onClick={clearFilters}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: ACCENT,
                    cursor: 'pointer',
                  }}
                >
                  Сбросить
                </span>
              )}
            </div>
            {labels.status.map((l) => {
              const on = !!filterStatus[l.key];
              return (
                <div
                  key={l.key}
                  onClick={() => setFilterStatus(l.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: `2px solid ${on ? ACCENT : 'var(--line)'}`,
                      background: on ? ACCENT : 'var(--card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.6"
                      >
                        <path d="M5 12l5 5L20 6" />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: l.bg,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-3)',
                    }}
                  >
                    {l.label}
                  </span>
                </div>
              );
            })}
            <div style={{ ...sectionLabel, padding: '10px 6px 6px' }}>
              Владелец
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                padding: '0 4px 2px',
              }}
            >
              {PEOPLE.slice(0, 6).map((p) => {
                const on = filterOwner === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setFilterOwner(p.id)}
                    title={p.name}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: p.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: on
                        ? `0 0 0 2px #fff, 0 0 0 4px ${ACCENT}`
                        : 'none',
                    }}
                  >
                    {p.initials}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {toolMenu.kind === 'sort' && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px 6px 8px',
              }}
            >
              <span style={sectionLabel}>Сортировать по</span>
            </div>
            {SORT_OPTS.map(([k, label]) => {
              const on = sortBy === k;
              return (
                <div
                  key={k}
                  onClick={() => setSort(k)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 9px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? ACCENT : 'var(--text-3)',
                  }}
                >
                  <span style={{ flex: 1 }}>{label}</span>
                  {on && (
                    <span style={{ color: ACCENT, fontWeight: 800 }}>
                      {sortDir === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}

        {toolMenu.kind === 'group' && (
          <>
            <div style={{ ...sectionLabel, padding: '2px 6px 8px' }}>
              Группировать по
            </div>
            {GROUP_OPTS.map(([k, label]) => {
              const on = (groupBy || 'role') === k;
              return (
                <div
                  key={k}
                  onClick={() => setGroupBy(k)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '8px 9px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? ACCENT : 'var(--text-3)',
                  }}
                >
                  <span style={{ flex: 1 }}>{label}</span>
                  {on && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={ACCENT}
                      strokeWidth="2.6"
                    >
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

const sectionLabel = {
  flex: 1,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.3px',
  color: 'var(--text-faint)',
} as const;
