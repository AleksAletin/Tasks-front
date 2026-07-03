// Публичная сторона обращений (ОС) — SPA-ветка БЕЗ логина, живёт на /feedback:
//   /feedback            — форма по общей ссылке (раздел + модуль + текст);
//   /feedback/t/{id}?token= — персональная страница тикета (статус + тред + ответ автора).
// Стили — те же токены theme.css, что и у основного приложения.
import { useEffect, useMemo, useState } from 'react';
import '../board/theme.css';
import {
  authorReply,
  createFeedback,
  fetchFormMeta,
  trackFeedback,
  TICKET_CRIT_RU,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_RU,
  TICKET_TYPE_RU,
  type FeedbackCreated,
  type FeedbackFormMeta,
  type FeedbackPublicView,
} from '../api/feedback';

export function FeedbackApp() {
  const trackMatch = window.location.pathname.match(/^\/feedback\/t\/(\d+)/);
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-2)',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '40px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Header />
        {trackMatch ? <TrackPage id={Number(trackMatch[1])} /> : <FormPage />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: '#4263d8',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 15,
        }}
      >
        W
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Обратная связь по переезду</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          вопрос · проблема · доработка — ответим или заведём задачу
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--scrim)',
  borderRadius: 14,
  padding: 20,
};

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-soft)',
  marginBottom: 5,
};

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: 13.5,
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid var(--scrim)',
  background: 'var(--bg)',
  color: 'var(--text)',
  outline: 'none',
};

