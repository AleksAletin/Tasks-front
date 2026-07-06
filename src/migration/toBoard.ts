// «Карта переезда» → живые доски: модули (волны В1–В7) и новинки-догоняшки (по критичности)
// становятся обычными задачами — драг, статусы, владельцы, панель; привязка BAC в ticketId отдаёт
// статусы YouTrack-синку, и доски живут сами. Чистые трансформации: store-экшен решает, что
// добавлять (повторный прогон доливает только новое).
import type { Board, Group, Sub, Task } from '../board/model';
import { isNoveltyPending, WAVE_INFO, type EpicRow, type MasterModule, type NoveltyRow } from './domain';

export const MIGRATION_BOARD_ID = 'b_migration';
export const NOVELTIES_BOARD_ID = 'b_novelties';
export const EPICS_BOARD_ID = 'b_epics';

const WAVE_COLORS: Record<number, string> = {
  1: '#4263d8',
  2: '#cf6b6b',
  3: '#d9534f',
  4: '#4a9b7f',
  5: '#d9a441',
  6: '#8a8f98',
  7: '#b0b4ba',
};

/** Стабильный id задачи-модуля — повторная трансформация не плодит дубли. */
export const migrationTaskId = (moduleId: number) => `mig_${moduleId}`;

function statusOf(m: MasterModule): Task['status'] {
  switch (m.bucket) {
    case 'Готово':
      return 'done';
    case 'В работе':
      return 'work';
    case 'Заблокировано':
      return 'stuck';
    default:
      return 'plan';
  }
}

function priorityOf(m: MasterModule): Task['priority'] {
  if (m.verdict === '🔴 ПЕРЕОТКРЫТЬ') return 'crit';
  if (m.tier === 'Ядро') return 'high';
  if (m.tier === 'Средние') return 'mid';
  return 'low';
}

function taskOf(m: MasterModule): Task {
  const bits = [m.verdict, m.noveltyCount ? `новинок: ${m.noveltyCount}` : null, `score ${m.score}`]
    .filter(Boolean)
    .join(' · ');
  return {
    id: migrationTaskId(m.id),
    name: m.name,
    owner: null,
    status: statusOf(m),
    due: null,
    priority: priorityOf(m),
    tl: null,
    note: bits,
    lastBy: '',
    lastAgo: '',
    // Раздел = ярус: колонка «Раздел», группировки и фильтры доски сразу осмысленны.
    section: m.tier,
    type: 'mig',
    source: 'ours',
    ticketId: /^BAC-\d+/.test(m.bac) ? m.bac : null,
  } as Task;
}

export interface MigrationBoard {
  board: Board;
  groups: Group[];
  /** Группы, которые стоит держать свёрнутыми (готово-архив). */
  collapsedGroupIds: string[];
}

/**
 * Собрать доску из мастер-модели: группы = волны В1–В7 (рабочая очередь, порядок волн), плюс
 * свёрнутая группа «Готово (актуально)» — прогресс виден, но не мешает. «Не переносим» на доску
 * не тащим (это решение, а не работа) — они остаются на карте.
 */
export function migrationToBoard(rows: MasterModule[]): MigrationBoard {
  const board: Board = { id: MIGRATION_BOARD_ID, name: 'Переезд модулей', color: '#8a63d8' } as Board;

  const groups: Group[] = [];
  for (let wave = 1; wave <= 7; wave++) {
    const tasks = rows
      .filter((m) => m.masterWave === wave)
      .sort((a, b) => b.score - a.score || b.need - a.need || a.id - b.id)
      .map(taskOf);
    groups.push({
      id: `g_mig_w${wave}`,
      name: WAVE_INFO[wave].label,
      color: WAVE_COLORS[wave],
      tasks,
      boardId: MIGRATION_BOARD_ID,
    } as Group);
  }

  const doneTasks = rows
    .filter((m) => m.masterWave === 9 && m.bucket === 'Готово')
    .sort((a, b) => b.need - a.need || a.id - b.id)
    .map(taskOf);
  const doneGroupId = 'g_mig_done';
  groups.push({
    id: doneGroupId,
    name: '✅ Готово (актуально)',
    color: '#4a9b7f',
    tasks: doneTasks,
    boardId: MIGRATION_BOARD_ID,
  } as Group);

  return { board, groups, collapsedGroupIds: [doneGroupId] };
}

// ---------------------------------------------------------------------------
// Новинки-догоняшки → доска: группы по критичности, закрытые — свёрнутым архивом.

const CRIT_GROUPS: { key: string; id: string; name: string; color: string }[] = [
  { key: '🔴', id: 'g_nov_crit', name: '🔴 Критично', color: '#cf6b6b' },
  { key: '🟠', id: 'g_nov_major', name: '🟠 Существенно', color: '#d9812f' },
  { key: '🟡', id: 'g_nov_normal', name: '🟡 Обычное', color: '#d9a441' },
  { key: '⚪', id: 'g_nov_low', name: '⚪ Низкое', color: '#8a8f98' },
];

export const noveltyTaskId = (bac: string) => `nov_${bac}`;

