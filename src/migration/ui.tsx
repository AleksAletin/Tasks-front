/* eslint-disable react-refresh/only-export-components -- deliberately mixes style tokens with
   tiny shared components; HMR granularity doesn't matter for this leaf module. */
// Shared presentation primitives for the migration module's views (backlog / matrix / registries /
// trace). Pure display — all numbers come from ./domain.
import type { Bucket, Tier } from './domain';

export const BUCKET_COLOR: Record<Bucket, string> = {
  'В работе': '#c8893f',
  Заблокировано: '#cf6b6b',
  'Готово к работе': '#4263d8',
  'Нужна задача': '#d9a441',
  'Хвост — потом': '#8a8f98',
  Готово: '#4a9b7f',
  'Не переносим': '#b0b4ba',
};

export const TIER_COLOR: Record<Tier, string> = {
  Ядро: '#4263d8',
  Средние: '#c8893f',
  Хвост: '#8a8f98',
};

export const CARD: React.CSSProperties = {
  background: 'var(--glass)',
  backdropFilter: 'blur(20px) saturate(165%)',
  WebkitBackdropFilter: 'blur(20px) saturate(165%)',
  border: '1px solid var(--glass)',
  boxShadow: 'inset 0 1px 0 var(--glass)',
  borderRadius: 14,
};

export const TH: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.3px',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  position: 'sticky',
  top: 0,
  background: 'var(--bg)',
  whiteSpace: 'nowrap',
  zIndex: 1,
};

export const TD: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12.5,
  color: 'var(--text-2)',
  borderTop: '1px solid var(--surf-1)',
  verticalAlign: 'middle',
};

export function BucketPill({ bucket }: { bucket: Bucket }) {
  const c = BUCKET_COLOR[bucket];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: c,
        background: c + '22',
      }}
    >
      {bucket}
    </span>
  );
}

export function TierPill({ tier }: { tier: Tier }) {
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: TIER_COLOR[tier] }}>{tier}</span>;
}

export function Filter<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{
          fontSize: 12.5,
          padding: '5px 8px',
          borderRadius: 7,
          border: '1px solid var(--surf-2)',
          background: 'var(--bg)',
          color: 'var(--text-2)',
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        fontSize: 12.5,
        padding: '5px 10px',
        borderRadius: 7,
        border: '1px solid var(--surf-2)',
        background: 'var(--bg)',
        color: 'var(--text-2)',
        width: 220,
        outline: 'none',
      }}
    />
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 9 }}>
      {children}
    </div>
  );
}
