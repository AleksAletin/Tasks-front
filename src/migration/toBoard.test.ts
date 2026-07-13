import { describe, expect, it } from 'vitest';
import facts from './data/support.json';
import rolesData from './data/support-roles.json';
import noveltiesData from './data/support-novelties.json';
import {
  applyMembership,
  isNoveltyPending,
  masterDerive,
  type ModuleRow,
  type NoveltyRow,
  type RoleRow,
} from './domain';
import {
  epicsToBoard,
  epicTaskId,
  migrationToBoard,
  migrationTaskId,
  noveltiesToBoard,
  noveltyTaskId,
  EPICS_BOARD_ID,
  MIGRATION_BOARD_ID,
  NOVELTIES_BOARD_ID,
} from './toBoard';
import type { EpicRow } from './domain';
import { useBoard } from '../board/store';

const novelties = noveltiesData as NoveltyRow[];

const rows = masterDerive(
  applyMembership(facts as ModuleRow[], rolesData as RoleRow[]),
  noveltiesData as NoveltyRow[],
  rolesData as RoleRow[],
);

describe('карта переезда → доска', () => {
  const { board, groups, collapsedGroupIds } = migrationToBoard(rows);

  it('группы = волны В1–В7 + свёрнутая «Готово», очередь целиком уезжает задачами', () => {
    expect(board.id).toBe(MIGRATION_BOARD_ID);
    expect(groups).toHaveLength(8);
    const queueCount = groups.slice(0, 7).reduce((s, g) => s + g.tasks.length, 0);
    expect(queueCount).toBe(rows.filter((r) => r.masterWave <= 7).length); // все 92 из очереди
    expect(collapsedGroupIds).toEqual(['g_mig_done']);
    const done = groups.find((g) => g.id === 'g_mig_done')!;
    expect(done.tasks.length).toBe(rows.filter((r) => r.masterWave === 9 && r.bucket === 'Готово').length);
    // «Не переносим» без новинок (вне очереди) на доску не тащим; с новинками — это В6
    // «пересмотреть», они как раз в очереди.
    const allIds = new Set(groups.flatMap((g) => g.tasks.map((t) => t.id)));
    for (const m of rows.filter((r) => r.bucket === 'Не переносим' && r.masterWave === 9)) {
      expect(allIds.has(migrationTaskId(m.id))).toBe(false);
    }
  });

  it('маппинг задачи: статус из бакета, приоритет из яруса/ПЕРЕОТКРЫТЬ, BAC в ticketId', () => {
    const byId = new Map(groups.flatMap((g) => g.tasks).map((t) => [t.id, t]));
    const reopen = rows.find((r) => r.verdict === '🔴 ПЕРЕОТКРЫТЬ')!;
    expect(byId.get(migrationTaskId(reopen.id))!.priority).toBe('crit');

    const inWork = rows.find((r) => r.bucket === 'В работе' && r.tier === 'Ядро')!;
    const t = byId.get(migrationTaskId(inWork.id))!;
    expect(t.status).toBe('work');
    expect(t.priority === 'crit' || t.priority === 'high').toBe(true);
    if (/^BAC-\d+/.test(inWork.bac)) {
      expect(t.ticketId).toBe(inWork.bac); // синк подхватит статусы
    }
    expect(t.note).toContain('score');
  });

  it('доска новинок: живые по критичности, закрытые — свёрнутый архив, все 104 с ticketId', () => {
    const nb = noveltiesToBoard(novelties, rows);
    expect(nb.board.id).toBe(NOVELTIES_BOARD_ID);
    expect(nb.groups).toHaveLength(5);
    const total = nb.groups.reduce((s, g) => s + g.tasks.length, 0);
    expect(total).toBe(novelties.length); // все 104
    const closed = nb.groups.find((g) => g.id === 'g_nov_closed')!;
    expect(closed.tasks.length).toBe(novelties.filter((n) => !isNoveltyPending(n)).length);
    expect(nb.collapsedGroupIds).toEqual(['g_nov_closed']);
    const crit = novelties.find((n) => n.criticality.startsWith('🔴'))!;
    const critTask = nb.groups
      .flatMap((g) => g.tasks)
      .find((t) => t.id === noveltyTaskId(crit.bac))!;
    expect(critTask.priority).toBe('crit');
    expect(critTask.ticketId).toBe(crit.bac); // синк держит статусы
    expect(nb.groups.flatMap((g) => g.tasks).every((t) => t.ticketId)).toBe(true);
  });

  it('раздел задачи-модуля = ярус (группировки и фильтры доски осмысленны)', () => {
    const { groups } = migrationToBoard(rows);
    const anyTask = groups[0].tasks[0];
    expect(['Ядро', 'Средние', 'Хвост']).toContain(anyTask.section);
  });

  it('эпики → задачи с подзадачами: группы-разделы, стадии в статусы, дети со статусами', () => {
    const epics: EpicRow[] = [
      {
        key: 'R425',
        section: 'Главное окно',
        report: 'Отчёт «Поиск веб-пользователей»',
        modules: 3,
        taskCount: 3,
        progress: 0.33,
        ice: 6920,
        novelties: 2,
        stage: '🧠 аналитика',
        team: 'fomina.an',
        children: [
          { bac: 'BAC-1', title: 'Дочка раз', type: 'Техдолг', stage: '🆕 новая', assignee: '' },
          { bac: 'BAC-2', title: 'Дочка два', type: 'Задача', stage: '🔵 в работе', assignee: 'x' },
          { bac: 'BAC-3', title: 'Дочка три', type: 'Задача', stage: '✅ готово', assignee: '' },
        ],
      },
      {
        key: 'R47',
        section: '—',
        report: 'Отчёт Б',
        modules: 1,
        taskCount: 0,
        progress: 1,
        ice: 100,
        novelties: 0,
        stage: '✅ катить!',
        team: '',
        children: [],
      },
    ];

    const { board, groups, collapsedGroupIds } = epicsToBoard(epics);

    expect(board.id).toBe(EPICS_BOARD_ID);
    // Две группы по состоянию: «В работе» + свёрнутая «Готово»; раздел остаётся полем section.
    expect(groups.map((g) => g.id)).toEqual(['g_epic_work', 'g_epic_done']);
    expect(collapsedGroupIds).toEqual(['g_epic_done']);
    const epic = groups[0].tasks[0];
    expect(epic.id).toBe(epicTaskId('R425'));
    expect(epic.status).toBe('work'); // 🧠 аналитика
    expect(epic.section).toBe('Главное окно');
    expect(epic.subs).toHaveLength(3);
    expect(epic.subs!.map((s) => s.status)).toEqual(['plan', 'work', 'done']);
    expect(epic.note).toContain('Σ ICE: 6920');
    const done = groups[1].tasks[0];
    expect(done.id).toBe(epicTaskId('R47'));
    expect(done.status).toBe('done'); // ✅ катить!
    expect(done.section).toBe('Прочее'); // «—» → Прочее

    // Поля подзадачи: BAC — в ticketId (чип + синк), имя человеческое, тип/исполнитель — в note.
    const first = epic.subs![0];
    expect(first.ticketId).toBe('BAC-1');
    expect(first.name).toBe('Дочка раз');
    expect(first.note).toBe('Техдолг');
    expect(epic.subs![1].note).toBe('Задача · x');
  });

  it('retirePrefix: переход с разделов на статусы — правки живут, сабы доливаются', () => {
    const epics: EpicRow[] = [
      {
        key: 'R900',
        section: 'Web',
        report: 'Отчёт-переезд',
        modules: 1,
        taskCount: 2,
        progress: 0,
        ice: 500,
        novelties: 0,
        stage: '🧠 аналитика',
        team: '',
        children: [
          { bac: 'BAC-91', title: 'Старая дочка', type: 'Задача', stage: '🆕 новая', assignee: '' },
          { bac: 'BAC-92', title: 'Новая дочка из файла', type: 'Задача', stage: '🆕 новая', assignee: '' },
        ],
      },
    ];

    // Старая раскладка: эпик живёт в разделной группе; юзер назначил владельца, поправил
    // саб; статус задачи — устаревшая стадия из прошлого файла.
    const legacy = {
      board: epicsToBoard(epics).board,
      groups: [
        {
          id: 'g_epic_web',
          name: 'Web',
          color: '#2e9e83',
          boardId: EPICS_BOARD_ID,
          tasks: [
            {
              ...epicsToBoard(epics).groups[0].tasks[0],
              status: 'done' as const, // устаревшая стадия прошлого файла
              owner: 'p2', // правка юзера
              subs: [
                { id: 'sub_R900_BAC-91', name: 'Старая дочка', owner: null, status: 'done' as const, due: null, ticketId: 'BAC-91' },
              ],
            },
          ],
        },
      ],
      collapsedGroupIds: [],
    };
    useBoard.setState({
      groups: useBoard.getState().groups.filter((g) => (g.boardId ?? 'b1') !== EPICS_BOARD_ID),
    });
    useBoard.getState().importMigrationBoard(legacy);

    // Новая раскладка со статусными группами расформировывает разделные.
    const added = useBoard
      .getState()
      .importMigrationBoard({ ...epicsToBoard(epics), retirePrefix: 'g_epic_' });

    const state = useBoard.getState();
    const boardGroups = state.groups.filter((g) => (g.boardId ?? 'b1') === EPICS_BOARD_ID);
    expect(boardGroups.map((g) => g.id).sort()).toEqual(['g_epic_done', 'g_epic_work']);
    const workGroup = boardGroups.find((g) => g.id === 'g_epic_work')!;
    const moved = workGroup.tasks.find((t) => t.id === epicTaskId('R900'))!;
    expect(moved.status).toBe('work'); // вычисляемая стадия обновилась из файла (🧠 аналитика)
    expect(moved.owner).toBe('p2'); // правка юзера выжила при переезде
    expect(moved.subs!.map((s) => s.ticketId)).toEqual(['BAC-91', 'BAC-92']); // сабы долиты
    expect(moved.subs![0].status).toBe('done'); // правленый саб не перезаписан
    expect(added).toBe(0); // сам эпик не считается новым
  });

  it('store: повторный импорт не плодит дублей и не трогает правки пользователя', () => {
    const payload = migrationToBoard(rows);
    const first = useBoard.getState().importMigrationBoard(payload);
    expect(first).toBeGreaterThan(0);

    // пользователь "поработал": сменил статус одной задаче
    const anyTask = payload.groups[0].tasks[0];
    useBoard.getState().updateTask(anyTask.id, { status: 'done' });

    const second = useBoard.getState().importMigrationBoard(migrationToBoard(rows));
    expect(second).toBe(0); // всё уже на доске

    const state = useBoard.getState();
    const boardGroups = state.groups.filter((g) => (g.boardId ?? 'b1') === MIGRATION_BOARD_ID);
    const copies = boardGroups.flatMap((g) => g.tasks).filter((t) => t.id === anyTask.id);
    expect(copies).toHaveLength(1); // без дублей
    expect(copies[0].status).toBe('done'); // правка выжила
    expect(state.activeBoardId).toBe(MIGRATION_BOARD_ID);
    expect(state.screen).toBe('board');
  });
});
