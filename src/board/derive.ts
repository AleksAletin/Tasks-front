// Board view derivation — grouping / filtering / sorting / summary, ported 1:1 from
// the prototype's renderVals() + summarize() + deriveTask() data shaping.
import {
  type PrioKey,
  type SourceKey,
  type StatusKey,
  type TypeKey,
  type Group,
  type Task,
  PRIO,
  PRIO_ORDER,
  SECTIONS,
  SOURCE,
  SOURCE_ORDER,
  STATUS,
  STATUS_ORDER,
  TODAY,
  TYPE,
  TYPE_ORDER,
  dayNum,
  fmt,
  personById,
} from './model';

const ACCENT = '#4263d8';

const PRW: Record<string, number> = { crit: 0, high: 1, mid: 2, low: 3 };
const STW: Record<string, number> = { done: 0, work: 1, stuck: 2, plan: 3 };

export interface ViewGroup {
  id: string;
  name: string;
  color: string;
  isRole: boolean;
  count: number;
  tasks: Task[]; // filtered + sorted
  summary: GroupSummary;
  empty: boolean;
  emptyFiltered: boolean;
  emptyPlain: boolean;
}

export interface Seg {
  pct: string;
  bg: string;
}
export interface GroupSummary {
  statusSegs: Seg[];
  prioSegs: Seg[];
  tlLabel: string;
}

export interface ViewParams {
  groups: Group[];
  query: string;
  filterStatus: Record<string, boolean>;
  filterOwner: string | null;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  groupBy: string;
}

const allTasks = (groups: Group[]): Task[] => groups.flatMap((g) => g.tasks);

export function summarize(tasks: Task[]): GroupSummary {
  const total = tasks.length || 1;
  const sc: Record<string, number> = {};
  STATUS_ORDER.forEach((k) => (sc[k] = 0));
  tasks.forEach((t) => sc[t.status]++);
  const statusSegs = STATUS_ORDER.filter((k) => sc[k]).map((k) => ({
    bg: STATUS[k].bg,
    pct: (sc[k] / total) * 100 + '%',
  }));

  const pc: Record<string, number> = {};
  PRIO_ORDER.forEach((k) => (pc[k] = 0));
  tasks.forEach((t) => {
    if (t.priority) pc[t.priority]++;
  });
  const ptot = tasks.filter((t) => t.priority).length || 1;
  const prioSegs = PRIO_ORDER.filter((k) => pc[k]).map((k) => ({
    bg: PRIO[k].bg,
    pct: (pc[k] / ptot) * 100 + '%',
  }));

  const ds = tasks.filter((t) => t.tl);
  let tlLabel = '';
  if (ds.length) {
    let mn = ds[0].tl!.start;
    let mx = ds[0].tl!.end;
    ds.forEach((t) => {
      if (dayNum(t.tl!.start) < dayNum(mn)) mn = t.tl!.start;
      if (dayNum(t.tl!.end) > dayNum(mx)) mx = t.tl!.end;
    });
    tlLabel = fmt(mn) + ' – ' + fmt(mx);
  }
  return { statusSegs, prioSegs, tlLabel };
}

