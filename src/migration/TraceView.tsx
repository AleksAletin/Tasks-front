// «Дёрни за ниточку» (brief §4.2, master edition): pick a role → its modules with states (наив +
// истинная готовность «к переносу»); pick a module → every role that has it + вердикт «перенос ×
// новинки» + the module's pending новинки. Clicking across panels walks the chain both ways in
// one click — the acceptance criterion.
import { useMemo } from 'react';
import {
  noveltiesByModule,
  roleStats,
  type MasterModule,
  type NoveltyRow,
  type RoleRow,
} from './domain';
import { BUCKET_COLOR, BucketPill, CARD, CritPill, TIER_COLOR, TierPill, VerdictPill } from './ui';

export function TraceView({
  rows,
  roles,
  byId,
  novelties,
  roleId,
  moduleId,
  onSelectRole,
  onSelectModule,
}: {
  rows: MasterModule[];
  roles: RoleRow[];
  byId: Map<number, MasterModule>;
  novelties: NoveltyRow[];
  roleId: number | null;
  moduleId: number | null;
  onSelectRole: (id: number | null) => void;
  onSelectModule: (id: number | null) => void;
}) {
  const role = roles.find((r) => r.id === roleId) ?? null;
  const module = moduleId != null ? (byId.get(moduleId) ?? null) : null;

  const rolesOfModule = useMemo(
    () => (moduleId == null ? [] : roles.filter((r) => r.modules.includes(moduleId))),
    [roles, moduleId],
  );
  const modulesOfRole = useMemo(() => {
    if (!role) return [];
    return role.modules
      .map((id) => byId.get(id))
      .filter((m): m is MasterModule => !!m)
      .sort((a, b) => b.need - a.need || a.id - b.id);
  }, [role, byId]);
  const moduleNovelties = useMemo(
    () => (moduleId == null ? [] : novelties.filter((n) => n.modules.includes(moduleId))),
    [novelties, moduleId],
  );

  const novByModule = useMemo(() => noveltiesByModule(novelties), [novelties]);
  const stats = role ? roleStats(role, byId, novByModule) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
      {/* ------- Role side ------- */}
      <div style={{ ...CARD, padding: 16 }}>
        <PanelTitle>Роль</PanelTitle>
        <select
          value={roleId ?? ''}
          onChange={(e) => onSelectRole(e.target.value ? Number(e.target.value) : null)}
          style={selectStyle}
        >
          <option value="">— выбери роль —</option>
          {[...roles]
            .sort((a, b) => b.modules.length - a.modules.length)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.modules.length} мод. · {r.id}
              </option>
            ))}
        </select>

        {role && stats && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, margin: '14px 0' }}>
              <Stat label="#модулей" value={String(stats.total)} />
              <Stat
                label="Ядро / Средние / Хвост"
                value={`${stats.core} / ${stats.mid} / ${stats.tail}`}
              />
              <Stat label="К переносу" value={String(stats.toMigrate)} />
              <Stat
                label="Готово (наив)"
                value={`${stats.done} · ${Math.round(stats.pctDone * 100)}%`}
                tone="#4263d8"
              />
              <Stat
                label="Истинно готово"
                value={`${stats.trueDone} · ${Math.round(stats.pctTrue * 100)}%`}
                tone="#4a9b7f"
              />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 6 }}>
              Модули роли (клик → правая панель):
            </div>
            <div style={{ maxHeight: '44vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {modulesOfRole.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectModule(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    borderRadius: 7,
                    cursor: 'pointer',
                    background: m.id === moduleId ? 'var(--blue-tint)' : 'transparent',
                  }}
                >
                  <span style={{ color: BUCKET_COLOR[m.bucket], fontSize: 11 }}>●</span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)', width: 40, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {m.id}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: 'var(--text-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.name}
                  </span>
                  {m.noveltyCount > 0 && (
                    <span title="новинок" style={{ fontSize: 10.5, fontWeight: 800, color: '#cf6b6b', flexShrink: 0 }}>
                      +{m.noveltyCount}
                    </span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: TIER_COLOR[m.tier], flexShrink: 0 }}>
                    {m.need}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ------- Module side ------- */}
      <div style={{ ...CARD, padding: 16 }}>
        <PanelTitle>Модуль</PanelTitle>
        <select
          value={moduleId ?? ''}
          onChange={(e) => onSelectModule(e.target.value ? Number(e.target.value) : null)}
          style={selectStyle}
        >
          <option value="">— выбери модуль —</option>
          {[...rows]
            .sort((a, b) => b.need - a.need || a.id - b.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} · {m.name.slice(0, 60)}
              </option>
            ))}
        </select>

        {module && (
          <>
            <div style={{ margin: '14px 0 4px', fontSize: 14.5, fontWeight: 700, color: 'var(--text-3)' }}>
              {module.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <TierPill tier={module.tier} />
              <BucketPill bucket={module.bucket} />
              <VerdictPill verdict={module.verdict} />
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#4263d8' }}>
                {/^BAC-\d+/.test(module.bac) ? module.bac : 'без задачи'}
              </span>
              {module.state && module.state !== 'неизвестно' && (
                <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>· {module.state}</span>
              )}
            </div>
            {module.note && (
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 10, lineHeight: 1.45 }}>
                {module.note}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
              <Stat label="Нужность (ролей)" value={String(module.need)} tone={TIER_COLOR[module.tier]} />
              <Stat label="Score" value={String(module.score)} />
              <Stat
                label="Новинок"
                value={String(module.noveltyCount)}
                tone={module.noveltyCount ? '#cf6b6b' : undefined}
              />
            </div>

            {moduleNovelties.length > 0 && (
              <>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 6 }}>
                  Новинки модуля (влить перед переключением роли):
                </div>
                <div style={{ maxHeight: '20vh', overflowY: 'auto', marginBottom: 12 }}>
                  {moduleNovelties.map((n) => (
                    <div key={n.bac} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4263d8', flexShrink: 0 }}>
                        {n.bac}
                      </span>
                      <CritPill criticality={n.criticality} />
                      <span
                        style={{
                          flex: 1,
                          color: 'var(--text-soft)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 6 }}>
              Роли, у которых он есть (клик → левая панель):
            </div>
            <div style={{ maxHeight: '30vh', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rolesOfModule.map((r) => (
                <span
                  key={r.id}
                  onClick={() => onSelectRole(r.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid ' + (r.id === roleId ? '#4263d8' : 'var(--surf-2)'),
                    background: r.id === roleId ? 'var(--blue-tint)' : 'transparent',
                    color: r.id === roleId ? '#4263d8' : 'var(--text-2)',
                  }}
                >
                  {r.name}
                </span>
              ))}
              {rolesOfModule.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>ни у одной роли</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 13,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid var(--surf-2)',
  background: 'var(--bg)',
  color: 'var(--text-2)',
};

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone?: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: small ? 12.5 : 17, fontWeight: 800, color: tone ?? 'var(--text-3)' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{label}</div>
    </div>
  );
}