function noveltyTaskOf(n: NoveltyRow, moduleNames: Map<number, string>): Task {
  const mods = n.modules.map((id) => moduleNames.get(id) ?? String(id)).join(', ');
  const st = n.state.toLowerCase();
  const status: Task['status'] =
    st.includes('готово') || st.includes('выложен') || st.includes('отмен')
      ? 'done' // закрыта (влита или отменена)
      : st.includes('работ') || st.includes('тестир') || st.includes('аналит') || st.includes('заливк')
        ? 'work'
        : 'plan'; // Новая / пусто / ожидает
  return {
    id: noveltyTaskId(n.bac),
    name: n.title,
    owner: null,
    status,
    due: null,
    priority: n.criticality.startsWith('🔴')
      ? 'crit'
      : n.criticality.startsWith('🟠')
        ? 'high'
        : n.criticality.startsWith('🟡')
          ? 'mid'
          : 'low',
    tl: null,
    note: [n.changeType, mods ? `модули: ${mods}` : 'net-new'].filter(Boolean).join(' · '),
    lastBy: '',
    lastAgo: '',
    section: 'Новинки',
    type: 'feat',
    source: 'ours',
    ticketId: n.bac,
  } as Task;
}

/** Доска «Новинки (догоняшки)»: живые — по критичности, закрытые — свёрнутый архив. */
export function noveltiesToBoard(novelties: NoveltyRow[], rows: MasterModule[]): MigrationBoard {
  const board: Board = { id: NOVELTIES_BOARD_ID, name: 'Новинки (догоняшки)', color: '#d9812f' } as Board;
  const moduleNames = new Map(rows.map((m) => [m.id, m.name]));

  const groups: Group[] = CRIT_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    tasks: novelties
      .filter((n) => isNoveltyPending(n) && (n.criticality.startsWith(g.key) || (g.key === '🟡' && !n.criticality)))
      .map((n) => noveltyTaskOf(n, moduleNames)),
    boardId: NOVELTIES_BOARD_ID,
  })) as Group[];

  const closedId = 'g_nov_closed';
  groups.push({
    id: closedId,
    name: '✅ Закрытые (влиты/отменены)',
    color: '#4a9b7f',
    tasks: novelties.filter((n) => !isNoveltyPending(n)).map((n) => noveltyTaskOf(n, moduleNames)),
    boardId: NOVELTIES_BOARD_ID,
  } as Group);

  return { board, groups, collapsedGroupIds: [closedId] };
}

// ---------------------------------------------------------------------------
// Эпики → доска «Эпики (отчёты)»: эпик = задача с ПОДЗАДАЧАМИ (дети BAC), группы = разделы
// админки. Прогресс-бейдж (n/N) доска агрегирует сама из статусов подзадач.

export const epicTaskId = (key: string) => `epic_${key}`;

const sectionSlug = (section: string) =>
  'g_epic_' +
  (section || 'прочее')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

function epicStatus(stage: string): Task['status'] {
  const s = stage.toLowerCase();
  if (s.includes('катить') || s.includes('готово')) return 'done';
  if (s.includes('аналит') || s.includes('разработ') || s.includes('тест') || s.includes('залив')) {
    return 'work';
  }
  return 'plan';
}

function childStatus(stage: string): Sub['status'] {
  const s = stage.toLowerCase();
  if (s.includes('готово') || s.includes('отмен')) return 'done';
  if (s.includes('работ') || s.includes('тест') || s.includes('аналит') || s.includes('залив')) {
    return 'work';
  }
  if (s.includes('ожида')) return 'stuck';
  return 'plan'; // 🆕 новая / пусто
}

function epicTaskOf(e: EpicRow): Task {
  const note = [
    `задач: ${e.taskCount}`,
    `модулей: ${e.modules}`,
    e.ice ? `Σ ICE: ${e.ice}` : null,
    e.novelties ? `новинок: ${e.novelties}` : null,
    e.team ? `команда: ${e.team}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: epicTaskId(e.key),
    name: `${e.key} · ${e.report}`,
    owner: null,
    status: epicStatus(e.stage),
    due: null,
    priority: null,
    tl: null,
    note,
    lastBy: '',
    lastAgo: '',
    section: e.section || 'Прочее',
    type: 'mig',
    source: 'ours',
    subs: e.children.map(
      (c): Sub => ({
        id: `sub_${e.key}_${c.bac}`,
        name: `${c.bac} · ${c.title}`,
        owner: null,
        status: childStatus(c.stage),
        due: null,
      }),
    ),
  } as Task;
}

/** Доска «Эпики (отчёты)»: группы = разделы админки, эпики внутри — по Σ ICE (жирные вперёд). */
export function epicsToBoard(epics: EpicRow[]): MigrationBoard {
  const board: Board = { id: EPICS_BOARD_ID, name: 'Эпики (отчёты)', color: '#2e9e83' } as Board;

  const sectionOrder: string[] = [];
  const bySection = new Map<string, EpicRow[]>();
  for (const e of epics) {
    const section = e.section && e.section !== '—' ? e.section : 'Прочее';
    if (!bySection.has(section)) {
      bySection.set(section, []);
      sectionOrder.push(section);
    }
    bySection.get(section)!.push(e);
  }

  const groups: Group[] = sectionOrder.map((section) => ({
    id: sectionSlug(section),
    name: section,
    color: '#2e9e83',
    tasks: bySection
      .get(section)!
      .slice()
      .sort((a, b) => b.ice - a.ice || a.key.localeCompare(b.key))
      .map(epicTaskOf),
    boardId: EPICS_BOARD_ID,
  })) as Group[];

  return { board, groups, collapsedGroupIds: [] };
}
