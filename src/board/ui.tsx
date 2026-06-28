// Shared UI primitives for the board, ported from the prototype's inline-styled chrome.
import type { CSSProperties, ReactNode } from 'react';

// ---- Avatar (colored circle with initials) ----
export function Avatar({
  initials,
  color,
  size = 28,
  font,
}: {
  initials: string;
  color: string;
  size?: number;
  font?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: font ?? Math.round(size * 0.4),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ---- Empty avatar (dashed circle, "no owner") ----
export function AvatarEmpty({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1.5px dashed var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--line)',
        flexShrink: 0,
      }}
    >
      <svg
        width={size / 2}
        height={size / 2}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    </div>
  );
}

// ---- Solid filled pill (status/priority/type/source cell look) ----
export function Pill({
  label,
  bg,
  style,
}: {
  label: string;
  bg: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#fff',
        background: bg,
        padding: '3px 11px',
        borderRadius: 6,
        ...style,
      }}
    >
      {label}
    </span>
  );
}

// ---- Tooltip wrapper (glass tip below, css from theme.css) ----
export function Tip({
  text,
  children,
  style,
  onClick,
  className,
}: {
  text: string;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`tipwrap${className ? ' ' + className : ''}`}
      style={style}
      onClick={onClick}
    >
      {children}
      <span className="tip">{text}</span>
    </div>
  );
}

// ---- Glass popover overlay (backdrop + positioned glass card) ----
export function GlassPopover({
  x,
  y,
  onClose,
  children,
  minWidth,
  width,
  padding = 8,
  zIndex = 90,
  backdropZ = 80,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
  width?: number;
  padding?: number;
  zIndex?: number;
  backdropZ?: number;
}) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: backdropZ }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex,
          background: 'var(--glass-hi)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          border: '1px solid var(--glass)',
          borderRadius: 16,
          boxShadow: '0 18px 50px var(--shadow), inset 0 1px 0 var(--glass-hi)',
          padding,
          minWidth,
          width,
          animation: 'popIn .14s ease',
        }}
      >
        {children}
      </div>
    </>
  );
}

// Inline SVG icon by path string (stroke-based, matches prototype icons).
export function Icon({
  d,
  size = 16,
  stroke = 'currentColor',
  width,
}: {
  d: string;
  size?: number;
  stroke?: string;
  width?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width ?? 2}
    >
      <path d={d} />
    </svg>
  );
}
