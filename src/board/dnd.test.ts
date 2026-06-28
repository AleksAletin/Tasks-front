import { beforeEach, describe, expect, it } from 'vitest';
import { useBoard } from './store';
import { initialGroups, type Group } from './model';

// Deep-clone the demo seed so each test starts from a known board.
const seed = (): Group[] =>
  JSON.parse(JSON.stringify(initialGroups)) as Group[];

const ids = (gid: string): string[] => {
  const g = useBoard.getState().groups.find((x) => x.id === gid);
  return (g?.tasks ?? []).map((t) => t.id);
};

beforeEach(() => {
  useBoard.setState({
    groups: seed(),
    viewer: false,
    drag: null,
    dropTarget: null,
    groupDrag: null,
    groupDropId: null,
  });
});

describe('moveTask', () => {
  it('reorders a task within its group', () => {
    // g1 starts as [t1, t2, t3]; move t1 to index 2 (before t3 after removal).
    useBoard.getState().moveTask('t1', 'g1', 2);
    expect(ids('g1')).toEqual(['t2', 't3', 't1']);
  });

  it('moves a task across groups (role change) and removes it from the source', () => {
    // g2 starts [t4, t5, t6, t7]; move t4 into g1 at the front.
    useBoard.getState().moveTask('t4', 'g1', 0);
    expect(ids('g1')).toEqual(['t4', 't1', 't2', 't3']);
    expect(ids('g2')).toEqual(['t5', 't6', 't7']);
  });

  it('clamps an out-of-range index to the end of the target group', () => {
    useBoard.getState().moveTask('t1', 'g3', 999);
    const g3 = ids('g3');
    expect(g3[g3.length - 1]).toBe('t1');
    expect(ids('g1')).toEqual(['t2', 't3']);
  });

  it('is a no-op in viewer mode', () => {
    useBoard.setState({ viewer: true });
    useBoard.getState().moveTask('t1', 'g2', 0);
    expect(ids('g1')).toEqual(['t1', 't2', 't3']);
    expect(ids('g2')).toEqual(['t4', 't5', 't6', 't7']);
  });
});

describe('dropRow', () => {
  it('resolves drag + dropTarget(before) into the correct insertion', () => {
    useBoard.setState({
      drag: { id: 't3' },
      dropTarget: { groupId: 'g1', taskId: 't1', before: true },
    });
    useBoard.getState().dropRow();
    expect(ids('g1')).toEqual(['t3', 't1', 't2']);
    // Ephemeral drag state is cleared after a drop.
    expect(useBoard.getState().drag).toBeNull();
    expect(useBoard.getState().dropTarget).toBeNull();
  });

  it('resolves drop "after" a target row', () => {
    useBoard.setState({
      drag: { id: 't1' },
      dropTarget: { groupId: 'g1', taskId: 't2', before: false },
    });
    useBoard.getState().dropRow();
    expect(ids('g1')).toEqual(['t2', 't1', 't3']);
  });

  it('does nothing when there is no drop target', () => {
    useBoard.setState({ drag: { id: 't1' }, dropTarget: null });
    useBoard.getState().dropRow();
    expect(ids('g1')).toEqual(['t1', 't2', 't3']);
  });
});

describe('moveGroup', () => {
  it('moves a group up via the arrow direction', () => {
    useBoard.getState().moveGroup('g2', -1);
    expect(useBoard.getState().groups.map((g) => g.id)).toEqual([
      'g2',
      'g1',
      'g3',
      'g4',
    ]);
  });

  it('moves a group down via the arrow direction', () => {
    useBoard.getState().moveGroup('g1', 1);
    expect(useBoard.getState().groups.map((g) => g.id)).toEqual([
      'g2',
      'g1',
      'g3',
      'g4',
    ]);
  });

  it('ignores moves past the edges', () => {
    useBoard.getState().moveGroup('g1', -1);
    expect(useBoard.getState().groups.map((g) => g.id)).toEqual([
      'g1',
      'g2',
      'g3',
      'g4',
    ]);
  });
});

describe('groupDrop', () => {
  it('reorders groups by splicing the dragged group before the target', () => {
    useBoard.setState({ groupDrag: { id: 'g4' } });
    useBoard.getState().groupDrop('g1');
    expect(useBoard.getState().groups.map((g) => g.id)).toEqual([
      'g4',
      'g1',
      'g2',
      'g3',
    ]);
    expect(useBoard.getState().groupDrag).toBeNull();
    expect(useBoard.getState().groupDropId).toBeNull();
  });
});

describe('persistence', () => {
  it('persists groups but never the ephemeral drag state', () => {
    // Set ephemeral drag fields then trigger a persisted mutation (a group move).
    useBoard.setState({
      drag: { id: 't1' },
      dropTarget: { groupId: 'g1', taskId: 't2', before: true },
      groupDrag: { id: 'g2' },
      groupDropId: 'g1',
    });
    useBoard.getState().moveGroup('g1', 1);
    const raw = window.localStorage.getItem('work_board_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as {
      state: Record<string, unknown>;
    };
    const keys = Object.keys(parsed.state);
    expect(keys).toContain('groups');
    expect(keys).not.toContain('drag');
    expect(keys).not.toContain('dropTarget');
    expect(keys).not.toContain('groupDrag');
    expect(keys).not.toContain('groupDropId');
  });
});
