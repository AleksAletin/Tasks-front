// Top bar — search, role toggle, icon buttons, dark toggle, settings gear (brief §5.3, prototype ~114).
import { useBoard } from './store';
import { Tip } from './ui';

const ACCENT = '#4263d8';

export function Topbar() {
  const query = useBoard((s) => s.query);
  const setQuery = useBoard((s) => s.setQuery);
  const viewer = useBoard((s) => s.viewer);
  const setViewer = useBoard((s) => s.setViewer);
  const dark = useBoard((s) => s.dark);
  const toggleDark = useBoard((s) => s.toggleDark);
  const openSettings = useBoard((s) => s.openSettings);

  return (
    <header
      style={{
        height: 54,
        flexShrink: 0,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(26px) saturate(170%)',
        WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 18px',
        position: 'relative',
        zIndex: 8,
      }}
    >
      <div style={{ position: 'relative', width: 300, maxWidth: '38vw' }}>
        <span
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a6a8ab',
            display: 'flex',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск задач, людей, досок…"
          style={{
            width: '100%',
            height: 34,
            border: '1px solid #e6e6e2',
            borderRadius: 9,
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px) saturate(150%)',
            WebkitBackdropFilter: 'blur(12px) saturate(150%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
            padding: '0 12px 0 33px',
            fontSize: 13,
            outline: 'none',
            color: '#23262b',
          }}
        />
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.045)',
          borderRadius: 9,
          padding: 3,
          marginRight: 8,
        }}
      >
        <div
          onClick={() => setViewer(false)}
          style={{
            padding: '5px 11px',
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            background: !viewer ? '#fff' : 'transparent',
            color: !viewer ? '#23262b' : '#797d84',
            boxShadow: !viewer ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all .14s ease',
          }}
        >
          Участник
        </div>
        <div
          onClick={() => setViewer(true)}
          style={{
            padding: '5px 11px',
            borderRadius: 7,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            background: viewer ? '#fff' : 'transparent',
            color: viewer ? '#23262b' : '#797d84',
            boxShadow: viewer ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all .14s ease',
          }}
        >
          Наблюдатель
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b6f76' }}>
        <Tip text="Уведомления" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
        </Tip>
        <Tip text="Инбокс" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path d="M4 4h16v12H7l-3 3z" />
          </svg>
        </Tip>
        <Tip text="Помощь" style={iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-.7.6-.7 1.1v.5" />
            <path d="M12 17h.01" />
          </svg>
        </Tip>
        <Tip
          text="Командная палитра"
          style={{
            height: 34,
            padding: '0 10px',
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            cursor: 'pointer',
            color: '#9a9da2',
            border: '1px solid #e6e6e2',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700 }}>⌘K</span>
        </Tip>
        <Tip text="Тёмная тема · D" className="noinv" style={iconBtn} onClick={toggleDark}>
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d6953f" strokeWidth="1.9">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </Tip>
        {!viewer && (
          <Tip text="Настройки · Админ" style={{ ...iconBtn, color: '#6b6f76' }} onClick={openSettings}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Tip>
        )}
        <button
          style={{
            height: 34,
            padding: '0 13px',
            marginLeft: 6,
            border: '1px solid #e6e6e2',
            background: '#fff',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            color: '#3a3d42',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          Пригласить
        </button>
        <Tip
          text="Вера Павлова · профиль"
          className="noinv"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: ACCENT,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 12,
            marginLeft: 6,
            cursor: 'pointer',
          }}
        >
          ВП
        </Tip>
      </div>
    </header>
  );
}

const iconBtn = {
  width: 34,
  height: 34,
  borderRadius: 9,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
} as const;