function FormPage() {
  const [meta, setMeta] = useState<FeedbackFormMeta>({ sections: [], modules: [], roles: [] });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [section, setSection] = useState('');
  const [moduleQuery, setModuleQuery] = useState('');
  const [moduleId, setModuleId] = useState<number | null>(null);
  const [type, setType] = useState<'question' | 'problem' | 'change'>('question');
  const [crit, setCrit] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<FeedbackCreated | null>(null);

  useEffect(() => {
    fetchFormMeta().then(setMeta, () => {});
  }, []);

  const moduleMatches = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return meta.modules
      .filter((m) => m.name.toLowerCase().includes(q) || String(m.id) === q)
      .slice(0, 8);
  }, [meta.modules, moduleQuery]);
  const selectedModule = meta.modules.find((m) => m.id === moduleId) ?? null;

  const submit = async () => {
    setError(null);
    if (!name.trim() || !text.trim()) {
      setError('Заполните имя и текст обращения.');
      return;
    }
    setBusy(true);
    try {
      const created = await createFeedback({
        authorName: name.trim(),
        authorEmail: email.trim(),
        authorRole: role,
        section,
        moduleId,
        type,
        criticality: crit,
        text: text.trim(),
        baseUrl: window.location.origin,
      });
      setDone(created);
    } catch {
      setError('Не удалось отправить — попробуйте ещё раз или напишите координатору.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const link = `${window.location.origin}/feedback/t/${done.id}?token=${done.token}`;
    return (
      <div style={card}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#4a9b7f', marginBottom: 8 }}>
          ✓ Обращение {done.number} принято
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
          Сохраните персональную ссылку — по ней виден статус и ответы
          {email.trim() ? ', плюс продублируем на почту' : ''}:
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--bg)',
            border: '1px solid var(--scrim)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {link}
          </span>
          <button
            style={btnPrimary}
            onClick={() => {
              void navigator.clipboard?.writeText(link);
            }}
          >
            Копировать
          </button>
        </div>
        <a
          href={link}
          style={{ display: 'inline-block', marginTop: 14, fontSize: 13, color: '#4263d8', fontWeight: 700 }}
        >
          Открыть страницу обращения →
        </a>
      </div>
    );
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={label}>Ваше имя *</div>
          <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Иванов" />
        </div>
        <div>
          <div style={label}>Email (для уведомлений)</div>
          <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="i.ivanov@…" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={label}>Ваша роль</div>
          <select style={input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">— не выбрана —</option>
            {meta.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={label}>Раздел</div>
          <select style={input} value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">— не выбран —</option>
            {meta.sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div style={label}>Модуль / отчёт (поиск по названию)</div>
        {selectedModule ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 11px',
              borderRadius: 8,
              border: '1px solid #4263d855',
              background: 'var(--blue-tint)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1 }}>
              {selectedModule.id} · {selectedModule.name}
            </span>
            <button
              style={{ ...btnGhost, padding: '2px 10px' }}
              onClick={() => {
                setModuleId(null);
                setModuleQuery('');
              }}
            >
              сбросить
            </button>
          </div>
        ) : (
          <>
            <input
              style={input}
              value={moduleQuery}
              onChange={(e) => setModuleQuery(e.target.value)}
              placeholder="например: карточка игрока"
            />
            {moduleMatches.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--scrim)',
                  borderRadius: 8,
                  marginTop: 4,
                  overflow: 'hidden',
                }}
              >
                {moduleMatches.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setModuleId(m.id)}
                    style={{ padding: '7px 11px', fontSize: 12.5, cursor: 'pointer' }}
                  >
                    <span style={{ color: 'var(--text-faint)' }}>{m.id} · </span>
                    {m.name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={label}>Тип обращения</div>
          <select style={input} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="question">Вопрос</option>
            <option value="problem">Проблема</option>
            <option value="change">Доработка</option>
          </select>
        </div>
        <div>
          <div style={label}>Критичность</div>
          <select style={input} value={crit} onChange={(e) => setCrit(e.target.value as typeof crit)}>
            <option value="low">Низкая</option>
            <option value="normal">Обычная</option>
            <option value="high">Высокая</option>
            <option value="critical">Критичная</option>
          </select>
        </div>
      </div>

      <div>
        <div style={label}>Опишите вопрос / проблему / что доработать *</div>
        <textarea
          style={{ ...input, minHeight: 120, resize: 'vertical' }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Что делали, что ожидали, что получилось…"
        />
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#cf6b6b', fontWeight: 700 }}>⛔ {error}</div>}

      <button style={{ ...btnPrimary, padding: '11px 18px' }} disabled={busy} onClick={() => void submit()}>
        {busy ? 'Отправляю…' : 'Отправить обращение'}
      </button>
    </div>
  );
}

function TrackPage({ id }: { id: number }) {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [view, setView] = useState<FeedbackPublicView | null>(null);
  const [failed, setFailed] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    trackFeedback(id, token).then(setView, () => setFailed(true));
  };
  useEffect(load, [id, token]);

  if (failed) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 800, color: '#cf6b6b', marginBottom: 6 }}>Обращение не найдено</div>
        <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
          Проверьте ссылку — она персональная и содержит токен доступа.
        </div>
      </div>
    );
  }
  if (!view) {
    return <div style={{ ...card, color: 'var(--text-faint)', fontSize: 13 }}>Загружаю…</div>;
  }

  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await authorReply(id, token, reply.trim());
      setReply('');
      load();
    } finally {
      setBusy(false);
    }
  };

  const statusColor = TICKET_STATUS_COLOR[view.status] ?? '#8a8f98';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{view.number}</span>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 800,
              color: statusColor,
              background: statusColor + '22',
            }}
          >
            {TICKET_STATUS_RU[view.status] ?? view.status}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {TICKET_TYPE_RU[view.type] ?? view.type} · критичность {TICKET_CRIT_RU[view.criticality] ?? view.criticality}
          </span>
        </div>
        {(view.section || view.moduleName) && (
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginBottom: 8 }}>
            {[view.section, view.moduleName].filter(Boolean).join(' · ')}
          </div>
        )}
        <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{view.text}</div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 10 }}>
          Переписка
        </div>
        {view.replies.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Ответов пока нет — команда видит обращение.</div>
        )}
        {view.replies.map((r, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: '9px 12px',
              borderRadius: 10,
              background: r.by === 'staff' ? 'var(--blue-tint)' : 'var(--bg)',
              border: '1px solid var(--scrim)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: r.by === 'staff' ? '#4263d8' : 'var(--text-faint)', marginBottom: 3 }}>
              {r.by === 'staff' ? 'Команда переезда' : 'Вы'} ·{' '}
              {new Date(r.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.text}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            style={{ ...input, flex: 1 }}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send();
            }}
            placeholder="Дописать к обращению…"
          />
          <button style={btnPrimary} disabled={busy || !reply.trim()} onClick={() => void send()}>
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#4263d8',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--scrim)',
  background: 'transparent',
  color: 'var(--text-soft)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};
