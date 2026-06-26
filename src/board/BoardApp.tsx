// Root container — login gate + app shell (sidebar/topbar/header/tabs/view) and overlays.
import { useEffect } from 'react';
import { useBoard } from './store';
import { Login } from './Login';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TableView } from './TableView';
import { ParityView } from './ParityView';
import { TimelineView } from './TimelineView';
import { AlertsView } from './AlertsView';
import { CalendarView } from './CalendarView';
import { ImportWizard } from './ImportWizard';
import { DashboardScreen } from './DashboardScreen';
import { SettingsScreen } from './SettingsScreen';
import { UsersScreen } from './UsersScreen';
import { Popup } from './Popup';
import { HeaderMenus } from './HeaderMenus';
import { ToolMenu } from './ToolMenu';
import { TaskPanel } from './TaskPanel';
import { Toasts } from './Toasts';
import { BulkBar } from './BulkBar';
import { CommandPalette } from './CommandPalette';
import { ContextMenu } from './ContextMenu';
import { Coachmarks } from './Coachmarks';

const ACCENT = '#4263d8';

type TabKey = 'table' | 'timeline' | 'parity' | 'alerts' | 'import' | 'calendar';

const TABS: { key: TabKey; label: string; d: string }[] = [
  { key: 'table', label: 'Таблица', d: 'M3 5h18v14H3zM3 10h18M9 5v14' },
  { key: 'timeline', label: 'Таймлайн', d: 'M4 7h10M8 12h12M4 17h8' },
  { key: 'parity', label: 'Паритет', d: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { key: 'alerts', label: 'Что горит', d: 'M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-2-1-3-1-3 3 2 4 5 4 7a7 7 0 0 1-14 0c0-4 4-6 5-9z' },
  { key: 'import', label: 'Импорт', d: 'M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' },
  { key: 'calendar', label: 'Календарь', d: 'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4' },
];

export function BoardApp() {
  const authed = useBoard((s) => s.authed);
  const dark = useBoard((s) => s.dark);
  const toggleDark = useBoard((s) => s.toggleDark);
  const screen = useBoard((s) => s.screen);
  const boardTab = useBoard((s) => s.boardTab);
  const settingsScreen = useBoard((s) => s.settingsScreen);
  const popup = useBoard((s) => s.popup);
  const toolMenu = useBoard((s) => s.toolMenu);
  const panelId = useBoard((s) => s.panelId);
  const startCoach = useBoard((s) => s.startCoach);

  // Global keyboard: ⌘K/Ctrl+K toggles the command palette (allowed over inputs), Esc
  // closes the palette then coachmarks, "?" reopens hints, D toggles dark theme. The
  // typing guard only suppresses the bare "?"/"D" hints — not ⌘K/Esc — brief §5.21.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const s = useBoard.getState();
        if (s.cmdOpen) s.closeCmd();
        else s.openCmd();
        return;
      }
      if (e.key === 'Escape') {
        const s = useBoard.getState();
        if (s.cmdOpen) s.closeCmd();
        else if (s.coachOpen) s.coachSkip();
        return;
      }
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') {
        startCoach();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        toggleDark();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDark, startCoach]);

  // First authenticated load shows the onboarding coachmarks once per browser.
  useEffect(() => {
    if (!authed) return;
    if (localStorage.getItem('work_coached')) return;
    localStorage.setItem('work_coached', '1');
    const t = setTimeout(() => startCoach(), 420);
    return () => clearTimeout(t);
  }, [authed, startCoach]);

  // Dark theme: apply the invert-based «liquid glass» filter at the document root.
  // On a React wrapper the glass backdrop-filter escapes the ancestor invert; on <html> it works.
  useEffect(() => {
    document.documentElement.classList.toggle('appdark', dark);
    return () => document.documentElement.classList.remove('appdark');
  }, [dark]);

  if (!authed) return <Login />;

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontSize: 14 }}
    >
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        {!settingsScreen && screen === 'board' && <BoardHeader />}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {settingsScreen ? (
            <SettingsScreen />
          ) : (
            <>
              {screen === 'board' && boardTab === 'table' && (
                <>
                  <Toolbar />
                  <TableView />
                </>
              )}
              {screen === 'board' && boardTab === 'parity' && <ParityView />}
              {screen === 'board' && boardTab === 'timeline' && <TimelineView />}
              {screen === 'board' && boardTab === 'alerts' && <AlertsView />}
              {screen === 'board' && boardTab === 'calendar' && <CalendarView />}
              {screen === 'board' && boardTab === 'import' && <ImportWizard />}
              {screen === 'dashboard' && <DashboardScreen />}
              {screen === 'users' && <UsersScreen />}
            </>
          )}
        </div>
      </main>

      {panelId && <TaskPanel />}
      {popup && <Popup />}
      {toolMenu && <ToolMenu />}
      <HeaderMenus />
      <ContextMenu />
      <BulkBar />
      <CommandPalette />
      <Coachmarks />
      <Toasts />
    </div>
  );
}

