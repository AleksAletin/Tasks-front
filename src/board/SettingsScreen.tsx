// Settings screen (brief §5.12, prototype ~862 + buildSettings ~1647) — admin full-page section.
// Five sections switch on settingsTab; section nav lives in the main sidebar.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useBoard } from './store';
import { ROLES, ROLE_COLORS, type Cfg, type LabelField } from './model';
import { getSyncState, syncNow, testYouTrack } from '../api/youtrack';
import { fetchBoard } from '../api/board';

// Board field ↔ label-registry field, for the mapping editor's target dropdown.
const MAP_FIELDS = ['Статус', 'Приоритет', 'Тип', 'Источник'] as const;
const fieldToLabelField = (field: string): LabelField =>
  field === 'Приоритет'
    ? 'priority'
    : field === 'Тип'
      ? 'type'
      : field === 'Источник'
        ? 'source'
        : 'status';

const ACCENT = '#4263d8';

const cardStyle = {
  background: 'var(--glass)',
  border: '1px solid var(--glass)',
  borderRadius: 16,
  boxShadow: 'inset 0 1px 0 var(--glass)',
  padding: 22,
} as const;

const inputStyle = {
  width: '100%',
  height: 40,
  border: '1px solid var(--scrim)',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 13.5,
  outline: 'none',
  background: 'var(--card)',
  color: 'var(--text)',
} as const;

const monoInput = {
  ...inputStyle,
  fontFamily: "'JetBrains Mono', monospace",
} as const;

