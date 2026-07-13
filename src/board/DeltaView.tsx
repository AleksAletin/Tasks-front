// Вкладка «Δ Что изменилось» (ТЗ v2 §6): сравнение последнего слепка с предыдущим ПО ПОРЯДКУ
// (понедельник сам сравнится с пятницей), селектор «сравнить с», кнопка «Снапшот сейчас».
// Ежедневный слепок бэкенд снимает сам после полуночи.
import { useCallback, useEffect, useState } from 'react';
import {
  fetchDelta,
  fetchSnapshots,
  takeSnapshot,
  type Delta,
  type DeltaItem,
  type SnapshotInfo,
} from '../api/snapshots';
import { flushBoardNow } from '../api/sync';
import { findLabel, personById } from './model';
import { useBoard } from './store';

const ACCENT = '#4263d8';

const fmtStamp = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function DeltaView() {
  const [delta, setDelta] = useState<Delta | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [baseId, setBaseId] = useState<number | 'auto'>('auto');
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);

  const load = useCallback(async (base: number | 'auto') => {
    setBusy(true);
    try {
      const [list, diff] = await Promise.all([
        fetchSnapshots(),
        fetchDelta(base === 'auto' ? undefined : base).catch(() => null),
      ]);
      setSnapshots(list);
      setDelta(diff);
      setEmpty(diff === null);
    } catch {
      setEmpty(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load('auto');
  }, [load]);

  const snapNow = async () => {
    setBusy(true);
    try {
      // Слепок читает БД — дожимаем отложенный сейв доски, чтобы свежая правка попала в дифф.
      await flushBoardNow();
      await takeSnapshot();
      setBaseId('auto');
      await load('auto');
    } finally {
      setBusy(false);
    }
  };

  const pickBase = (v: string) => {
    const next = v === 'auto' ? ('auto' as const) : Number(v);
    setBaseId(next);
    void load(next);
  };

  const counters = delta
    ? [
        { icon: '✅', label: 'Закрыто', n: delta.closed.length, color: '#4a9b7f' },
        { icon: '🆕', label: 'Новые', n: delta.new.length, color: ACCENT },
        { icon: '🔄', label: 'Статусы', n: delta.statusChanged.length, color: '#d9a441' },
        { icon: '👤', label: 'Владельцы', n: delta.ownerChanged.length, color: '#8a63d8' },
        { icon: '🗑', label: 'Пропавшие', n: delta.gone.length, color: '#cf6b6b' },
      ]
    : [];
  const total = counters.reduce((s, c) => s + c.n, 0);

  return (
    <div style={{ padding: '18px 24px 40px', maxWidth: 980 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Δ Что изменилось</div>
        {delta && (
          <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600 }}>
            {fmtStamp(delta.baseTakenAt)} → {fmtStamp(delta.targetTakenAt)}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <select
          value={String(baseId)}
          onChange={(e) => pickBase(e.target.value)}
          style={{
            height: 30,
            borderRadius: 8,
            border: '1px solid var(--surf-2)',
            background: 'var(--card)',
            color: 'var(--text-3)',
            fontSize: 12,
            fontWeight: 600,
            padding: '0 8px',
          }}
        >
          <option value="auto">сравнить с: предыдущим</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              сравнить с: {fmtStamp(s.takenAt)}
            </option>
          ))}
        </select>
        <button
          onClick={() => void snapNow()}
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
          {busy ? '…' : 'Снапшот сейчас'}
        </button>
      </div>

      {empty && (
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
          Снапшотов ещё нет — снимите первый кнопкой «Снапшот сейчас».
          <br />
          Дальше слепки будут снматься сами каждую ночь, а здесь появится дифф день-к-дню.
        </div>
      )}

      {delta && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {counters.map((c) => (
              <div
                key={c.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 13px',
                  borderRadius: 10,
                  background: 'var(--card)',
                  border: '1px solid var(--surf-1)',
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <span>{c.icon}</span>
                {c.label}
                <span style={{ color: c.n ? c.color : 'var(--line)', fontSize: 14 }}>{c.n}</span>
              </div>
            ))}
          </div>

          {total === 0 && (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                color: 'var(--text-faint)',
                fontSize: 13,
                border: '1px dashed var(--line)',
                borderRadius: 12,
              }}
            >
              Изменений между слепками нет — тишина.
            </div>
          )}

          <Section title="✅ Закрытые" items={delta.closed} render="status" />
          <Section title="🆕 Новые" items={delta.new} render="status" />
          <Section title="🔄 Смены статуса" items={delta.statusChanged} render="status" />
          <Section title="👤 Смены владельца" items={delta.ownerChanged} render="owner" />
          <Section title="🗑 Пропавшие" items={delta.gone} render="status" />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  items: rawItems,
  render,
}: {
  title: string;
  items: DeltaItem[];
  render: 'status' | 'owner';
}) {
  // Один тикет может жить копиями на нескольких досках; синк двигает их вместе —
  // синхронные изменения слипаются в одну строку, ручные расхождения остаются видны.
  const seen = new Set<string>();
  const items = rawItems.filter((it) => {
    const sig = `${it.key}|${it.was ?? ''}|${it.now ?? ''}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
        {title} <span style={{ color: 'var(--text-faint)' }}>· {items.length}</span>
      </div>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--surf-1)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {items.map((it) => (
          <DeltaRow key={`${it.key}-${it.was}-${it.now}`} item={it} render={render} />
        ))}
      </div>
    </div>
  );
}

function DeltaRow({ item, render }: { item: DeltaItem; render: 'status' | 'owner' }) {
  const isTicket = /^[A-ZА-ЯЁ]+-\d+$/u.test(item.key);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 14px',
        borderBottom: '1px solid var(--surf-1)',
        fontSize: 12.5,
        minWidth: 0,
      }}
    >
      {isTicket && (
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
          {item.key}
        </span>
      )}
      <span
        style={{
          fontWeight: 600,
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.title}
      </span>
      {item.parent && (
        <span
          style={{
            color: 'var(--text-faint)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 220,
          }}
        >
          {item.kind === 'sub' ? '⤷' : 'в'} {item.parent}
        </span>
      )}
      <div style={{ flex: 1 }} />
      {render === 'status' ? (
        <>
          {item.was && <StatusPill value={item.was} />}
          {item.was && item.now && <Arrow />}
          {item.now && <StatusPill value={item.now} />}
        </>
      ) : (
        <>
          <OwnerName value={item.was} />
          <Arrow />
          <OwnerName value={item.now} />
        </>
      )}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function StatusPill({ value }: { value: string }) {
  const labels = useBoard((s) => s.labels);
  const known = ['work', 'done', 'stuck', 'plan'].includes(value);
  const def = known ? findLabel(labels.status, value) : null;
  return (
    <span
      style={{
        flexShrink: 0,
        padding: '3px 10px',
        borderRadius: 8,
        background: def ? def.bg : 'var(--surf-1)',
        color: def ? '#fff' : 'var(--text-3)',
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      {def ? def.label : value}
    </span>
  );
}

function OwnerName({ value }: { value: string | null }) {
  const person = personById(value);
  return (
    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>
      {person ? person.name : (value ?? '—')}
    </span>
  );
}
