// «Что горит» derivation — ported 1:1 from the prototype's `buildAlerts` (~1993).
// Computes flags from data: overdue, stuck, critical priority, role gates (< 100% parity),
// and the timeline bottleneck. Each alert carries a navigation target.
import { type BoardTab } from './store';
import {
  type Group,
  type Parity,
  PARITY_COLS,
  TODAY,
  DONE_STATUS,
  STUCK_STATUS,
  CRIT_PRIORITY,
  dayNum,
  fmt,
} from './model';
import { computeBottleneck } from './timeline';

export type AlertSev = 'high' | 'mid';
export interface AlertTarget {
  kind: 'task' | 'tab';
  taskId?: string;
  tab?: BoardTab;
}
export interface Alert {
  sev: AlertSev;
  dot: string;
  catBg: string;
  cat: string;
  title: string;
  sub: string;
  target: AlertTarget;
}
export interface AlertsData {
  list: Alert[];
  count: number;
  high: number;
}

// Parity readiness for a role — done / (total − skip) over PARITY_COLS. Mirrors ParityView.
function readyPct(parity: Parity, gid: string): number {
  const counted = PARITY_COLS.map((c) => parity[gid]?.[c] || 'none').filter(
    (s) => s !== 'skip',
  );
  const done = counted.filter((s) => s === 'done').length;
  return counted.length ? Math.round((done / counted.length) * 100) : 100;
}

export function buildAlerts(groups: Group[], parity: Parity): AlertsData {
  const A: Alert[] = [];
  const today = dayNum(TODAY);

  groups.forEach((g) =>
    g.tasks.forEach((t) => {
      if (t.due && dayNum(t.due) < today && t.status !== DONE_STATUS) {
        A.push({
          sev: 'high',
          dot: '#cf6b6b',
          catBg: 'var(--red-tint)',
          cat: 'Просрочка',
          title: t.name,
          sub: 'Срок ' + fmt(t.due) + ' · ' + g.name,
          target: { kind: 'task', taskId: t.id },
        });
      }
      if (t.status === STUCK_STATUS) {
        A.push({
          sev: 'high',
          dot: '#cf6b6b',
          catBg: 'var(--red-tint)',
          cat: 'Застряли',
          title: t.name,
          sub: (t.note || 'требует внимания') + ' · ' + g.name,
          target: { kind: 'task', taskId: t.id },
        });
      } else if (t.priority === CRIT_PRIORITY && t.status !== DONE_STATUS) {
        A.push({
          sev: 'mid',
          dot: '#d6953f',
          catBg: 'var(--amber-tint)',
          cat: 'Критичный приоритет',
          title: t.name,
          sub: g.name,
          target: { kind: 'task', taskId: t.id },
        });
      }
    }),
  );

  // role gates — any role under 100% parity readiness
  groups.forEach((g) => {
    const pct = readyPct(parity, g.id);
    if (pct < 100) {
      A.push({
        sev: 'mid',
        dot: '#d6953f',
        catBg: 'var(--amber-tint)',
        cat: 'Гейт роли',
        title: 'Роль «' + g.name + '» не готова к переключению',
        sub: pct + '% паритета',
        target: { kind: 'tab', tab: 'parity' },
      });
    }
  });

  // bottleneck — from the resource load (independent of bar drag, so no tlDrag needed)
  const flag = computeBottleneck(groups);
  if (flag) {
    A.push({
      sev: 'high',
      dot: '#cf6b6b',
      catBg: 'var(--red-tint)',
      cat: 'Бутылочное горло',
      title: flag,
      sub: 'Ресурсный затык в плане',
      target: { kind: 'tab', tab: 'timeline' },
    });
  }

  const order: Record<AlertSev, number> = { high: 0, mid: 1 };
  A.sort((a, b) => order[a.sev] - order[b.sev]);
  return {
    list: A,
    count: A.length,
    high: A.filter((a) => a.sev === 'high').length,
  };
}