function BoardHeader() {
  const ytrack = useBoard((s) => s.integrations.ytrack);
  const viewer = useBoard((s) => s.viewer);
  const boardTab = useBoard((s) => s.boardTab);
  const setBoardTab = useBoard((s) => s.setBoardTab);
  const sourceLabel = ytrack ? 'источник правды · YouTrack' : 'источник правды · Work';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.46)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.4)',
        padding: '14px 18px 0',
        position: 'relative',
        zIndex: 7,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>Переезд на Work</h1>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a6a8ab" strokeWidth="2.2" style={{ cursor: 'pointer' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#a86b3f', background: '#f6ecdf', padding: '3px 9px', borderRadius: 6 }}>
          {sourceLabel}
        </span>
        {viewer && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: '#3a7d63',
              background: '#e8f3ee',
              padding: '3px 10px',
              borderRadius: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Только просмотр
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 12 }}>
        {TABS.map((tab) => {
          const active = boardTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => setBoardTab(tab.key)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 13px',
                fontSize: 13.5,
                fontWeight: 600,
                color: active ? '#23262b' : '#797d84',
                borderBottom: `2.5px solid ${active ? ACCENT : 'transparent'}`,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              <span style={{ display: 'flex' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={tab.d} />
                </svg>
              </span>
              {tab.label}
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '42%',
                    height: 2.5,
                    background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
                    animation: 'sheen 2.9s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toolbar() {
  const viewer = useBoard((s) => s.viewer);
  const filterStatus = useBoard((s) => s.filterStatus);
  const filterOwner = useBoard((s) => s.filterOwner);
  const sortBy = useBoard((s) => s.sortBy);
  const groupBy = useBoard((s) => s.groupBy);
  const openTool = useBoard((s) => s.openTool);

  const fActiveN = Object.keys(filterStatus).filter((k) => filterStatus[k]).length + (filterOwner ? 1 : 0);
  const sortNames: Record<string, string> = { name: 'Названию', due: 'Сроку', priority: 'Приоритету', status: 'Статусу' };
  const groupNames: Record<string, string> = {
    role: 'Роли',
    status: 'Статусу',
    priority: 'Приоритету',
    owner: 'Владельцу',
    section: 'Разделу',
  };
  const groupActive = !!groupBy && groupBy !== 'role';

  const open = (kind: 'filter' | 'sort' | 'group', e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 6;
    if (x + 240 > window.innerWidth - 10) x = window.innerWidth - 10 - 240;
    openTool({ kind, x, y });
  };

  const btns: { label: string; active: boolean; d: string; kind: 'filter' | 'sort' | 'group' }[] = [
    {
      label: fActiveN > 0 ? 'Фильтр · ' + fActiveN : 'Фильтр',
      active: fActiveN > 0,
      d: 'M3 5h18l-7 8v6l-4-2v-4z',
      kind: 'filter',
    },
    {
      label: sortBy ? 'Сортировка · ' + sortNames[sortBy] : 'Сортировка',
      active: !!sortBy,
      d: 'M3 6h12M3 12h8M3 18h5M17 8l3-3 3 3M20 5v14',
      kind: 'sort',
    },
    {
      label: groupActive ? 'Группировка · ' + groupNames[groupBy] : 'Группировать',
      active: groupActive,
      d: 'M4 6h16M4 12h16M4 18h10',
      kind: 'group',
    },
  ];

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.38)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.38)',
        padding: '9px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        zIndex: 7,
      }}
    >
      {!viewer && (
        <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden' }}>
          <button
            className="btn-sheen"
            style={{
              height: 34,
              padding: '0 14px',
              border: 'none',
              background: ACCENT,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ position: 'relative' }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Создать задачу
          </button>
          <button
            style={{
              height: 34,
              width: 30,
              border: 'none',
              borderLeft: '1px solid rgba(255,255,255,.25)',
              background: ACCENT,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      )}
      {btns.map((b) => (
        <button
          key={b.kind}
          onClick={(e) => open(b.kind, e)}
          style={{
            height: 34,
            padding: '0 11px',
            border: `1px solid ${b.active ? 'rgba(66,99,216,0.25)' : 'transparent'}`,
            background: b.active ? 'rgba(66,99,216,0.07)' : 'transparent',
            color: b.active ? ACCENT : '#5b5f66',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
          }}
        >
          <span style={{ display: 'flex', color: '#9a9da2' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={b.d} />
            </svg>
          </span>
          {b.label}
        </button>
      ))}
    </div>
  );
}
