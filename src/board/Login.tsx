// Login screen — full-screen glass card on ambient gradient (brief §5.1, prototype ~1025).
import { useBoard } from './store';

const ACCENT = '#4263d8';

export function Login() {
  const loginEmail = useBoard((s) => s.loginEmail);
  const setLoginEmail = useBoard((s) => s.setLoginEmail);
  const login = useBoard((s) => s.login);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: `radial-gradient(820px 580px at 12% 8%, rgba(91,141,239,0.18), transparent 58%),
          radial-gradient(760px 560px at 88% 14%, rgba(139,111,214,0.16), transparent 55%),
          radial-gradient(720px 620px at 78% 94%, rgba(63,168,160,0.14), transparent 56%),
          var(--bg)`,
      }}
    >
      <div
        style={{
          width: 404,
          maxWidth: '92vw',
          background: 'var(--glass)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass)',
          borderRadius: 22,
          boxShadow:
            '0 40px 100px var(--shadow-lg), inset 0 1px 0 var(--glass-hi)',
          padding: '36px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 11,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 15,
              background: ACCENT,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 25,
              boxShadow:
                '0 10px 26px rgba(66,99,216,0.42), inset 0 1px 0 var(--glass-soft)',
            }}
          >
            W
          </div>
          <div
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.4px' }}
          >
            Work
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-soft)' }}>
            Войдите, чтобы продолжить переезд
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <input
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') login();
            }}
            placeholder="Рабочая почта"
            style={{
              height: 45,
              border: '1px solid var(--hover)',
              borderRadius: 12,
              background: 'var(--glass)',
              padding: '0 15px',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Пароль"
            onKeyDown={(e) => {
              if (e.key === 'Enter') login();
            }}
            style={{
              height: 45,
              border: '1px solid var(--hover)',
              borderRadius: 12,
              background: 'var(--glass)',
              padding: '0 15px',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={login}
            style={{
              height: 47,
              marginTop: 4,
              border: 'none',
              background: ACCENT,
              color: '#fff',
              borderRadius: 12,
              fontSize: 14.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(66,99,216,0.36)',
            }}
          >
            Войти
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '18px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--hover)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>или</span>
          <div style={{ flex: 1, height: 1, background: 'var(--hover)' }} />
        </div>
        <button
          onClick={login}
          style={{
            width: '100%',
            height: 45,
            border: '1px solid var(--hover)',
            background: 'var(--glass)',
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-mut)"
            strokeWidth="2"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          Войти через корпоративный SSO
        </button>
        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12.5,
            color: 'var(--text-faint)',
          }}
        >
          Нет доступа?{' '}
          <span style={{ color: ACCENT, fontWeight: 600, cursor: 'pointer' }}>
            Запросить у админа
          </span>
        </div>
      </div>
    </div>
  );
}
