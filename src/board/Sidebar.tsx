// Left sidebar — collapsible, boards section, dashboard/users nav (brief §5.2, prototype ~59).
// In settings mode (settingsScreen), the boards nav is replaced by the settings section nav.
import type { Screen, SettingsTab } from './store';
import { useBoard } from './store';

const ACCENT = '#4263d8';

const SETTINGS_NAV: { key: SettingsTab; label: string; d: string }[] = [
  {
    key: 'integrations',
    label: 'Интеграции',
    d: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  },
  {
    key: 'sync',
    label: 'Синхронизация',
    d: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16',
  },
  { key: 'mapping', label: 'Правила маппинга', d: 'M4 7h16M4 12h10M4 17h7' },
  {
    key: 'access',
    label: 'Доступ',
    d: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z',
  },
  {
    key: 'appearance',
    label: 'Внешний вид',
    d: 'M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.5A4 4 0 0 1 14 7a4 4 0 0 1-2-7z',
  },
];

export function Sidebar() {
  const navOpen = useBoard((s) => s.navOpen);
  const toggleNav = useBoard((s) => s.toggleNav);
  const boards = useBoard((s) => s.boards);
  const activeBoardId = useBoard((s) => s.activeBoardId);
  const screen = useBoard((s) => s.screen);
  const settingsScreen = useBoard((s) => s.settingsScreen);
  const settingsTab = useBoard((s) => s.settingsTab);
  const selectBoard = useBoard((s) => s.selectBoard);
  const addBoard = useBoard((s) => s.addBoard);
  const setScreen = useBoard((s) => s.setScreen);
  const setSettingsTab = useBoard((s) => s.setSettingsTab);
  const closeSettings = useBoard((s) => s.closeSettings);

  const navW = navOpen ? 232 : 66;
  const dashActive = screen === 'dashboard';
  const peopleActive = screen === 'users';
  const boardActive = screen === 'board' && !settingsScreen;
  const migrationActive = screen === 'migration';
  const ticketsActive = screen === 'tickets';

  return (
    <aside
      style={{
        width: navW,
        flexShrink: 0,
        background: 'var(--glass)',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        borderRight: '1px solid var(--glass)',
        boxShadow: 'inset -1px 0 0 var(--glass-edge)',
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
          borderBottom: '1px solid var(--surf-1)',
        }}
      >
        <div
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
        {navOpen && (
          <div
            style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}
          >
            Work
          </div>
        )}
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
            color: 'var(--text-soft)',
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
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {navOpen && (
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Рабочее пространство
            </span>
          )}
        </div>

        {settingsScreen ? (
          <>
            <div
              onClick={closeSettings}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 14,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-soft)',
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
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {navOpen && <span>К доске</span>}
            </div>
            {navOpen && (
              <div
                style={{
                  marginTop: 10,
                  padding: '0 10px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.4px',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                }}
              >
                Настройки
              </div>
            )}
            {SETTINGS_NAV.map((t) => {
              const active = settingsTab === t.key;
              return (
                <div
                  key={t.key}
                  onClick={() => setSettingsTab(t.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? ACCENT : 'var(--text-soft)',
                    background: active ? 'var(--blue-tint)' : 'transparent',
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
                    <path d={t.d} />
                  </svg>
                  {navOpen && (
                    <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <BoardsNav
            navOpen={navOpen}
            boards={boards}
            activeBoardId={activeBoardId}
            boardActive={boardActive}
            dashActive={dashActive}
            peopleActive={peopleActive}
            migrationActive={migrationActive}
            ticketsActive={ticketsActive}
            addBoard={addBoard}
            selectBoard={selectBoard}
            setScreen={setScreen}
          />
        )}
      </div>
    </aside>
  );
}

function BoardsNav({
  navOpen,
  boards,
  activeBoardId,
  boardActive,
  dashActive,
  peopleActive,
  migrationActive,
  ticketsActive,
  addBoard,
  selectBoard,
  setScreen,
}: {
  navOpen: boolean;
  boards: { id: string; name: string; color: string }[];
  activeBoardId: string;
  boardActive: boolean;
  dashActive: boolean;
  peopleActive: boolean;
  migrationActive: boolean;
  ticketsActive: boolean;
  addBoard: () => void;
  selectBoard: (id: string) => void;
  setScreen: (s: Screen) => void;
}) {
  return (
    <>
      {navOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 14,
            padding: '0 6px 6px 10px',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.4px',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
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
              color: 'var(--text-faint)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>
      )}

      {boards.map((b) => {
        const active = b.id === activeBoardId;
        const bg = active && boardActive ? 'var(--blue-tint)' : 'transparent';
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
              color: active ? 'var(--text-3)' : 'var(--text-soft)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 3,
                background: b.color,
                flexShrink: 0,
              }}
            />
            {navOpen && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {b.name}
              </span>
            )}
          </div>
        );
      })}

      <div
        style={{ height: 1, background: 'var(--surf-1)', margin: '12px 6px' }}
      />

      <NavItem
        active={migrationActive}
        label="Карта переезда"
        navOpen={navOpen}
        onClick={() => setScreen('migration')}
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2zM9 4v16M15 6v16" />
          </svg>
        }
      />
      <NavItem
        active={ticketsActive}
        label="Обращения"
        navOpen={navOpen}
        onClick={() => setScreen('tickets')}
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" />
          </svg>
        }
      />
      <NavItem
        active={dashActive}
        label="Дашборд и отчётность"
        navOpen={navOpen}
        onClick={() => setScreen('dashboard')}
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          </svg>
        }
      />
    </>
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
        background: active ? 'var(--blue-tint)' : 'transparent',
        color: active ? ACCENT : 'var(--text-soft)',
      }}
    >
      {icon}
      {navOpen && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </div>
  );
}