export function buildView(p: ViewParams): {
  groups: ViewGroup[];
  tableEmptyAll: boolean;
} {
  const q = p.query.trim().toLowerCase();
  const match = (t: Task) =>
    !q ||
    (t.name + ' ' + (t.note || '') + ' ' + t.section).toLowerCase().includes(q);
  const fStat = p.filterStatus || {};
  const fActive = Object.keys(fStat).filter((k) => fStat[k]);
  const filt = (t: Task) =>
    match(t) &&
    (fActive.length === 0 || fStat[t.status]) &&
    (!p.filterOwner || t.owner === p.filterOwner);

  // Comparable value for a column key — supports every built-in column (the column menu sorts by
  // the column's own key; 'task' is the name). Nulls sort last in ascending order.
  const sortVal = (t: Task, key: string): string | number => {
    switch (key) {
      case 'task':
      case 'name':
        return t.name.toLowerCase();
      case 'due':
        return t.due || '9999-99-99';
      case 'priority':
        return t.priority == null ? 9 : PRW[t.priority];
      case 'status':
        return STW[t.status] ?? 9;
      case 'owner':
        return (personById(t.owner)?.name || 'яяяя').toLowerCase();
      case 'section':
        return (t.section || 'яяяя').toLowerCase();
      case 'type':
        return t.type;
      case 'source':
        return t.source;
      case 'note':
        return (t.note || 'яяяя').toLowerCase();
      case 'tl':
        return t.tl ? dayNum(t.tl.start) : 9e12;
      case 'updated':
        return (t.lastBy || '') + (t.lastAgo || '');
      default:
        return t.name.toLowerCase();
    }
  };
  const sortTasks = (arr: Task[]): Task[] => {
    if (!p.sortBy) return arr;
    const dir = p.sortDir === 'desc' ? -1 : 1;
    const key = p.sortBy;
    const cp = arr.slice();
    cp.sort((a, b) => {
      const x = sortVal(a, key);
      const y = sortVal(b, key);
      return x < y ? -dir : x > y ? dir : 0;
    });
    return cp;
  };

  const gBy = p.groupBy || 'role';
  const byRole = gBy === 'role';
  interface RawGroup {
    id: string;
    name: string;
    color: string;
    tasks: Task[];
    role: boolean;
  }
  let rawGroups: RawGroup[];
  if (byRole) {
    rawGroups = p.groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      tasks: g.tasks,
      role: true,
    }));
  } else {
    const fv = (t: Task) =>
      gBy === 'status'
        ? t.status
        : gBy === 'priority'
          ? t.priority || 'none'
          : gBy === 'owner'
            ? t.owner || 'none'
            : gBy === 'type'
              ? t.type
              : gBy === 'source'
                ? t.source
                : t.section;
    const buckets: Record<string, Task[]> = {};
    allTasks(p.groups).forEach((t) => {
      const k = fv(t);
      (buckets[k] = buckets[k] || []).push(t);
    });
    const ord: string[] | null =
      gBy === 'status'
        ? STATUS_ORDER
        : gBy === 'priority'
          ? [...PRIO_ORDER, 'none']
          : gBy === 'section'
            ? SECTIONS
            : gBy === 'type'
              ? TYPE_ORDER
              : gBy === 'source'
                ? SOURCE_ORDER
                : null;
    const keys = ord ? ord.filter((k) => buckets[k]) : Object.keys(buckets);
    const nm = (k: string) =>
      gBy === 'status'
        ? STATUS[k as StatusKey]?.label || k
        : gBy === 'priority'
          ? k === 'none'
            ? 'Без приоритета'
            : PRIO[k as PrioKey]?.label || k
          : gBy === 'owner'
            ? k === 'none'
              ? 'Без владельца'
              : personById(k)?.name || k
            : gBy === 'type'
              ? TYPE[k as TypeKey]?.label || k
              : gBy === 'source'
                ? SOURCE[k as SourceKey]?.label || k
                : k;
    const cl = (k: string) =>
      gBy === 'status'
        ? STATUS[k as StatusKey]?.bg || 'var(--text-faint)'
        : gBy === 'priority'
          ? k === 'none'
            ? 'var(--line)'
            : PRIO[k as PrioKey]?.bg || 'var(--text-faint)'
          : gBy === 'owner'
            ? personById(k)?.color || 'var(--text-faint)'
            : gBy === 'type'
              ? TYPE[k as TypeKey]?.bg || 'var(--text-faint)'
              : gBy === 'source'
                ? SOURCE[k as SourceKey]?.bg || 'var(--text-faint)'
                : ACCENT;
    rawGroups = keys.map((k) => ({
      id: 'grp_' + gBy + '_' + k,
      name: nm(k),
      color: cl(k),
      tasks: buckets[k],
      role: false,
    }));
  }

  const anyFilter = !!q || fActive.length > 0 || !!p.filterOwner;
  const groups: ViewGroup[] = rawGroups.map((g) => {
    const tasks = sortTasks(g.tasks.filter(filt));
    const empty = tasks.length === 0;
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      isRole: g.role,
      count: g.tasks.length,
      tasks,
      summary: summarize(g.tasks),
      empty,
      emptyFiltered: empty && anyFilter,
      emptyPlain: empty && !anyFilter,
    };
  });
  const tableEmptyAll = anyFilter && groups.every((g) => g.tasks.length === 0);
  return { groups, tableEmptyAll };
}

// ---- per-task derived cell values (subset used by the table) ----
export interface DueInfo {
  label: string;
  color: string;
  strike: 'none' | 'line-through';
  check: boolean;
  clock: boolean;
}
export function deriveDue(task: Task): DueInfo {
  let label = '—';
  let color = 'var(--line)';
  let strike: 'none' | 'line-through' = 'none';
  let check = false;
  let clock = false;
  if (task.due) {
    label = fmt(task.due);
    if (task.status === 'done') {
      color = '#4a9b7f';
      strike = 'line-through';
      check = true;
    } else {
      const overdue = dayNum(task.due) < dayNum(TODAY);
      color = overdue ? '#cf6b6b' : 'var(--text-mut)';
      clock = true;
    }
  }
  return { label, color, strike, check, clock };
}