const fieldLabel = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-mut)',
  marginBottom: 6,
} as const;

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: on ? '#4a9b7f' : 'var(--scrim)',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--card)',
          boxShadow: '0 1px 3px var(--scrim)',
          transition: 'left .16s ease',
        }}
      />
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  on,
  onClick,
  style,
}: {
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        background: 'var(--glass)',
        border: '1px solid var(--glass)',
        borderRadius: 13,
        boxShadow: 'inset 0 1px 0 var(--glass)',
        ...style,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>{desc}</div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

function Field({
  label,
  cfgKey,
  type,
  placeholder,
  mono,
  flex,
}: {
  label: string;
  cfgKey: keyof Cfg;
  type?: string;
  placeholder?: string;
  mono?: boolean;
  flex?: number;
}) {
  const value = useBoard((s) => s.cfg[cfgKey]);
  const setCfg = useBoard((s) => s.setCfg);
  return (
    <div style={{ flex }}>
      <div style={fieldLabel}>{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setCfg({ [cfgKey]: e.target.value })}
        style={mono ? monoInput : inputStyle}
      />
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2
        style={{
          margin: '0 0 5px',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-.4px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: '0 0 24px',
          fontSize: 13.5,
          color: 'var(--text-soft)',
        }}
      >
        {sub}
      </p>
    </>
  );
}

function Integrations() {
  const ytrack = useBoard((s) => s.integrations.ytrack);
  const email = useBoard((s) => s.integrations.email);
  const setIntegration = useBoard((s) => s.setIntegration);
  const interval = useBoard((s) => s.cfg.syncInterval);
  const webhook = useBoard((s) => s.cfg.webhookUrl);
  const setCfg = useBoard((s) => s.setCfg);
  const addToast = useBoard((s) => s.addToast);
  const [busy, setBusy] = useState(false);

  // «Проверить соединение» → POST /sync/test (probes the configured YouTrack instance).
  const runTest = async () => {
    setBusy(true);
    try {
      const ok = await testYouTrack();
      addToast(
        ok ? 'YouTrack: соединение установлено' : 'YouTrack: подключиться не удалось',
      );
    } catch {
      addToast('YouTrack: ошибка запроса');
    } finally {
      setBusy(false);
    }
  };

  // «Синхронизировать сейчас» → POST /sync; surfaces checked/updated + any unmapped statuses.
  const runSync = async () => {
    setBusy(true);
    try {
      const r = await syncNow();
      if (r.disabled) {
        addToast('Интеграция YouTrack выключена — синк пропущен');
        return;
      }
      // The sync mutated the board server-side (statuses + discovered tasks). Refresh the local
      // snapshot right away — otherwise the new tasks stay invisible until reload AND this tab's
      // next autosave would push the stale board back, erasing them.
      try {
        useBoard.getState().hydrateBoard(await fetchBoard());
      } catch {
        // non-fatal: the sync itself succeeded
      }
      let msg = `Синк: +${r.created ?? 0} новых, обновлено ${r.updated} из ${r.checked}`;
      if (r.unmapped.length) msg += `; без правила: ${r.unmapped.join(', ')}`;
      if (r.warning) msg += `; ⚠ ${r.warning}`;
      addToast(msg);
    } catch {
      addToast('Синк: ошибка запроса');
    } finally {
      setBusy(false);
    }
  };

  const badge = ytrack ? 'Подключено' : 'Отключено';
  const badgeColor = ytrack ? '#3a7d63' : 'var(--text-faint)';
  const badgeBg = ytrack ? 'var(--green-tint)' : 'var(--surf-1)';

  return (
    <>
      <SectionHead
        title="Интеграции"
        sub="Подключение внешних систем. Источник правды один — статусы и проценты тянутся оттуда."
      />

      <div style={{ ...cardStyle, marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#1f8a5b',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            YT
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>YouTrack</div>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: badgeColor,
                background: badgeBg,
                padding: '2px 9px',
                borderRadius: 6,
              }}
            >
              {badge}
            </span>
          </div>
          <Toggle
            on={ytrack}
            onClick={() => setIntegration('ytrack', !ytrack)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <Field
            label="Base URL инстанса"
            cfgKey="ytrackUrl"
            placeholder="https://youtrack.company.com"
            mono
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Field
              label="Permanent token (API)"
              cfgKey="ytrackToken"
              type="password"
              mono
              flex={2}
            />
            <Field label="Проект" cfgKey="ytrackProject" flex={1} />
          </div>
          <div>
            <Field
              label="Запрос синка — что тянуть из YouTrack"
              cfgKey="ytrackQuery"
              placeholder="project: XRM #Unresolved"
              mono
            />
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-faint)',
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              Новые issue из запроса появляются на доске в группе «Из YouTrack»,
              статусы — по правилам маппинга. Спринт: «Board XRM: {'{спринт}'}».
              Пусто → берётся «project: {'{проект}'}».
            </div>
          </div>
          <div>
            <div style={fieldLabel}>Webhook URL (входящий)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={webhook}
                onChange={(e) => setCfg({ webhookUrl: e.target.value })}
                style={{ ...monoInput, flex: 1, fontSize: 13 }}
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(webhook).then(
                    () => addToast('Webhook URL скопирован'),
                    () => addToast('Не удалось скопировать'),
                  );
                }}
                style={{
                  height: 40,
                  padding: '0 14px',
                  border: '1px solid var(--scrim)',
                  background: 'var(--glass-hi)',
                  borderRadius: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-mut)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Скопировать
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div>
              <div style={fieldLabel}>Интервал синка</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={interval}
                  onChange={(e) => setCfg({ syncInterval: e.target.value })}
                  inputMode="numeric"
                  style={{ ...inputStyle, width: 70, textAlign: 'center' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                  минут
                </span>
              </div>
            </div>
            <button
              onClick={runTest}
              disabled={busy}
              style={{
                height: 40,
                padding: '0 16px',
                border: 'none',
                background: 'rgba(66,99,216,0.1)',
                color: ACCENT,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Проверить соединение
            </button>
            <button
              onClick={runSync}
              disabled={busy}
              style={{
                height: 40,
                padding: '0 16px',
                border: 'none',
                background: ACCENT,
                color: '#fff',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Синхронизировать сейчас
            </button>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#5b8def',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              Email-уведомления
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              SMTP для дайджестов и алертов
            </div>
          </div>
          <Toggle on={email} onClick={() => setIntegration('email', !email)} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <Field label="SMTP-хост" cfgKey="smtpHost" mono flex={2} />
          <div style={{ flex: 1 }}>
            <div style={fieldLabel}>Порт</div>
            <PortInput />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Адрес отправителя" cfgKey="fromEmail" mono flex={2} />
          <Field
            label="Время дайджеста"
            cfgKey="digestTime"
            type="time"
            flex={1}
          />
        </div>
      </div>
    </>
  );
}

function PortInput() {
  const port = useBoard((s) => s.cfg.smtpPort);
  const setCfg = useBoard((s) => s.setCfg);
  return (
    <input
      value={port}
      onChange={(e) => setCfg({ smtpPort: e.target.value })}
      inputMode="numeric"
      style={{ ...inputStyle, textAlign: 'center' }}
    />
  );
}

function Sync() {
  const autoSync = useBoard((s) => s.autoSync);
  const twoWay = useBoard((s) => s.twoWay);
  const setFlag = useBoard((s) => s.setFlag);
  return (
    <>
      <SectionHead
        title="Синхронизация"
        sub="Как данные движутся между доской и источником правды."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ToggleRow
          title="Авто-синхронизация"
          desc="Подтягивать обновления по расписанию"
          on={autoSync}
          onClick={() => setFlag('autoSync', !autoSync)}
        />
        <ToggleRow
          title="Двусторонний поток"
          desc="Правки на доске уходят обратно в YouTrack"
          on={twoWay}
          onClick={() => setFlag('twoWay', !twoWay)}
        />
        <div
          style={{
            marginTop: 8,
            padding: '16px 18px',
            background: 'rgba(66,99,216,0.06)',
            border: '1px solid rgba(66,99,216,0.16)',
            borderRadius: 13,
            fontSize: 13,
            color: 'var(--text-mut)',
            lineHeight: 1.5,
          }}
        >
          <b style={{ color: 'var(--text-3)' }}>Текущий статус:</b> последняя
          успешная синхронизация — 2 минуты назад · 0 конфликтов · 1 247 тикетов
          в проекте.
        </div>
      </div>
    </>
  );
}

function Mapping() {
  const mappingRules = useBoard((s) => s.mappingRules);
  const addMappingRule = useBoard((s) => s.addMappingRule);
  const editMappingRule = useBoard((s) => s.editMappingRule);
  const removeMappingRule = useBoard((s) => s.removeMappingRule);
  const labels = useBoard((s) => s.labels);
  const addToast = useBoard((s) => s.addToast);

  // YouTrack statuses the last sync saw that no rule covers — persisted server-side, so they
  // survive the sync toast. Silently absent in standalone (no backend) mode.
  const [unmapped, setUnmapped] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    getSyncState().then(
      (s) => {
        if (!cancelled) setUnmapped(s.unmapped);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // «+ правило» next to an unmapped status: create a rule prefilled with that status as the
  // condition — the user only picks the target board status.
  const addRuleFor = (status: string) => {
    addMappingRule();
    const rules = useBoard.getState().mappingRules;
    const last = rules[rules.length - 1];
    if (last) {
      editMappingRule(last.id, { field: 'Статус', cond: status });
    }
    setUnmapped((u) => u.filter((s) => s !== status));
    addToast(`Правило для «${status}» добавлено — выберите статус доски`);
  };
  const grid = '1.1fr 1.3fr 1.6fr 1.2fr 40px';
  const inp: CSSProperties = {
    width: '100%',
    border: '1px solid var(--scrim)',
    borderRadius: 7,
    padding: '6px 9px',
    fontSize: 12.5,
    background: 'var(--card)',
    color: 'var(--text)',
    outline: 'none',
    boxSizing: 'border-box',
  };
  return (
    <>
      <SectionHead
        title="Правила маппинга"
        sub="«Если значение из источника = …, поставить статус доски …». Применяется к импорту и синку YouTrack."
      />
      {unmapped.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid #d9a44155',
            background: '#d9a44114',
            fontSize: 12.5,
          }}
        >
          <span style={{ fontWeight: 700, color: '#b8862f' }}>
            ⚠ Статусы YouTrack без правила:
          </span>
          {unmapped.map((s) => (
            <button
              key={s}
              onClick={() => addRuleFor(s)}
              title="Добавить правило с этим статусом"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 8,
                border: '1px solid #d9a44166',
                background: 'var(--card)',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s}
              <span style={{ fontWeight: 800, color: '#b8862f' }}>+</span>
            </button>
          ))}
        </div>
      )}
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 var(--glass)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            padding: '11px 16px',
            borderBottom: '1px solid var(--hover)',
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-soft)',
          }}
        >
          <div>Поле доски</div>
          <div>Источник</div>
          <div>Условие</div>
          <div>Значение</div>
          <div />
        </div>
        {mappingRules.map((r) => {
          const lf = fieldToLabelField(r.field);
          const opts = labels[lf];
          return (
            <div
              key={r.id}
              style={{
                display: 'grid',
                gridTemplateColumns: grid,
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderBottom: '1px solid var(--hover)',
                fontSize: 13,
              }}
            >
              <select
                value={r.field}
                onChange={(e) => editMappingRule(r.id, { field: e.target.value })}
                style={inp}
              >
                {MAP_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                {!(MAP_FIELDS as readonly string[]).includes(r.field) && (
                  <option value={r.field}>{r.field}</option>
                )}
              </select>
              <input
                value={r.src}
                onChange={(e) => editMappingRule(r.id, { src: e.target.value })}
                placeholder="поле источника"
                style={inp}
              />
              <input
                value={r.cond}
                onChange={(e) => editMappingRule(r.id, { cond: e.target.value })}
                placeholder="значения через запятую"
                style={{ ...inp, fontFamily: "'JetBrains Mono', monospace" }}
              />
              <select
                value={r.to}
                onChange={(e) => {
                  const opt = opts.find((l) => l.label === e.target.value);
                  editMappingRule(r.id, {
                    to: e.target.value,
                    color: opt ? opt.bg : r.color,
                  });
                }}
                style={{ ...inp, fontWeight: 700, color: r.color }}
              >
                {opts.map((l) => (
                  <option key={l.key} value={l.label}>
                    {l.label}
                  </option>
                ))}
                {!opts.some((l) => l.label === r.to) && (
                  <option value={r.to}>{r.to}</option>
                )}
              </select>
              <div
                onClick={() => removeMappingRule(r.id)}
                title="Удалить правило"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  color: 'var(--line)',
                  cursor: 'pointer',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </div>
            </div>
          );
        })}
        <div
          onClick={addMappingRule}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '13px 16px',
            color: ACCENT,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить правило
        </div>
      </div>
    </>
  );
}

const RIGHTS = ['Просмотр', 'Редактирование', 'Настройки', 'По ссылке'];
const ROLE_RIGHTS: Record<string, boolean[]> = {
  Админ: [true, true, true, true],
  Участник: [true, true, false, false],
  Наблюдатель: [true, false, false, false],
  Гость: [true, false, false, true],
};

function Access() {
  const guestLinks = useBoard((s) => s.guestLinks);
  const setFlag = useBoard((s) => s.setFlag);
  const grid = '150px repeat(4, 1fr)';
  return (
    <>
      <SectionHead title="Доступ" sub="Роли и правила публичного доступа." />
      <ToggleRow
        title="Гостевые шар-ссылки"
        desc="Read-only ссылки для бизнеса без аккаунта"
        on={guestLinks}
        onClick={() => setFlag('guestLinks', !guestLinks)}
        style={{ marginBottom: 18 }}
      />
      <div
        style={{
          background: 'var(--glass)',
          border: '1px solid var(--glass)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 var(--glass)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            padding: '11px 16px',
            borderBottom: '1px solid var(--hover)',
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-soft)',
          }}
        >
          <div>Роль</div>
          {RIGHTS.map((r) => (
            <div key={r} style={{ textAlign: 'center' }}>
              {r}
            </div>
          ))}
        </div>
        {ROLES.map((role) => (
          <div
            key={role}
            style={{
              display: 'grid',
              gridTemplateColumns: grid,
              alignItems: 'center',
              padding: '13px 16px',
              borderBottom: '1px solid var(--hover)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: ROLE_COLORS[role],
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{role}</span>
            </div>
            {ROLE_RIGHTS[role].map((ok, i) => (
              <div
                key={RIGHTS[i]}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                {ok ? (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#4a9b7f"
                    strokeWidth="2.4"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span
                    style={{
                      width: 14,
                      height: 2,
                      borderRadius: 2,
                      background: 'var(--surf-2)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function Appearance() {
  const dark = useBoard((s) => s.dark);
  const toggleDark = useBoard((s) => s.toggleDark);
  return (
    <>
      <SectionHead title="Внешний вид" sub="Тема интерфейса." />
      <ToggleRow
        title="Тёмная тема"
        desc="Стеклянный интерфейс в тёмном — удобно для ТВ-панели"
        on={dark}
        onClick={toggleDark}
      />
    </>
  );
}

export function SettingsScreen() {
  const settingsTab = useBoard((s) => s.settingsTab);
  const closeSettings = useBoard((s) => s.closeSettings);

  let body: ReactNode = null;
  if (settingsTab === 'integrations') body = <Integrations />;
  else if (settingsTab === 'sync') body = <Sync />;
  else if (settingsTab === 'mapping') body = <Mapping />;
  else if (settingsTab === 'access') body = <Access />;
  else if (settingsTab === 'appearance') body = <Appearance />;

  return (
    <div style={{ display: 'flex', height: '100%', boxSizing: 'border-box' }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          padding: '24px 36px 60px',
        }}
      >
        <div
          onClick={closeSettings}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginBottom: 18,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-soft)',
            cursor: 'pointer',
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Назад
        </div>
        <div style={{ maxWidth: 720 }}>{body}</div>
      </div>
    </div>
  );
}
