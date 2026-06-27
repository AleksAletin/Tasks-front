// Timeline (gantt) derivation — ported 1:1 from the prototype's `buildTimeline` (~1934).
// Builds the day header, per-role lanes/bars, the resource-load band, and the bottleneck flag.
import {
  type Group,
  type Person,
  MONTHS,
  PEOPLE,
  PHASES,
  STATUS,
  TODAY,
  WIN_START,
  WIN_END,
  dayNum,
  fmt,
  isoFromDate,
  lighten,
  personById,
} from './model';
import { computePhases } from './phases';
import type { TlDrag } from './store';

export const DAY_W = 36;
export const LANE_LABEL_W = 240;

export interface TlDay {
  i: number;
  label: number;
  monthFirst: boolean;
  monthLabel: string;
  colBg: string;
  color: string;
}
export interface TlSeg {
  color: string;
  width: string;
  short: string;
}
export interface TlRow {
  key: string;
  name: string;
  hasBar: boolean;
  noBar: boolean;
  isPhased: boolean;
  solid: boolean;
  segs: TlSeg[];
  left: string;
  width: string;
  bg: string;
  barLabel: string;
  statusBg: string;
}
export interface TlGroup {
  name: string;
  color: string;
  count: number;
  rows: TlRow[];
}
export interface TlResCell {
  bg: string;
  over: boolean;
  count: string;
}
export interface TlResource {
  id: string;
  name: string;
  initials: string;
  color: string;
  cells: TlResCell[];
}
export interface TimelineData {
  days: TlDay[];
  groups: TlGroup[];
  resources: TlResource[];
  flag: string | null;
  totalW: string;
  totalMinW: string;
  todayLeftPx: string;
  rangeLabel: string;
}

export function buildTimeline(groups: Group[], tlDrag: TlDrag | null): TimelineData {
  const ws = dayNum(WIN_START);
  const we = dayNum(WIN_END);
  const n = we - ws + 1;

  const days: TlDay[] = [];
  for (let i = 0; i < n; i++) {
    const dn = ws + i;
    const dt = new Date(dn * 86400000);
    const dow = (dt.getUTCDay() + 6) % 7;
    const isoStr = isoFromDate(dt);
    const weekend = dow >= 5;
    const today = isoStr === TODAY;
    days.push({
      i,
      label: dt.getUTCDate(),
      monthFirst: dt.getUTCDate() === 1 || i === 0,
      monthLabel: MONTHS[dt.getUTCMonth()],
      colBg: today ? 'rgba(66,99,216,0.07)' : weekend ? 'rgba(120,130,200,0.05)' : 'transparent',
      color: today ? '#4263d8' : weekend ? 'var(--line)' : 'var(--text-soft)',
    });
  }

  const td = tlDrag;
  const tlGroups: TlGroup[] = groups.map((g) => ({
    name: g.name,
    color: g.color,
    count: g.tasks.length,
    rows: g.tasks.map((t): TlRow => {
      const dd = td && td.id === t.id ? td.dd : 0;
      if (!t.tl) {
        return {
          key: t.id,
          name: t.name,
          hasBar: false,
          noBar: true,
          isPhased: false,
          solid: false,
          segs: [],
          left: '0px',
          width: '0px',
          bg: '',
          barLabel: '',
          statusBg: '',
        };
      }
      const a = dayNum(t.tl.start) + dd;
      const b = dayNum(t.tl.end) + dd;
      const left = (a - ws) * DAY_W;
      const width = (b - a + 1) * DAY_W;
      const st = STATUS[t.status];
      let isPhased = false;
      let segs: TlSeg[] = [];
      if (t.phases) {
        isPhased = true;
        const cp = computePhases({ phases: t.phases, anchor: t.anchor });
        segs = cp.segs.map((sg) => ({ color: sg.color, width: sg.days * DAY_W + 'px', short: PHASES[sg.key].label[0] }));
      }
      return {
        key: t.id,
        name: t.name,
        hasBar: true,
        noBar: false,
        isPhased,
        solid: !isPhased,
        segs,
        left: left + 'px',
        width: width + 'px',
        bg: 'linear-gradient(180deg, ' + lighten(g.color) + ', ' + g.color + ')',
        barLabel: fmt(t.tl.start) + ' – ' + fmt(t.tl.end),
        statusBg: st.bg,
      };
    }),
  }));

  // resource load — each phase contributes its `res` on every day in its span
  const load: Record<string, number[]> = {};
  PEOPLE.forEach((p) => (load[p.id] = new Array(n).fill(0)));
  groups.forEach((g) =>
    g.tasks.forEach((t) => {
      if (!t.phases) return;
      const cp = computePhases({ phases: t.phases, anchor: t.anchor });
      cp.segs.forEach((sg) => {
        const res = t.phases![sg.key].res;
        if (!res || !load[res]) return;
        for (let d = sg.startDn; d <= sg.endDn; d++) {
          const idx = d - ws;
          if (idx >= 0 && idx < n) load[res][idx]++;
        }
      });
    }),
  );

  const resources: TlResource[] = PEOPLE.filter((p) => load[p.id].some((v) => v > 0)).map((p: Person) => ({
    id: p.id,
    name: p.name,
    initials: p.initials,
    color: p.color,
    cells: load[p.id].map((v): TlResCell => ({
      bg: v <= 0 ? 'transparent' : v === 1 ? p.color + '5e' : '#cf6b6b',
      over: v >= 2,
      count: v >= 2 ? String(v) : '',
    })),
  }));

  // bottleneck — worst concurrent load across all people/days
  let worst = 0;
  let wp: string | null = null;
  let wi = -1;
  PEOPLE.forEach((p) =>
    load[p.id].forEach((v, i) => {
      if (v > worst) {
        worst = v;
        wp = p.id;
        wi = i;
      }
    }),
  );
  const flag =
    worst >= 2 && wp
      ? (personById(wp)?.name ?? '') +
        ': ' +
        worst +
        ' фазы одновременно с ' +
        fmt(isoFromDate(new Date((ws + wi) * 86400000))) +
        ' → риск +' +
        (worst - 1) +
        ' дн к сроку роли'
      : null;

  return {
    days,
    groups: tlGroups,
    resources,
    flag,
    totalW: n * DAY_W + 'px',
    totalMinW: LANE_LABEL_W + n * DAY_W + 'px',
    todayLeftPx: LANE_LABEL_W + (dayNum(TODAY) - ws) * DAY_W + 'px',
    rangeLabel: '15 июня — 19 июля 2026 · перетащите бар, чтобы сдвинуть даты',
  };
}
