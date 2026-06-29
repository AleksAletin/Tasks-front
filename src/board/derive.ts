// Board view derivation — grouping / filtering / sorting / summary, ported 1:1 from
// the prototype's renderVals() + summarize() + deriveTask() data shaping.
import {
  type Group,
  type LabelField,
  type Task,
  SECTIONS,
  TODAY,
  dayNum,
  fmt,
  labelOf,
  labelsOf,
  personById,
} from './model';

const ACCENT = '#4263d8';

// Sort weight = the label's position in its (editable) registry order; unknown → last.
const ordIdx = (field: LabelField, key: string | null | undefined): number => {
  const i = labelsOf(field).findIndex((l) => l.key === key);
  return i < 0 ? 999 : i;
};

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
  labelsOf('status').forEach((l) => (sc[l.key] = 0));
  tasks.forEach((t) => (sc[t.status] = (sc[t.status] ?? 0) + 1));
  const statusSegs = labelsOf('status')
    .filter((l) => sc[l.key])
    .map((l) => ({
      bg: l.bg,
      pct: (sc[l.key] / total) * 100 + '%',
    }));

  const pc: Record<string, number> = {};
  labelsOf('priority').forEach((l) => (pc[l.key] = 0));
  tasks.forEach((t) => {
    if (t.priority) pc[t.priority] = (pc[t.priority] ?? 0) + 1;
  });
  const ptot = tasks.filter((t) => t.priority).length || 1;
  const prioSegs = labelsOf('priority')
    .filter((l) => pc[l.key])
    .map((l) => ({
      bg: l.bg,
      pct: (pc[l.key] / ptot) * 100 + '%',
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
        return t.priority == null ? 999 : ordIdx('priority', t.priority);
      case 'status':
        return ordIdx('status', t.status);
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
        ? labelsOf('status').map((l) => l.key)
        : gBy === 'priority'
          ? [...labelsOf('priority').map((l) => l.key), 'none']
          : gBy === 'section'
            ? SECTIONS
            : gBy === 'type'
              ? labelsOf('type').map((l) => l.key)
              : gBy === 'source'
                ? labelsOf('source').map((l) => l.key)
                : null;
    const keys = ord ? ord.filter((k) => buckets[k]) : Object.keys(buckets);
    const nm = (k: string) =>
      gBy === 'status'
        ? labelOf('status', k).label
        : gBy === 'priority'
          ? k === 'none'
            ? 'Без приоритета'
            : labelOf('priority', k).label
          : gBy === 'owner'
            ? k === 'none'
              ? 'Без владельца'
              : personById(k)?.name || k
            : gBy === 'type'
              ? labelOf('type', k).label
              : gBy === 'source'
                ? labelOf('source', k).label
                : k;
    const cl = (k: string) =>
      gBy === 'status'
        ? labelOf('status', k).bg
        : gBy === 'priority'
          ? k === 'none'
            ? 'var(--line)'
            : labelOf('priority', k).bg
          : gBy === 'owner'
            ? personById(k)?.color || 'var(--text-faint)'
            : gBy === 'type'
              ? labelOf('type', k).bg
              : gBy === 'source'
                ? labelOf('source', k).bg
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
