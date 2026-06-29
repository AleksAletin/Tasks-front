// Pure, live dashboard aggregates — derived entirely from the board's tasks so the «бизнес-витрина»
// KPIs reflect what the user actually entered (no hardcoded demo numbers). Kept framework-free and
// side-effect-free so it's unit-testable and reusable by DashboardScreen.
import { type Task, CRIT_PRIORITY, DONE_STATUS, dayNum, fmt } from './model';

export interface BoardMetrics {
  total: number;
  done: number;
  donePct: number;
  open: number;
  overdue: number;
  critOpen: number;
  /** Plan span in days from the earliest start/due to the latest end/due across dated tasks. */
  horizon: number;
}

export function boardMetrics(tasks: Task[], today: string): BoardMetrics {
  const t = dayNum(today);
  let done = 0;
  let overdue = 0;
  let critOpen = 0;
  const starts: number[] = [];
  const ends: number[] = [];
  tasks.forEach((tk) => {
    if (tk.status === DONE_STATUS) done++;
    if (tk.due && dayNum(tk.due) < t && tk.status !== DONE_STATUS) overdue++;
    if (tk.priority === CRIT_PRIORITY && tk.status !== DONE_STATUS) critOpen++;
    if (tk.tl) {
      starts.push(dayNum(tk.tl.start));
      ends.push(dayNum(tk.tl.end));
    } else if (tk.due) {
      const d = dayNum(tk.due);
      starts.push(d);
      ends.push(d);
    }
  });
  const total = tasks.length;
  return {
    total,
    done,
    donePct: total ? Math.round((done / total) * 100) : 0,
    open: total - done,
    overdue,
    critOpen,
    horizon: starts.length ? Math.max(...ends) - Math.min(...starts) + 1 : 0,
  };
}

export interface DueMilestone {
  date: string;
  label: string;
  done: boolean;
}

// The N nearest task deadlines (chronological), each flagged done by its status — the live
// replacement for the dashboard's formerly-hardcoded milestone timeline.
export function dueMilestones(tasks: Task[], limit = 5): DueMilestone[] {
  return tasks
    .filter((tk) => tk.due)
    .sort((a, b) => dayNum(a.due!) - dayNum(b.due!))
    .slice(0, limit)
    .map((tk) => ({
      date: fmt(tk.due),
      label: tk.name,
      done: tk.status === DONE_STATUS,
    }));
}
