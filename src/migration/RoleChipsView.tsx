// Таб «Матрица» на доске — роль-центричный редактор членства роль↔модуль (перенесён с карты,
// где матрица была плотной сеткой 198×34). Механизм по просьбе лида: роль = карточка, её модули
// добавляются СПИСКОМ ЧИПСОВ. «+ модуль» — пикер с поиском по всем модулям, × убирает чип; цвет
// чипа = бакет модуля, пересчитывается на лету (нужность зависит от членства). Правки летят
// на PUT /migration/roles (дебаунс) — источник карты и досок обновится при следующем импорте/входе.
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchMigration, saveMigrationRoles } from '../api/migration';
import {
  applyMembership,
  masterDerive,
  roleStats,
  type MasterModule,
  type ModuleRow,
  type NoveltyRow,
  type RoleRow,
} from './domain';
import { BUCKET_COLOR, CARD, TIER_COLOR } from './ui';

const ACCENT = '#4263d8';
const CHIP_CAP = 40; // модулей на карточку до «показать все»

export function RoleChipsView() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [novelties, setNovelties] = useState<NoveltyRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchMigration().then(
      (d) => {
        setRoles(d.roles);
        setModules(d.modules);
        setNovelties(d.novelties);
        setLoaded(true);
      },
      () => setLoaded(true),
    );
  }, []);

  // Пересчёт: членство → нужность → ярус/бакет. Живёт от текущего (редактируемого) состава ролей,
  // так что цвета чипов и готовность двигаются сразу после add/remove.
  const rows = useMemo(
    () => masterDerive(applyMembership(modules, roles), novelties, roles),
    [modules, roles, novelties],
  );
  const byId = useMemo(() => new Map(rows.map((m) => [m.id, m])), [rows]);

  // Дебаунс-сохранение полного членства.
  const persist = (next: RoleRow[]) => {
    setSave('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveMigrationRoles(next).then(
        () => setSave('saved'),
        () => setSave('error'),
      );
    }, 600);
  };

  const addModule = (roleId: number, moduleId: number) => {
    setRoles((prev) => {
      const next = prev.map((r) =>
        r.id === roleId && !r.modules.includes(moduleId)
          ? { ...r, modules: [...r.modules, moduleId] }
          : r,
      );
      persist(next);
      return next;
    });
  };
  const removeModule = (roleId: number, moduleId: number) => {
    setRoles((prev) => {
      const next = prev.map((r) =>
        r.id === roleId ? { ...r, modules: r.modules.filter((m) => m !== moduleId) } : r,
      );
      persist(next);
      return next;
    });
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? roles.filter((r) => r.name.toLowerCase().includes(needle) || String(r.id).includes(needle))
      : roles;
    return [...list].sort((a, b) => b.modules.length - a.modules.length);
  }, [roles, q]);

  if (loaded && modules.length === 0) {
    return (
      <div style={{ padding: '30px 26px', maxWidth: 640 }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Матрица · роли и модули</div>
        <div
          style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: 'var(--text-faint)',
            fontSize: 13,
            border: '1px dashed var(--line)',
            borderRadius: 12,
          }}
        >
          Данные не залиты. Импортируйте мастер-файл во вкладке «Импорт» — тогда роли и их модули
          появятся здесь.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '22px 26px 48px', maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Матрица · роли и модули</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск роли…"
          style={{
            fontSize: 12.5,
            padding: '6px 11px',
            borderRadius: 8,
            border: '1px solid var(--surf-2)',
            background: 'var(--bg)',
            color: 'var(--text-2)',
            width: 220,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{shown.length} ролей</span>
        <div style={{ flex: 1 }} />
        <SaveBadge state={save} />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16, lineHeight: 1.5 }}>
        Роль = набор модулей. Добавляйте модули чипсами («+ модуль»), убирайте крестиком — цвет чипа
        показывает бакет модуля, готовность роли считается сразу.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            byId={byId}
            allModules={modules}
            onAdd={(mid) => addModule(role.id, mid)}
            onRemove={(mid) => removeModule(role.id, mid)}
          />
        ))}
      </div>
    </div>
  );
}

function SaveBadge({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  const map = {
    saving: { text: 'сохраняю…', color: 'var(--text-faint)' },
    saved: { text: '✓ сохранено', color: '#4a9b7f' },
    error: { text: '⚠ не сохранилось', color: '#cf6b6b' },
  } as const;
  const s = map[state];
  return <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.text}</span>;
}

