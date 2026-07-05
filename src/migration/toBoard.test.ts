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
  migrationToBoard,
  migrationTaskId,
  noveltiesToBoard,
  noveltyTaskId,
  MIGRATION_BOARD_ID,
  NOVELTIES_BOARD_ID,
} from './toBoard';
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
