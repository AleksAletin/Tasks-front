// «Что горит» view (brief §5.15, prototype ~699 + buildAlerts ~1993).
// Glass list of data-derived flags, sorted by severity, with a critical count and
// click-through navigation (open task panel or switch board tab).
import { useMemo } from 'react';
import { useBoard } from './store';
import { buildAlerts } from './alerts';
import type { Alert } from './alerts';

export function AlertsView() {
  const allGroups = useBoard((s) => s.groups);
  const activeBoardId = useBoard((s) => s.activeBoardId);
  const groups = useMemo(
    () => allGroups.filter((g) => (g.boardId ?? 'b1') === activeBoardId),
    [allGroups, activeBoardId],
  );
  const parity = useBoard((s) => s.parity);
  const openPanel = useBoard((s) => s.openPanel);
  const setBoardTab = useBoard((s) => s.setBoardTab);

  const alerts = useMemo(() => buildAlerts(groups, parity), [groups, parity]);

  const go = (a: Alert) => {
    if (a.target.kind === 'task' && a.target.taskId) openPanel(a.target.taskId);
    else if (a.target.kind === 'tab' && a.target.tab) setBoardTab(a.target.tab);
  };

  return (
    <div style={{ padding: '20px 22px 50px', maxWidth: 920 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-.4px',
          }}
        >
          Что горит
        </h2>
        <span
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)' }}
        >
          {alerts.count} флагов · {alerts.high} критичных · считается из данных
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {alerts.list.map((a, i) => (
          <div
            key={i}
            onClick={() => go(a)}
            className="alertcard"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 13,
              padding: '13px 15px',
              background: 'var(--glass)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
              border: '1px solid var(--glass)',
              borderRadius: 13,
              cursor: 'pointer',
              boxShadow: 'inset 0 1px 0 var(--glass)',
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: a.dot,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '.3px',
                    color: a.dot,
                    background: a.catBg,
                    padding: '2px 8px',
                    borderRadius: 5,
                  }}
                >
                  {a.cat}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text-2)',
                  lineHeight: 1.35,
                }}
              >
                {a.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-soft)',
                  marginTop: 1,
                }}
              >
                {a.sub}
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--line)"
              strokeWidth="2"
              style={{ marginTop: 3, flexShrink: 0 }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
