import { beforeEach, describe, expect, it } from 'vitest';
import { useBoard } from './store';
import { initialGroups, type Group } from './model';

// Deep-clone the demo seed so each test starts from a known board.
const seed = (): Group[] =>
  JSON.parse(JSON.stringify(initialGroups)) as Group[];

beforeEach(() => {
  useBoard.setState({
    groups: seed(),
    viewer: false,
    activeBoardId: 'b1',
    collapsed: {},
    renamingTaskId: null,
  });
});

describe('создание задачи: видимый результат', () => {
  it('createTask раскрывает свёрнутую первую группу и открывает переименование', () => {
    const firstId = useBoard.getState().groups[0].id;
    useBoard.setState({ collapsed: { [firstId]: true } });

    const before = useBoard.getState().groups[0].tasks.length;
    useBoard.getState().createTask();

    const s = useBoard.getState();
    expect(s.groups[0].tasks.length).toBe(before + 1);
    const created = s.groups[0].tasks[0]; // prepend — сразу под шапкой группы
    expect(created.name).toBe('Новая задача');
    expect(s.collapsed[firstId]).toBe(false); // группа больше не прячет задачу
    expect(s.renamingTaskId).toBe(created.id); // строка откроет инлайн-переименование
  });

  it('addTaskToGroup добавляет в конец группы и тоже открывает переименование', () => {
    const g = useBoard.getState().groups[1];
    useBoard.getState().addTaskToGroup(g.id);

    const s = useBoard.getState();
    const tasks = s.groups.find((x) => x.id === g.id)!.tasks;
    const created = tasks[tasks.length - 1];
    expect(created.name).toBe('Новая задача');
    expect(s.renamingTaskId).toBe(created.id);
  });

  it('createTaskBelow вставляет под строкой и открывает переименование', () => {
    const g = useBoard.getState().groups[0];
    const anchor = g.tasks[0].id;
    useBoard.getState().createTaskBelow(anchor);

    const s = useBoard.getState();
    const tasks = s.groups[0].tasks;
    expect(tasks[1].name).toBe('Новая задача');
    expect(s.renamingTaskId).toBe(tasks[1].id);
  });

  it('в режиме наблюдателя createTask — no-op', () => {
    useBoard.setState({ viewer: true });
    const before = useBoard.getState().groups[0].tasks.length;
    useBoard.getState().createTask();
    expect(useBoard.getState().groups[0].tasks.length).toBe(before);
    expect(useBoard.getState().renamingTaskId).toBeNull();
  });
});

describe('разбор инбокса: sendToBacklog', () => {
  it('линейно уносит задачу в хвост первой группы доски «Бэклог»', () => {
    useBoard.setState({
      boards: [
        { id: 'b1', name: 'Доска', color: '#000' },
        { id: 'b3', name: 'Бэклог', color: '#9b8fd1' },
      ],
      groups: [
        ...useBoard.getState().groups,
        { id: 'g_backlog', name: 'Входящие', color: '#9b8fd1', boardId: 'b3', tasks: [] },
      ],
    });

    useBoard.getState().sendToBacklog('t1');

    const s = useBoard.getState();
    const backlog = s.groups.find((g) => g.id === 'g_backlog')!;
    expect(backlog.tasks.map((t) => t.id)).toEqual(['t1']); // хвостом в бэклог
    expect(s.groups.flatMap((g) => g.tasks).filter((t) => t.id === 't1')).toHaveLength(1); // без дублей
  });

  it('без доски «Бэклог» — no-op (ничего не теряем)', () => {
    useBoard.setState({ boards: [{ id: 'b1', name: 'Доска', color: '#000' }] });
    const before = useBoard.getState().groups.flatMap((g) => g.tasks).length;
    useBoard.getState().sendToBacklog('t1');
    expect(useBoard.getState().groups.flatMap((g) => g.tasks).length).toBe(before);
  });
});
