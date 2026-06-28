// Phase geometry — ported 1:1 from the prototype's `computePhases` (Ultra Board.dc.html ~1580).
// Given a task's phases + anchor, returns day-number spans per phase and the overall start/end.
import {
  type PhaseKey,
  type Phases,
  type Anchor,
  PHASES,
  PHASE_ORDER,
  TODAY,
  dayNum,
  isoFromDate,
} from './model';

export interface PhaseSeg {
  key: PhaseKey;
  color: string;
  days: number;
  startDn: number;
  endDn: number;
}
export interface ComputedPhases {
  startDn: number;
  endDn: number;
  total: number;
  start: string;
  end: string;
  segs: PhaseSeg[];
}

export function computePhases(t: {
  phases: Phases;
  anchor?: Anchor;
}): ComputedPhases {
  const order = PHASE_ORDER;
  const ph = t.phases;
  const total = order.reduce((a, k) => a + (ph[k].days || 0), 0);
  const a: Anchor = t.anchor || { type: 'start', date: TODAY };
  const startDn =
    a.type === 'start' ? dayNum(a.date) : dayNum(a.date) - total + 1;
  const segs: PhaseSeg[] = [];
  let cur = startDn;
  order.forEach((k) => {
    const d = ph[k].days || 0;
    if (d <= 0) return;
    segs.push({
      key: k,
      color: PHASES[k].color,
      days: d,
      startDn: cur,
      endDn: cur + d - 1,
    });
    cur += d;
  });
  const endDn = startDn + total - 1;
  return {
    startDn,
    endDn,
    total,
    start: isoFromDate(new Date(startDn * 86400000)),
    end: isoFromDate(new Date(Math.max(startDn, endDn) * 86400000)),
    segs,
  };
}
