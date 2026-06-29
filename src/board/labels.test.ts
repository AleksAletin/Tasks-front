import { beforeEach, describe, expect, it } from 'vitest';
import { useBoard } from './store';
import {
  DEFAULT_LABELS,
  findLabel,
  initialGroups,
  labelOf,
  labelsOf,
  normalizeLabels,
  setLiveLabels,
  type Group,
} from './model';

const seed = (): Group[] => JSON.parse(JSON.stringify(initialGroups));
const tasks = () => useBoard.getState().groups.flatMap((g) => g.tasks);

describe('findLabel', () => {
  it('returns the matching def', () => {
    const defs = [
      { key: 'a', label: 'A', bg: '#1' },
      { key: 'b', label: 'B', bg: '#2' },
    ];
    expect(findLabel(defs, 'b')).toMatchObject({ key: 'b', label: 'B' });
  });

  it('falls back to "—" for an unknown key (never leaks the raw key)', () => {
    expect(findLabel([{ key: 'a', label: 'A', bg: '#1' }], 'zzz').label).toBe(
      '—',
    );
    expect(findLabel(undefined, 'zzz').label).toBe('—');
  });
});

describe('normalizeLabels', () => {
  it('fills missing/empty fields from the defaults', () => {
    const n = normalizeLabels({});
    expect(n.status).toHaveLength(DEFAULT_LABELS.status.length);
    expect(n.priority).toHaveLength(DEFAULT_LABELS.priority.length);
  });

  it('keeps a provided non-empty field and deep-copies it', () => {
    const custom = [{ key: 'x', label: 'X', bg: '#0' }];
    const n = normalizeLabels({ status: custom });
    expect(n.status).toHaveLength(1);
    expect(n.status[0]).toMatchObject({ key: 'x', label: 'X' });
    expect(n.status).not.toBe(custom);
  });
});

describe('live mirror', () => {
  it('reflects setLiveLabels and resolves keys via labelOf', () => {
    setLiveLabels(normalizeLabels({ status: [{ key: 'k', label: 'Lbl', bg: '#3' }] }));
    expect(labelsOf('status')).toHaveLength(1);
    expect(labelOf('status', 'k').label).toBe('Lbl');
    expect(labelOf('status', 'missing').label).toBe('—');
    setLiveLabels(normalizeLabels(null));
  });
});

describe('store label actions', () => {
  beforeEach(() => {
    const labels = normalizeLabels(null);
    setLiveLabels(labels);
    useBoard.setState({ groups: seed(), labels, viewer: false });
  });

  it('addLabel appends a label with a fresh, unique key', () => {
    const before = useBoard.getState().labels.priority.length;
    useBoard.getState().addLabel('priority');
    const keys = useBoard.getState().labels.priority.map((l) => l.key);
    expect(keys).toHaveLength(before + 1);
    expect(new Set(keys).size).toBe(keys.length); // no collision
  });

  it('editLabel renames + recolours in place', () => {
    useBoard
      .getState()
      .editLabel('status', 'done', { label: 'Завершено', bg: '#abc' });
    expect(
      useBoard.getState().labels.status.find((l) => l.key === 'done'),
    ).toMatchObject({ label: 'Завершено', bg: '#abc' });
  });

  it('removeLabel reassigns affected tasks off the deleted priority (→ null)', () => {
    const tid = useBoard.getState().groups[0].tasks[0].id;
    useBoard.getState().updateTask(tid, { priority: 'crit' });
    expect(useBoard.getState().groups[0].tasks[0].priority).toBe('crit');

    useBoard.getState().removeLabel('priority', 'crit');

    expect(
      useBoard.getState().labels.priority.some((l) => l.key === 'crit'),
    ).toBe(false);
    expect(tasks().some((t) => t.priority === 'crit')).toBe(false);
    expect(useBoard.getState().groups[0].tasks[0].priority).toBeNull();
  });

  it('removeLabel reassigns a non-nullable field (status) to the first remaining label', () => {
    const tid = useBoard.getState().groups[0].tasks[0].id;
    useBoard.getState().updateTask(tid, { status: 'stuck' });
    useBoard.getState().removeLabel('status', 'stuck');
    const first = useBoard.getState().labels.status[0].key;
    expect(tasks().some((t) => t.status === 'stuck')).toBe(false);
    expect(useBoard.getState().groups[0].tasks[0].status).toBe(first);
  });

  it('refuses to remove the last remaining label of a field', () => {
    const field = 'source' as const;
    let defs = useBoard.getState().labels[field];
    while (defs.length > 1) {
      useBoard.getState().removeLabel(field, defs[defs.length - 1].key);
      defs = useBoard.getState().labels[field];
    }
    expect(defs).toHaveLength(1);
    useBoard.getState().removeLabel(field, defs[0].key);
    expect(useBoard.getState().labels[field]).toHaveLength(1);
  });
});
