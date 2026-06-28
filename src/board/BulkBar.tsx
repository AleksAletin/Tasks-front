// Bulk-action bar (brief §5.11, prototype ~1107 template). Floating dark glass panel
// pinned bottom-center; appears when ≥1 task is selected. Дублировать / Удалить both
// push an Undo toast (store actions snapshot groups). Hidden in viewer mode.
import { useBoard } from './store';

export function BulkBar() {
  const selectedIds = useBoard((s) => s.selectedIds);
  const viewer = useBoard((s) => s.viewer);
  const duplicateTasks = useBoard((s) => s.duplicateTasks);
  const deleteTasks = useBoard((s) => s.deleteTasks);
  const clearSelection = useBoard((s) => s.clearSelection);

  const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
  if (viewer || ids.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'rgba(28,31,36,0.74)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        color: '#fff',
        borderRadius: 14,
        padding: '8px 8px 8px 16px',
        boxShadow: '0 14px 40px var(--scrim), inset 0 1px 0 var(--glass-edge)',
        border: '1px solid var(--glass-edge)',
        animation: 'popIn .16s ease',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {ids.length} выбрано
      </span>
      <div
        style={{
          width: 1,
          height: 22,
          background: 'var(--glass-edge)',
          margin: '0 8px',
        }}
      />
      <button
        onClick={() => duplicateTasks(ids)}
        style={{
          height: 32,
          padding: '0 12px',
          border: 'none',
          background: 'transparent',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M8 6V4h8v2" />
          <path d="M5 6h14l-1 14H6z" />
        </svg>
        Дублировать
      </button>
      <button
        onClick={() => deleteTasks(ids)}
        style={{
          height: 32,
          padding: '0 12px',
          border: 'none',
          background: 'transparent',
          color: '#ff9b9b',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
        Удалить
      </button>
      <button
        onClick={clearSelection}
        style={{
          height: 32,
          width: 32,
          border: 'none',
          background: 'transparent',
          color: '#fff',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
