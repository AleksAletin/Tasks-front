// Left sidebar — collapsible, boards section, dashboard/users nav (brief §5.2, prototype ~59).
import { useBoard } from './store';

const ACCENT = '#4263d8';

export function Sidebar() {
  const navOpen = useBoard((s) => s.navOpen);
  const toggleNav = useBoard((s) => s.toggleNav);
  const boards = useBoard((s) => s.boards);
  const activeBoardId = useBoard((s) => s.activeBoardId);
  const screen = useBoard((s) => s.screen);
  const selectBoard = useBoard((s) => s.selectBoard);
  const addBoard = useBoard((s) => s.addBoard);
  const setScreen = useBoard((s) => s.setScreen);

  const navW = navOpen ? 232 : 66;
  const dashActive = screen === 'dashboard';
  const peopleActive = screen === 'users';
  const boardActive = screen === 'board';

  return (
    <aside
      style={{
        width: navW,
        flexShrink: 0,
        background: 'rgba(250,250,253,0.58)',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        borderRight: '1px solid rgba(255,255,255,0.5)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.35)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .18s ease',
      }}
    >
      <div
        style={{
          height: 54,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 16px',
          borderBottom: '1px solid #eeeeea',
        }}
      >
        <div
          className="noinv"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: ACCENT,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          W
        </div>
        {navOpen && <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>Work</div>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        <div
          onClick={toggleNav}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '8px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#797d84',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {navOpen && <span style={{ fontSize: 13, fontWeight: 600 }}>Рабочее пространство</span>}
        </div>

        {navOpen && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 14, padding: '0 6px 6px 10px' }}>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                color: '#a6a8ab',
              }}
            >
              Доски
            </span>
            <div
              onClick={addBoard}
              title="Добавить доску"
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                cursor: 'pointer',
                color: '#a6a8ab',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>
        )}

        {boards.map((b) => {
          const active = b.id === activeBoardId;
          const bg = active && boardActive ? '#eef0fb' : 'transparent';
          return (
            <div
              key={b.id}
              onClick={() => {
                selectBoard(b.id);
                setScreen('board');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                background: bg,
                color: active ? '#3a3d42' : '#797d84',
              }}
            >
              <span
                className="noinv"
                style={{ width: 8, height: 8, borderRadius: 3, background: b.color, flexShrink: 0 }}
              />
              {navOpen && (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
              )}
            </div>
          );
        })}

        <div style={{ height: 1, background: '#eeeeea', margin: '12px 6px' }} />

        <NavItem
          active={dashActive}
          label="Дашборд и отчётность"
          navOpen={navOpen}
          onClick={() => setScreen('dashboard')}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z" />
            </svg>
          }
        />
        <NavItem
          active={peopleActive}
          label="Пользователи"
          navOpen={navOpen}
          onClick={() => setScreen('users')}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          }
        />
      </div>
    </aside>
  );
}

function NavItem({
  active,
  label,
  navOpen,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  navOpen: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
        background: active ? '#eef0fb' : 'transparent',
        color: active ? ACCENT : '#797d84',
      }}
    >
      {icon}
      {navOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </div>
  );
}
