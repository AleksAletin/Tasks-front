// Toast stack (brief §5.21, prototype ~1052 template). Bottom-right stack of dark
// glass toasts (toastIn animation), each with an optional "Отменить" (undo) button
// and a close affordance. Ephemeral — driven by the store's `toasts` array.
import { useBoard } from './store';

export function Toasts() {
  const toasts = useBoard((s) => s.toasts);
  const dismissToast = useBoard((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 22,
        zIndex: 130,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            minWidth: 300,
            maxWidth: 420,
            padding: '12px 13px 12px 15px',
            background: 'rgba(28,31,36,0.8)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--glass-edge)',
            borderRadius: 13,
            boxShadow:
              '0 16px 40px var(--scrim), inset 0 1px 0 var(--glass-edge)',
            animation: 'toastIn .22s cubic-bezier(.22,.85,.25,1)',
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 600, color: '#fff', flex: 1 }}
          >
            {t.text}
          </span>
          {t.undo && (
            <button
              onClick={() => {
                t.undo?.();
                dismissToast(t.id);
              }}
              style={{
                height: 28,
                padding: '0 12px',
                border: 'none',
                background: 'var(--glass-edge)',
                color: '#fff',
                borderRadius: 7,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Отменить
            </button>
          )}
          <div
            onClick={() => dismissToast(t.id)}
            style={{
              width: 24,
              height: 24,
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
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
