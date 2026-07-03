// «Обращения» — штабной инбокс ОС: очередь с фильтрами по статусу + деталка с триажем.
// Исходы: ответ (тред + email автору), «в работу», отклонить, или таска на доске в разделе
// «Обращения» (бэкенд бампает версию доски — открытые вкладки смержатся, не затрут).
import { useEffect, useMemo, useState } from 'react';
import {
  listTickets,
  setTicketStatus,
  staffReply,
  ticketToTask,
  TICKET_CRIT_RU,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_RU,
  TICKET_TYPE_RU,
  type TicketStaffView,
} from '../api/feedback';
import { fetchBoard } from '../api/board';
import { useBoard } from '../board/store';

const CARD: React.CSSProperties = {
  background: 'var(--glass)',
  backdropFilter: 'blur(20px) saturate(165%)',
  WebkitBackdropFilter: 'blur(20px) saturate(165%)',
  border: '1px solid var(--glass)',
  boxShadow: 'inset 0 1px 0 var(--glass)',
  borderRadius: 14,
};

const STATUS_ORDER = ['new', 'in_progress', 'answered', 'task_created', 'rejected'] as const;

export function TicketsScreen() {
  const addToast = useBoard((s) => s.addToast);
  const [tickets, setTickets] = useState<TicketStaffView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [statusF, setStatusF] = useState<string>('все');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listTickets().then(
      (list) => {
        setTickets(list);
        setLoaded(true);
      },
      () => {
        setOffline(true);
        setLoaded(true);
      },
    );
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tickets) map[t.status] = (map[t.status] ?? 0) + 1;
    return map;
  }, [tickets]);

  const shown = tickets.filter((t) => statusF === 'все' || t.status === statusF);
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const patch = (updated: TicketStaffView) =>
    setTickets((list) => list.map((t) => (t.id === updated.id ? updated : t)));

  const act = async (fn: () => Promise<TicketStaffView>, toast: string) => {
    setBusy(true);
    try {
      patch(await fn());
      addToast(toast);
    } catch {
      addToast('Не получилось — попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = () =>
    act(async () => {
      const updated = await staffReply(selected!.id, reply.trim());
      setReply('');
      return updated;
    }, 'Ответ отправлен автору');

  const toTask = () =>
    act(async () => {
      const updated = await ticketToTask(selected!.id);
      // Таска уже на сервере — подтягиваем доску, чтобы «Обращения» появились сразу.
      try {
        useBoard.getState().hydrateBoard(await fetchBoard());
      } catch {
        // доска догонится обычным путём
      }
      return updated;
    }, 'Таска создана в разделе «Обращения»');

  if (!loaded) {
    return <Shell><div style={{ color: 'var(--text-faint)', fontSize: 13 }}>Загружаю…</div></Shell>;
  }
  if (offline) {
    return (
      <Shell>
        <div style={{ ...CARD, padding: 20, fontSize: 13, color: 'var(--text-soft)' }}>
          Бэкенд недоступен — обращения живут на сервере (standalone-режим их не показывает).
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      formLink={
        <button
          style={{
            padding: '7px 14px',
            borderRadius: 9,
            border: '1px solid var(--surf-2)',
            background: 'transparent',
            color: '#4263d8',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onClick={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}/feedback`);
            addToast('Ссылка на форму скопирована — раздайте её людям');
          }}
        >
          Скопировать ссылку на форму
        </button>
      }
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['все', ...STATUS_ORDER] as const).map((s) => {
          const active = statusF === s;
          const count = s === 'все' ? tickets.length : (counts[s] ?? 0);
          return (
            <button
              key={s}
              onClick={() => setStatusF(s)}
              style={{
                padding: '5px 12px',
                borderRadius: 9,
                border: '1px solid ' + (active ? '#4263d8' : 'var(--surf-2)'),
                background: active ? 'var(--blue-tint)' : 'transparent',
                color: active ? '#4263d8' : 'var(--text-soft)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {s === 'все' ? 'все' : TICKET_STATUS_RU[s]} · {count}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
        {/* очередь */}
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
            {shown.length === 0 && (
              <div style={{ padding: 18, fontSize: 12.5, color: 'var(--text-faint)' }}>
                Пусто. Раздайте ссылку на форму — обращения появятся здесь.
              </div>
            )}
            {shown.map((t) => {
              const c = TICKET_STATUS_COLOR[t.status] ?? '#8a8f98';
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--surf-1)',
                    cursor: 'pointer',
                    background: t.id === selectedId ? 'var(--blue-tint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 12.5 }}>{t.number}</span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: 7,
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: c,
                        background: c + '22',
                      }}
                    >
                      {TICKET_STATUS_RU[t.status] ?? t.status}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-faint)' }}>
                      {new Date(t.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-2)',
                      margin: '4px 0 2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.text}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {t.authorName}
                    {t.authorRole ? ` · ${t.authorRole}` : ''} · {TICKET_TYPE_RU[t.type] ?? t.type}
                    {t.moduleName ? ` · ${t.moduleName.slice(0, 30)}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* деталка */}
        {selected ? (
          <div style={{ ...CARD, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{selected.number}</span>
              <StatusPill status={selected.status} />
              <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                {TICKET_TYPE_RU[selected.type] ?? selected.type} · критичность{' '}
                {TICKET_CRIT_RU[selected.criticality] ?? selected.criticality}
              </span>
              <button
                style={{ marginLeft: 'auto', ...ghostBtn }}
                onClick={() => {
                  const link = `${window.location.origin}/feedback/t/${selected.id}?token=${selected.token}`;
                  void navigator.clipboard?.writeText(link);
                  addToast('Персональная ссылка автора скопирована');
                }}
              >
                ссылка автора
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', margin: '6px 0 10px' }}>
              {selected.authorName}
              {selected.authorRole ? ` · ${selected.authorRole}` : ''}
              {selected.authorEmail ? ` · ${selected.authorEmail}` : ' · без почты (только ссылка)'}
              {selected.section ? ` · ${selected.section}` : ''}
              {selected.moduleName ? ` · модуль: ${selected.moduleName}` : ''}
            </div>
            <div
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--bg)',
                border: '1px solid var(--surf-1)',
              }}
            >
              {selected.text}
            </div>

            {selected.replies.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {selected.replies.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 8,
                      padding: '8px 11px',
                      borderRadius: 9,
                      background: r.by === 'staff' ? 'var(--blue-tint)' : 'var(--bg)',
                      border: '1px solid var(--surf-1)',
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: r.by === 'staff' ? '#4263d8' : 'var(--text-faint)', marginBottom: 2 }}>
                      {r.by === 'staff' ? 'Команда' : 'Автор'} ·{' '}
                      {new Date(r.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.text}</div>
                  </div>
                ))}
              </div>
            )}

            <textarea
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: 12,
                minHeight: 74,
                resize: 'vertical',
                fontSize: 13,
                padding: '9px 11px',
                borderRadius: 9,
                border: '1px solid var(--surf-2)',
                background: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
              }}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Ответ автору (уйдёт в тред и на почту, статус станет «отвечено»)…"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button style={primaryBtn} disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                Ответить
              </button>
              {selected.boardTaskId ? (
                <span style={{ ...ghostBtn, cursor: 'default', color: '#8a63d8', borderColor: '#8a63d855' }}>
                  таска: {selected.boardTaskId} · раздел «Обращения»
                </span>
              ) : (
                <button style={ghostBtn} disabled={busy} onClick={() => void toTask()}>
                  Создать таску
                </button>
              )}
              {selected.status !== 'in_progress' && (
                <button
                  style={ghostBtn}
                  disabled={busy}
                  onClick={() => void act(() => setTicketStatus(selected.id, 'in_progress'), 'Взято в работу')}
                >
                  В работу
                </button>
              )}
              {selected.status !== 'rejected' && (
                <button
                  style={{ ...ghostBtn, color: '#cf6b6b', borderColor: '#cf6b6b44' }}
                  disabled={busy}
                  onClick={() => void act(() => setTicketStatus(selected.id, 'rejected'), 'Отклонено')}
                >
                  Отклонить
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ ...CARD, padding: 24, fontSize: 13, color: 'var(--text-faint)' }}>
            Выберите обращение слева.
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, formLink }: { children: React.ReactNode; formLink?: React.ReactNode }) {
  return (
    <div style={{ padding: '22px 26px 60px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-.3px' }}>Обращения</div>
        {formLink}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 18 }}>
        Форма по общей ссылке → тикет → ответ автору или таска на доске (раздел «Обращения»).
      </div>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = TICKET_STATUS_COLOR[status] ?? '#8a8f98';
  return (
    <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: c, background: c + '22' }}>
      {TICKET_STATUS_RU[status] ?? status}
    </span>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 9,
  border: 'none',
  background: '#4263d8',
  color: '#fff',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 9,
  border: '1px solid var(--surf-2)',
  background: 'transparent',
  color: 'var(--text-soft)',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};
