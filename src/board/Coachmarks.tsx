// Onboarding coachmarks (brief §5.21, prototype ~1090 template). Steps through the
// COACH array as positioned glass tooltips (title/body, step counter, Пропустить /
// Далее·Готово) over a dim backdrop. Shown once per browser via localStorage
// ('work_coached'); the "?" hotkey and the ⌘K "Подсказки" item can reopen it.
import { useBoard } from './store';
import { COACH } from './model';

const ACCENT = '#4263d8';

export function Coachmarks() {
  const coachOpen = useBoard((s) => s.coachOpen);
  const coachStep = useBoard((s) => s.coachStep);
  const coachNext = useBoard((s) => s.coachNext);
  const coachSkip = useBoard((s) => s.coachSkip);

  if (!coachOpen) return null;
  const data = COACH[coachStep];
  if (!data) return null;
  const last = coachStep === COACH.length - 1;

  return (
    <>
      <div onClick={coachSkip} style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(20,22,28,0.5)' }} />
      <div
        style={{
          position: 'fixed',
          zIndex: 151,
          left: data.x,
          top: data.y,
          right: data.right,
          width: 320,
          maxWidth: '90vw',
          background: 'rgba(252,252,254,0.82)',
          backdropFilter: 'blur(34px) saturate(185%)',
          WebkitBackdropFilter: 'blur(34px) saturate(185%)',
          border: '1px solid rgba(255,255,255,0.65)',
          borderRadius: 16,
          boxShadow: '0 30px 70px rgba(30,40,80,0.34), inset 0 1px 0 rgba(255,255,255,0.75)',
          padding: 18,
          animation: 'popIn .18s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <div
            className="noinv"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: ACCENT,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {coachStep + 1}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.2px' }}>{data.title}</div>
        </div>
        <div style={{ fontSize: 13, color: '#5b5f66', lineHeight: 1.5, marginBottom: 15 }}>{data.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#9a9da2' }}>
            {coachStep + 1} / {COACH.length}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={coachSkip}
            style={{
              height: 32,
              padding: '0 12px',
              border: 'none',
              background: 'transparent',
              color: '#797d84',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Пропустить
          </button>
          <button
            onClick={coachNext}
            className="noinv"
            style={{
              height: 32,
              padding: '0 16px',
              border: 'none',
              background: ACCENT,
              color: '#fff',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {last ? 'Готово' : 'Далее'}
          </button>
        </div>
      </div>
    </>
  );
}
