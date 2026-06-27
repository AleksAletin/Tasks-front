// Task side-panel (brief §5.17, prototype ~1370 template + buildPanel ~2063).
// Slides in from the right when `panelId` is set. Fields at top are editable by
// opening the existing inline popovers (Popup.tsx) via `openPopup`; an Updates feed
// with Файлы / Активность tabs; footer actions. Read-only in viewer mode.
import { useEffect, useState } from 'react';
import { useBoard } from './store';
import {
  type Task,
  PRIO,
  SOURCE,
  STATUS,
  TODAY,
  TYPE,
  dayNum,
  fmt,
  personById,
} from './model';

const ACCENT = '#4263d8';

type FeedTab = 'updates' | 'files' | 'activity';

interface Update {
  init: string;
  color: string;
  name: string;
  ago: string;
  text: string;
}

export function TaskPanel() {
  const panelId = useBoard((s) => s.panelId);
  const groups = useBoard((s) => s.groups);
  const viewer = useBoard((s) => s.viewer);
  const closePanel = useBoard((s) => s.closePanel);
  const openPopup = useBoard((s) => s.openPopup);
  const [tab, setTab] = useState<FeedTab>('updates');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel]);

  if (!panelId) return null;
  let group = groups[0];
  let task: Task | undefined;
  for (const g of groups) {
    const found = g.tasks.find((t) => t.id === panelId);
    if (found) {
      task = found;
      group = g;
      break;
    }
  }
  if (!task) return null;
  const t = task;

  const st = STATUS[t.status];
  const pr = t.priority ? PRIO[t.priority] : null;
  const ty = TYPE[t.type];
  const so = SOURCE[t.source];
  const owner = personById(t.owner);
  const lastBy = personById(t.lastBy) ?? personById('p1')!;

  let dueLabel = 'Не задан';
  let dueColor = 'var(--text-faint)';
  if (t.due) {
    dueLabel = fmt(t.due) + (t.status === 'done' ? ' · закрыт' : '');
    dueColor = t.status === 'done' ? '#4a9b7f' : dayNum(t.due) < dayNum(TODAY) ? '#cf6b6b' : 'var(--text-3)';
  }
  const tlLabel = t.tl ? fmt(t.tl.start) + ' – ' + fmt(t.tl.end) : 'Не задана';

  const edit = (kind: string, field: string | undefined, e: React.MouseEvent) => {
    if (viewer) return;
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = r.left;
    const y = r.bottom + 5;
    const w = kind === 'date' ? 280 : 200;
    if (x + w > window.innerWidth - 10) x = window.innerWidth - 10 - w;
    openPopup({ kind, taskId: t.id, field, x, y });
  };

  const updates: Update[] = [
    {
      init: lastBy.initials,
      color: lastBy.color,
      name: lastBy.name,
      ago: t.lastAgo + ' назад',
      text: 'Обновил карточку: ' + (t.note || 'правки по задаче') + '.',
    },
    {
      init: 'АК',
      color: '#5b8def',
      name: 'Анна Котова',
      ago: 'вчера',
      text: 'Связала задачу с тикетом YT-' + (1240 + t.name.length) + ' в YouTrack.',
    },
  ];

  const fieldLabel = (text: string) => (
    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-faint)' }}>{text}</div>
  );
  const editable = !viewer;

  return (
    <>
      <div onClick={closePanel} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(30,32,36,.32)' }} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '94vw',
          zIndex: 70,
          background: 'var(--glass-hi)',
          backdropFilter: 'blur(34px) saturate(180%)',
          WebkitBackdropFilter: 'blur(34px) saturate(180%)',
          borderLeft: '1px solid var(--glass)',
          boxShadow: '-16px 0 54px var(--shadow), inset 1px 0 0 var(--glass)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn .22s ease',
        }}
      >
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--surf-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span className="noinv" style={{ width: 9, height: 9, borderRadius: 3, background: group.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)' }}>{group.name}</span>
            <div style={{ flex: 1 }} />
            <div
              onClick={closePanel}
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px', lineHeight: 1.25 }}>
            {t.name}
          </h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: '12px 12px',
              alignItems: 'center',
              background: 'var(--glass-soft)',
              border: '1px solid var(--glass)',
              borderRadius: 14,
              boxShadow: 'inset 0 1px 0 var(--glass)',
              padding: '16px 16px',
            }}
          >
            {fieldLabel('Статус')}
            <div
              onClick={(e) => edit('status', undefined, e)}
              className="noinv"
              style={{
                justifySelf: 'start',
                height: 30,
                padding: '0 16px',
                borderRadius: 8,
                background: st.bg,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 600,
                cursor: editable ? 'pointer' : 'default',
              }}
            >
              {st.label}
            </div>

            {fieldLabel('Владелец')}
            <div
              onClick={(e) => edit('people', undefined, e)}
              style={{
                justifySelf: 'start',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: editable ? 'pointer' : 'default',
                padding: '3px 8px 3px 3px',
                borderRadius: 20,
              }}
            >
              {owner ? (
                <>
                  <div
                    className="noinv"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: owner.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {owner.initials}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{owner.name}</span>
                </>
              ) : (
                <>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px dashed var(--line)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Назначить</span>
                </>
              )}
            </div>

            {fieldLabel('Приоритет')}
            <div
              onClick={(e) => edit('priority', undefined, e)}
              className={pr ? 'noinv' : undefined}
              style={{
                justifySelf: 'start',
                height: 30,
                padding: '0 16px',
                borderRadius: 8,
                background: pr ? pr.bg : 'var(--surf-1)',
                color: pr ? '#fff' : 'var(--text-faint)',
                display: 'flex',
                alignItems: 'center',
                fontSize: 13,
                fontWeight: 600,
                cursor: editable ? 'pointer' : 'default',
                boxShadow: pr ? 'none' : 'inset 0 0 0 1px var(--surf-2)',
              }}
            >
              {pr ? pr.label : 'Не задан'}
            </div>

            {fieldLabel('Срок')}
            <div
              onClick={(e) => edit('date', 'due', e)}
              style={{
                justifySelf: 'start',
                fontSize: 13,
                fontWeight: 600,
                color: dueColor,
                cursor: editable ? 'pointer' : 'default',
                padding: '5px 9px',
                borderRadius: 7,
              }}
            >
              {dueLabel}
            </div>

            {fieldLabel('Шкала времени')}
            <div
              style={{
                justifySelf: 'start',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-3)',
                padding: '5px 9px',
                borderRadius: 7,
              }}
            >
              {tlLabel}
            </div>

            {fieldLabel('Раздел')}
            <div onClick={(e) => edit('section', undefined, e)} style={{ justifySelf: 'start', cursor: editable ? 'pointer' : 'default' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mut)', background: 'var(--surf-1)', padding: '4px 11px', borderRadius: 6 }}>
                {t.section}
              </span>
            </div>

            {fieldLabel('Тип · Источник')}
            <div style={{ justifySelf: 'start', display: 'flex', gap: 6 }}>
              <span
                onClick={(e) => edit('type', undefined, e)}
                className="noinv"
                style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: ty.bg, padding: '4px 11px', borderRadius: 6, cursor: editable ? 'pointer' : 'default' }}
              >
                {ty.label}
              </span>
              <span
                onClick={(e) => edit('source', undefined, e)}
                className="noinv"
                style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: so.bg, padding: '4px 11px', borderRadius: 6, cursor: editable ? 'pointer' : 'default' }}
              >
                {so.label}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', gap: 18, borderBottom: '1px solid var(--surf-1)', marginBottom: 16 }}>
              {([
                ['updates', 'Обновления'],
                ['files', 'Файлы'],
                ['activity', 'Активность'],
              ] as [FeedTab, string][]).map(([key, label]) => {
                const active = tab === key;
                return (
                  <div
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      paddingBottom: 9,
                      fontSize: 13.5,
                      fontWeight: active ? 700 : 600,
                      color: active ? 'var(--text)' : 'var(--text-faint)',
                      borderBottom: `2.5px solid ${active ? ACCENT : 'transparent'}`,
                      marginBottom: -1,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {tab === 'updates' && (
              <>
                <div style={{ border: '1px solid var(--surf-1)', borderRadius: 11, padding: '11px 13px', marginBottom: 16 }}>
                  <input
                    placeholder="Написать обновление, @ — упомянуть…"
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '4px 0', background: 'transparent' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {updates.map((u, i) => (
                    <div key={i} style={{ display: 'flex', gap: 11 }}>
                      <div
                        className="noinv"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: u.color,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {u.init}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{u.name}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{u.ago}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.45 }}>{u.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'files' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Спецификация_миграции.pdf', '2.4 МБ'],
                  ['Маппинг_статусов.xlsx', '88 КБ'],
                ].map(([name, size]) => (
                  <div
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      border: '1px solid var(--surf-1)',
                      borderRadius: 11,
                      padding: '11px 13px',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{name}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{size}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  [lastBy.name + ' сменил статус', t.lastAgo + ' назад'],
                  ['Создана задача', '3 д назад'],
                ].map(([text, ago], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--line)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-3)' }}>{text}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{ago}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--surf-1)', display: 'flex', gap: 10 }}>
          <a
            href={'https://youtrack.work.app/issue/YT-' + (1240 + t.name.length)}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              height: 38,
              border: '1px solid var(--surf-2)',
              background: 'var(--card)',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 700,
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              textDecoration: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <path d="M15 3h6v6M10 14L21 3" />
            </svg>
            Открыть в YouTrack
          </a>
          <button
            onClick={closePanel}
            style={{
              height: 38,
              padding: '0 18px',
              border: 'none',
              background: '#4a9b7f',
              color: '#fff',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
