// Users & access screen (brief §5.19, prototype ~965 + invite popup ~1000 + usersList ~2280).
// Glass table: avatar + name + email · role (click cycles) · activity · status (toggle). Invite popup.
import { useBoard } from './store';
import { PEOPLE, ROLES, ROLE_COLORS, type Person } from './model';

const ACCENT = '#4263d8';
const GRID = '2.4fr 1.3fr 1.3fr 1.1fr';

export function UsersScreen() {
  const userOverrides = useBoard((s) => s.userOverrides);
  const invites = useBoard((s) => s.invites);
  const cycleRole = useBoard((s) => s.cycleRole);
  const toggleUserActive = useBoard((s) => s.toggleUserActive);
  const openInvite = useBoard((s) => s.openInvite);
  const inviteOpen = useBoard((s) => s.inviteOpen);

  const rows: Person[] = PEOPLE.map((p) => {
    const o = userOverrides[p.id];
    return { ...p, role: o?.role ?? p.role, active: o?.active ?? p.active };
  }).concat(invites);

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1080 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-.4px',
          }}
        >
          Пользователи и доступ
        </h2>
        <span
          style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)' }}
        >
          {rows.length} человек
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={openInvite}
          style={{
            height: 36,
            padding: '0 16px',
            border: 'none',
            background: ACCENT,
            color: '#fff',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
          Пригласить
        </button>
      </div>

      <div
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          border: '1px solid var(--glass)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 var(--glass)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            padding: '12px 18px',
            borderBottom: '1px solid var(--hover)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-soft)',
          }}
        >
          <div>Пользователь</div>
          <div>Роль</div>
          <div>Активность</div>
          <div>Статус</div>
        </div>
        {rows.map((u) => {
          const roleBg = ROLE_COLORS[u.role] || 'var(--text-faint)';
          const statusLabel = u.active ? 'Активен' : 'Деактивирован';
          const statusColor = u.active ? '#3a7d63' : 'var(--text-faint)';
          const statusBg = u.active ? 'var(--green-tint)' : 'var(--surf-1)';
          return (
            <div
              key={u.id}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                alignItems: 'center',
                padding: '11px 18px',
                borderBottom: '1px solid var(--hover)',
                opacity: u.active ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: u.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: 'inset 0 0 0 1.5px var(--glass-edge)',
                  }}
                >
                  {u.initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: 'var(--text-2)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {u.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-faint)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {u.email}
                  </div>
                </div>
              </div>
              <div>
                <span
                  onClick={() => cycleRole(u.id)}
                  title="Сменить роль"
                  style={{
                    display: 'inline-flex',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    background: roleBg,
                    padding: '4px 11px',
                    borderRadius: 7,
                    cursor: 'pointer',
                    boxShadow: 'inset 0 1px 0 var(--glass-edge)',
                  }}
                >
                  {u.role}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--text-soft)',
                }}
              >
                {u.lastActive}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: statusColor,
                    background: statusBg,
                    padding: '3px 9px',
                    borderRadius: 6,
                  }}
                >
                  {statusLabel}
                </span>
                <div
                  onClick={() => toggleUserActive(u.id)}
                  title="Активировать / деактивировать"
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 7,
                    cursor: 'pointer',
                    color: 'var(--text-faint)',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <circle cx="5" cy="12" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>
        Клик по роли — сменить · «⋯» — деактивировать/активировать. Наблюдатель
        и Гость имеют доступ только на просмотр.
      </div>

      {inviteOpen && <InvitePopup />}
    </div>
  );
}

function InvitePopup() {
  const inviteEmail = useBoard((s) => s.inviteEmail);
  const inviteRole = useBoard((s) => s.inviteRole);
  const setInviteEmail = useBoard((s) => s.setInviteEmail);
  const setInviteRole = useBoard((s) => s.setInviteRole);
  const sendInvite = useBoard((s) => s.sendInvite);
  const closeInvite = useBoard((s) => s.closeInvite);

  return (
    <>
      <div
        onClick={closeInvite}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 95,
          background: 'rgba(30,32,36,.34)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 96,
          width: 440,
          maxWidth: '92vw',
          background: 'var(--glass-hi)',
          backdropFilter: 'blur(34px) saturate(180%)',
          WebkitBackdropFilter: 'blur(34px) saturate(180%)',
          border: '1px solid var(--glass)',
          borderRadius: 18,
          boxShadow:
            '0 30px 70px var(--shadow-lg), inset 0 1px 0 var(--glass-hi)',
          padding: 24,
          animation: 'popIn .16s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: ACCENT,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-.3px',
            }}
          >
            Пригласить пользователя
          </h2>
          <div style={{ flex: 1 }} />
          <div
            onClick={closeInvite}
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              cursor: 'pointer',
              color: 'var(--text-faint)',
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-soft)',
            textTransform: 'uppercase',
            letterSpacing: '.4px',
            marginBottom: 7,
          }}
        >
          Email
        </div>
        <input
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="name@company.com"
          style={{
            width: '100%',
            height: 42,
            border: '1px solid var(--hover)',
            borderRadius: 11,
            background: 'var(--glass)',
            padding: '0 13px',
            fontSize: 14,
            outline: 'none',
            marginBottom: 18,
            color: 'var(--text)',
          }}
        />
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-soft)',
            textTransform: 'uppercase',
            letterSpacing: '.4px',
            marginBottom: 8,
          }}
        >
          Роль
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 7,
            marginBottom: 24,
          }}
        >
          {ROLES.map((r) => {
            const on = inviteRole === r;
            return (
              <div
                key={r}
                onClick={() => setInviteRole(r)}
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  borderRadius: 9,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: on ? ROLE_COLORS[r] : 'var(--glass)',
                  color: on ? '#fff' : 'var(--text-mut)',
                  border: `1px solid ${on ? ROLE_COLORS[r] : 'var(--hover)'}`,
                  transition: 'all .14s ease',
                }}
              >
                {r}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={closeInvite}
            style={{
              flex: 1,
              height: 40,
              border: '1px solid var(--hover)',
              background: 'transparent',
              color: 'var(--text-mut)',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
          <button
            onClick={() => sendInvite(inviteEmail, inviteRole)}
            style={{
              flex: 1.4,
              height: 40,
              border: 'none',
              background: ACCENT,
              color: '#fff',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Отправить приглашение
          </button>
        </div>
      </div>
    </>
  );
}
