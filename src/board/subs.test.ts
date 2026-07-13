import { beforeEach, describe, expect, it } from 'vitest';
import { useBoard } from './store';
import { initialGroups, type Group, type Sub, type Task } from './model';

// Deep-clone the demo seed so each test starts from a known board.
// Demo t1 ships with subs [s1a, s1b, s1c].
const seed = (): Group[] =>
  JSON.parse(JSON.stringify(initialGroups)) as Group[];

const t1 = (): Task =>
  useBoard
    .getState()
    .groups.flatMap((g) => g.tasks)
    .find((t) => t.id === 't1')!;

const subIds = (): string[] => (t1().subs ?? []).map((s) => s.id);

beforeEach(() => {
  useBoard.setState({ groups: seed(), viewer: false });
});

describe('подзадачи: поля и экшены', () => {
  it('updateSub принимает новые поля (priority/note/ticketId)', () => {
    useBoard
      .getState()
      .updateSub('t1', 's1a', { priority: 'high', note: 'к релизу', ticketId: 'BAC-7' });
    const s = t1().subs!.find((x) => x.id === 's1a')!;
    expect(s.priority).toBe('high');
    expect(s.note).toBe('к релизу');
    expect(s.ticketId).toBe('BAC-7');
  });

  it('removeSub удаляет ровно один подэлемент', () => {
    useBoard.getState().removeSub('t1', 's1b');
    expect(subIds()).toEqual(['s1a', 's1c']);
  });

  it('removeSub в режиме наблюдателя — no-op', () => {
    useBoard.setState({ viewer: true });
    useBoard.getState().removeSub('t1', 's1b');
    expect(subIds()).toEqual(['s1a', 's1b', 's1c']);
  });

  it('moveSub переставляет внутри задачи и клампит индекс', () => {
    useBoard.getState().moveSub('t1', 's1a', 2);
    expect(subIds()).toEqual(['s1b', 's1c', 's1a']);
    useBoard.getState().moveSub('t1', 's1a', 0);
    expect(subIds()).toEqual(['s1a', 's1b', 's1c']);
    useBoard.getState().moveSub('t1', 's1b', 999);
    expect(subIds()).toEqual(['s1a', 's1c', 's1b']);
  });

  it('attachToEpic: задача из инбокса уезжает подзадачей эпика с тикетом и статусом', () => {
    useBoard.getState().updateTask('t4', { ticketId: 'BAC-77', status: 'work' });
    useBoard.getState().attachToEpic('t4', 't1');

    const state = useBoard.getState();
    const all = state.groups.flatMap((g) => g.tasks);
    expect(all.find((t) => t.id === 't4')).toBeUndefined(); // задачи больше нет
    const t1subs = all.find((t) => t.id === 't1')!.subs!;
    const t1sub = t1subs[t1subs.length - 1];
    expect(t1sub.ticketId).toBe('BAC-77'); // тикет уехал с ней — синк продолжит вести
    expect(t1sub.status).toBe('work');
    expect(state.expanded['t1']).toBe(true); // эпик раскрыт — видно, куда легла
  });

  it('attachToEpic сам к себе — no-op', () => {
    const before = t1().subs!.length;
    useBoard.getState().attachToEpic('t1', 't1');
    expect(t1().subs!.length).toBe(before);
  });

  it('hydrateBoard нормализует легаси-сабы «BAC-n · title» в ticketId + имя', () => {
    const groups = seed();
    const legacy: Sub = {
      id: 'sx',
      name: 'BAC-1669 · Проверка поиска',
      owner: null,
      status: 'plan',
      due: null,
    };
    const normal: Sub = {
      id: 'sy',
      name: 'Обычный подэлемент · с точкой в имени',
      owner: null,
      status: 'plan',
      due: null,
    };
    groups[0].tasks[0].subs = [legacy, normal];

    useBoard.getState().hydrateBoard({
      boards: [{ id: 'b1', name: 'Доска', color: '#000' }],
      groups,
      parity: {},
      version: 1,
    });

    const subs = t1().subs!;
    expect(subs[0].ticketId).toBe('BAC-1669');
    expect(subs[0].name).toBe('Проверка поиска');
    // Уже осмысленные имена (и сабы без «KEY-n» префикса) не трогаем.
    expect(subs[1].ticketId).toBeUndefined();
    expect(subs[1].name).toBe('Обычный подэлемент · с точкой в имени');
  });
});