function RoleCard({
  role,
  byId,
  allModules,
  onAdd,
  onRemove,
}: {
  role: RoleRow;
  byId: Map<number, MasterModule>;
  allModules: ModuleRow[];
  onAdd: (moduleId: number) => void;
  onRemove: (moduleId: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(() => roleStats(role, byId), [role, byId]);

  // Чипы в порядке нужности (важные — вперёд), затем по id.
  const chipIds = useMemo(
    () =>
      [...role.modules].sort(
        (a, b) => (byId.get(b)?.need ?? 0) - (byId.get(a)?.need ?? 0) || a - b,
      ),
    [role.modules, byId],
  );
  const visible = expanded ? chipIds : chipIds.slice(0, CHIP_CAP);
  const pct = Math.round(stats.pctDone * 100);

  return (
    <div style={{ ...CARD, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-2)' }}>{role.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>id {role.id}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>
          {role.modules.length} модулей · {pct}% готово
        </span>
        <div
          title={`${stats.done}/${stats.toMigrate} к переносу`}
          style={{ width: 90, height: 6, borderRadius: 4, background: 'var(--surf-1)', overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4a9b7f' : ACCENT }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {visible.map((mid) => (
          <Chip key={mid} module={byId.get(mid)} id={mid} onRemove={() => onRemove(mid)} />
        ))}
        {chipIds.length > CHIP_CAP && (
          <button
            onClick={() => setExpanded((v) => !v)}
            style={pillBtn('var(--text-soft)')}
          >
            {expanded ? 'свернуть' : `+ ещё ${chipIds.length - CHIP_CAP}`}
          </button>
        )}
        <button onClick={() => setAdding((v) => !v)} style={pillBtn(ACCENT, true)}>
          + модуль
        </button>
      </div>

      {adding && (
        <AddModulePicker
          allModules={allModules}
          byId={byId}
          has={new Set(role.modules)}
          onPick={(mid) => onAdd(mid)}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function Chip({
  module,
  id,
  onRemove,
}: {
  module: MasterModule | undefined;
  id: number;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = module ? BUCKET_COLOR[module.bucket] : '#8a8f98';
  const name = module?.name ?? `модуль ${id}`;
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={module ? `${id} · ${name} · ${module.bucket}` : String(id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 260,
        padding: '3px 8px 3px 8px',
        borderRadius: 8,
        background: color + '18',
        border: `1px solid ${color}33`,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-3)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{id}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span
        onClick={onRemove}
        title="Убрать модуль"
        style={{
          flexShrink: 0,
          cursor: 'pointer',
          fontSize: 13,
          lineHeight: 1,
          color: hover ? '#cf6b6b' : 'var(--text-faint)',
          marginLeft: 1,
        }}
      >
        ×
      </span>
    </span>
  );
}

function AddModulePicker({
  allModules,
  byId,
  has,
  onPick,
  onClose,
}: {
  allModules: ModuleRow[];
  byId: Map<number, MasterModule>;
  has: Set<number>;
  onPick: (moduleId: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allModules
      .filter((m) => !has.has(m.id))
      .filter(
        (m) => !needle || m.name.toLowerCase().includes(needle) || String(m.id).includes(needle),
      )
      .sort((a, b) => (byId.get(b.id)?.need ?? 0) - (byId.get(a.id)?.need ?? 0) || a.id - b.id)
      .slice(0, 60);
  }, [allModules, has, q, byId]);

  return (
    <div
      style={{
        marginTop: 10,
        border: '1px solid var(--surf-2)',
        borderRadius: 10,
        background: 'var(--card)',
        padding: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <input
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти модуль по имени или id…"
          style={{
            flex: 1,
            height: 30,
            border: `1px solid ${ACCENT}`,
            borderRadius: 8,
            padding: '0 10px',
            fontSize: 12.5,
            outline: 'none',
            background: 'var(--bg)',
            color: 'var(--text)',
          }}
        />
        <button onClick={onClose} style={pillBtn('var(--text-soft)')}>
          закрыть
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {candidates.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-faint)', padding: '4px 6px' }}>
            Ничего не нашлось.
          </span>
        )}
        {candidates.map((m) => {
          const color = BUCKET_COLOR[byId.get(m.id)?.bucket ?? 'Нужна задача'];
          return (
            <span
              key={m.id}
              onClick={() => onPick(m.id)}
              title={`${m.id} · ${m.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                maxWidth: 260,
                padding: '4px 9px',
                borderRadius: 8,
                border: '1px solid var(--surf-2)',
                background: 'var(--bg)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-3)',
                cursor: 'pointer',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>{m.id}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </span>
              <span style={{ color: TIER_COLOR[byId.get(m.id)?.tier ?? 'Хвост'], fontWeight: 700 }}>+</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function pillBtn(color: string, accent = false): React.CSSProperties {
  return {
    height: 26,
    padding: '0 10px',
    borderRadius: 8,
    border: accent ? `1px solid ${color}44` : '1px solid var(--surf-2)',
    background: accent ? 'rgba(66,99,216,0.07)' : 'var(--card)',
    color,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  };
}
