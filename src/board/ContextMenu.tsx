// Row context menu (brief §5.11, prototype ~1312 template). Right-click on a table
// row opens a glass menu at the cursor: Открыть / Дублировать / Создать ниже /
// Добавить подэлемент · Архивировать / Удалить. Closes on outside-click, right-click
// elsewhere, or Esc. Hidden in viewer mode (the row handler never opens it there).
import { useEffect } from 'react';
import { useBoard } from './store';

export function ContextMenu() {
  const ctxMenu = useBoard((s) => s.ctxMenu);
  const viewer = useBoard((s) => s.viewer);
  const closeCtx = useBoard((s) => s.closeCtx);
  const openPanel = useBoard((s) => s.openPanel);
  const duplicateTasks = useBoard((s) => s.duplicateTasks);
  const createTaskBelow = useBoard((s) => s.createTaskBelow);
  const archiveTask = useBoard((s) => s.archiveTask);
  const deleteTasks = useBoard((s) => s.deleteTasks);
  const startAddSub = useBoard((s) => s.startAddSub);

  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCtx();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxMenu, closeCtx]);

  if (!ctxMenu || viewer) return null;
  const id = ctxMenu.taskId;

  const item = (
    label: string,
    color: string,
    hoverBg: string,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <div
      onClick={() => {
        closeCtx();
        onClick();
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '8px 10px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        color,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </div>
  );

  return (
    <>
      <div
        onClick={closeCtx}
        onContextMenu={(e) => {
          e.preventDefault();
          closeCtx();
        }}
        style={{ position: 'fixed', inset: 0, zIndex: 88 }}
      />
      <div
        style={{
          position: 'fixed',
          left: ctxMenu.x,
          top: ctxMenu.y,
          zIndex: 89,
          width: 230,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 13,
          boxShadow: '0 16px 44px rgba(30,40,80,.2), inset 0 1px 0 rgba(255,255,255,.75)',
          padding: 6,
          animation: 'popIn .12s ease',
        }}
      >
        {item(
          'Открыть задачу',
          '#3a3d42',
          'rgba(0,0,0,0.05)',
          () => openPanel(id),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#797d84" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>,
        )}
        {item(
          'Дублировать',
          '#3a3d42',
          'rgba(0,0,0,0.05)',
          () => duplicateTasks([id]),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#797d84" strokeWidth="2">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>,
        )}
        {item(
          'Создать задачу ниже',
          '#3a3d42',
          'rgba(0,0,0,0.05)',
          () => createTaskBelow(id),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#797d84" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>,
        )}
        {item(
          'Добавить подэлемент',
          '#3a3d42',
          'rgba(0,0,0,0.05)',
          () => startAddSub(id),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#797d84" strokeWidth="2">
            <path d="M5 5v8a3 3 0 0 0 3 3h11" />
            <path d="M16 12l4 4-4 4" />
          </svg>,
        )}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '5px 6px' }} />
        {item(
          'Архивировать',
          '#6b6f76',
          'rgba(0,0,0,0.05)',
          () => archiveTask(id),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a9da2" strokeWidth="2">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M3 9h18" />
          </svg>,
        )}
        {item(
          'Удалить',
          '#cf6b6b',
          'rgba(207,107,107,0.1)',
          () => deleteTasks([id]),
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </svg>,
        )}
      </div>
    </>
  );
}
