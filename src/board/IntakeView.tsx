// Вкладка «Новые задачи» (инбокс интейка, ТЗ v2 §3): всё, что синк не смог привязать
// каскадом — группы «📥 Разобрать» и легаси «Из YouTrack» на любой доске. Каждую задачу
// разбирают в один клик: «⤷ В эпик/модуль…» (подзадачей выбранного родителя) или
// «→ В бэклог» (линейно в хвост доски «Бэклог»). Плюс ручной пинок синка.
import { useState } from 'react';
import { fetchBoard } from '../api/board';
import { syncNow } from '../api/youtrack';
import { intakeTasks } from './derive';
import { findLabel, personById } from './model';
import { useBoard } from './store';

const ACCENT = '#4263d8';

export function IntakeView() {
  const groups = useBoard((s) => s.groups);
  const viewer = useBoard((s) => s.viewer);
  const labels = useBoard((s) => s.labels);
  const openPopup = useBoard((s) => s.openPopup);
  const openPanel = useBoard((s) => s.openPanel);
  const sendToBacklog = useBoard((s) => s.sendToBacklog);
  const hydrateBoard = useBoard((s) => s.hydrateBoard);
  const addToast = useBoard((s) => s.addToast);
  const [busy, setBusy] = useState(false);

  const rows = intakeTasks(groups);

  const checkNow = async () => {
    setBusy(true);
    try {
      const r = await syncNow();
      if (r.disabled) {
        addToast('Синк выключен в настройках — включите интеграцию YouTrack');
      } else {
        const fresh = await fetchBoard();
        hydrateBoard(fresh);
        addToast(`Проверено: ${r.checked} · обновлено ${r.updated} · новых ${r.created}`);
      }
    } catch {
      addToast('Не удалось дёрнуть синк — бэкенд недоступен?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '22px 26px 40px', maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Новые задачи</div>
        {rows.length > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
              background: '#d9812f',
              borderRadius: 9,
              padding: '2px 9px',
            }}
          >
            {rows.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => void checkNow()}
          disabled={busy}
          style={{
            height: 30,
            padding: '0 13px',
            border: 'none',
            borderRadius: 8,
            background: busy ? 'var(--surf-2)' : ACCENT,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? '…' : 'Проверить YouTrack'}
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16, lineHeight: 1.5 }}>
        Сюда падает всё новое из YouTrack, что каскад не привязал сам (поле «Эпик» → id модуля в
        заголовке → название отчёта). Разберите: подзадачей к эпику/модулю — или линейно в бэклог.
      </div>

      {rows.length === 0 && (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 13,
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          Пусто — интейк чист. Новые непривязанные задачи появятся здесь после очередного синка.
        </div>
      )}

      {rows.length > 0 && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--surf-1)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {rows.map(({ task: t, groupName }) => {
            const st = findLabel(labels.status, t.status);
            const owner = personById(t.owner);
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--surf-1)',
                  minWidth: 0,
                }}
              >
                {t.ticketId && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10.5,
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: ACCENT,
                      background: 'var(--surf-1)',
                      padding: '2px 7px',
                      borderRadius: 9,
                    }}
                  >
                    {t.ticketId}
                  </span>
                )}
                <span
                  onClick={() => openPanel(t.id)}
                  title="Открыть задачу"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                >
                  {t.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', flexShrink: 0 }}>
                  {groupName}
                </span>
                <div style={{ flex: 1 }} />
                <span
                  style={{
                    flexShrink: 0,
                    padding: '3px 10px',
                    borderRadius: 8,
                    background: st.bg,
                    color: '#fff',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {st.label}
                </span>
                {owner && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-soft)', flexShrink: 0 }}>
                    {owner.name}
                  </span>
                )}
                {!viewer && (
                  <>
                    <button
                      onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        let x = r.left;
                        if (x + 320 > window.innerWidth - 10) x = window.innerWidth - 330;
                        openPopup({ kind: 'attach', taskId: t.id, x, y: r.bottom + 5 });
                      }}
                      style={{
                        flexShrink: 0,
                        height: 27,
                        padding: '0 11px',
                        border: `1px solid ${ACCENT}44`,
                        borderRadius: 7,
                        background: 'rgba(66,99,216,0.07)',
                        color: ACCENT,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⤷ В эпик/модуль…
                    </button>
                    <button
                      onClick={() => sendToBacklog(t.id)}
                      style={{
                        flexShrink: 0,
                        height: 27,
                        padding: '0 11px',
                        border: '1px solid var(--surf-2)',
                        borderRadius: 7,
                        background: 'var(--card)',
                        color: 'var(--text-3)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      → В бэклог
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
