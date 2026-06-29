// Domain model + reference data + demo seed, ported 1:1 from the designer prototype
// (Ultra Board.dc.html — class Component). The prototype is the source of truth.

export type StatusKey = 'work' | 'done' | 'stuck' | 'plan';
export type PrioKey = 'crit' | 'high' | 'mid' | 'low';
export type TypeKey = 'mig' | 'feat' | 'bug';
export type SourceKey = 'ours' | 'contour';
export type PhaseKey = 'analysis' | 'dev' | 'test';
export type ParityKey = 'none' | 'work' | 'done' | 'skip';
export type ColType =
  | 'text'
  | 'number'
  | 'status'
  | 'date'
  | 'check'
  | 'people';

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  role: string;
  lastActive: string;
  active: boolean;
}

export interface PhaseSpec {
  days: number;
  res: string | null;
}
export type Phases = Record<PhaseKey, PhaseSpec>;
export interface Anchor {
  type: 'start' | 'end';
  date: string;
}
export interface Sub {
  id: string;
  name: string;
  owner: string | null;
  status: StatusKey;
  due: string | null;
}
export interface Timeline {
  start: string;
  end: string;
}
export interface Task {
  id: string;
  name: string;
  owner: string | null;
  status: StatusKey;
  due: string | null;
  priority: PrioKey | null;
  tl: Timeline | null;
  note: string;
  lastBy: string;
  lastAgo: string;
  section: string;
  type: TypeKey;
  source: SourceKey;
  phases?: Phases;
  anchor?: Anchor;
  subs?: Sub[];
}
export interface Group {
  id: string;
  name: string;
  color: string;
  /** Which board this group belongs to (groups are scoped per board). */
  boardId: string;
  tasks: Task[];
}
export interface Board {
  id: string;
  name: string;
  color: string;
}
export interface CustomCol {
  id: string;
  label: string;
  type: ColType;
}
export type Parity = Record<string, Record<string, ParityKey>>;

export interface Cfg {
  ytrackUrl: string;
  ytrackToken: string;
  ytrackProject: string;
  webhookUrl: string;
  syncInterval: string;
  smtpHost: string;
  smtpPort: string;
  fromEmail: string;
  digestTime: string;
}

// Mapping rule: how a source value maps to a board field value (settings §5.12).
export interface MappingRule {
  id: string;
  field: string;
  src: string;
  cond: string;
  to: string;
  color: string;
}

// ---- calendar / window constants ----
export const MONTHS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];
export const MONTHS_FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
export const DOWS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const TODAY = '2026-06-28';
export const WIN_START = '2026-06-15';
export const WIN_END = '2026-07-19';

// ---- palettes / reference tables ----
export const STATUS: Record<StatusKey, { label: string; bg: string }> = {
  work: { label: 'В работе', bg: '#cf9248' },
  done: { label: 'Готово', bg: '#4a9b7f' },
  stuck: { label: 'Застряли', bg: '#cf6b6b' },
  plan: { label: 'План', bg: 'var(--text-faint)' },
};
export const STATUS_ORDER: StatusKey[] = ['done', 'work', 'stuck', 'plan'];

export const PRIO: Record<PrioKey, { label: string; bg: string }> = {
  crit: { label: 'Критичный', bg: '#cf6b6b' },
  high: { label: 'Высокий', bg: '#4e5499' },
  mid: { label: 'Средний', bg: '#7d83c4' },
  low: { label: 'Низкий', bg: 'var(--text-faint)' },
};
export const PRIO_ORDER: PrioKey[] = ['crit', 'high', 'mid', 'low'];

export const TYPE: Record<TypeKey, { label: string; bg: string }> = {
  mig: { label: 'миграция', bg: '#7d83c4' },
  feat: { label: 'фича', bg: '#4a9b7f' },
  bug: { label: 'баг', bg: '#cf6b6b' },
};
export const TYPE_ORDER: TypeKey[] = ['mig', 'feat', 'bug'];

export const SOURCE: Record<SourceKey, { label: string; bg: string }> = {
  ours: { label: 'наша БД', bg: '#3fa8a0' },
  contour: { label: 'контур БД', bg: 'var(--text-soft)' },
};
export const SOURCE_ORDER: SourceKey[] = ['ours', 'contour'];

// ---- editable label registry (status / priority / type / source) ----
// These four pill-fields are user-editable (rename, recolor, add, remove) via the
// picker editor. The hardcoded STATUS/PRIO/TYPE/SOURCE maps above remain the DEFAULTS;
// the live values live in the board store (`labels`, synced via /prefs). Every render
// site looks a value up through `findLabel` so unknown/added keys resolve gracefully.
export type LabelField = 'status' | 'priority' | 'type' | 'source';
export interface LabelDef {
  key: string;
  label: string;
  bg: string;
}

export const DEFAULT_LABELS: Record<LabelField, LabelDef[]> = {
  status: STATUS_ORDER.map((k) => ({ key: k, label: STATUS[k].label, bg: STATUS[k].bg })),
  priority: PRIO_ORDER.map((k) => ({ key: k, label: PRIO[k].label, bg: PRIO[k].bg })),
  type: TYPE_ORDER.map((k) => ({ key: k, label: TYPE[k].label, bg: TYPE[k].bg })),
  source: SOURCE_ORDER.map((k) => ({ key: k, label: SOURCE[k].label, bg: SOURCE[k].bg })),
};

// Preset swatches offered by the color picker (the design palette + the two neutral tokens).
export const LABEL_PALETTE: string[] = [
  '#cf6b6b',
  '#cf9248',
  '#d6953f',
  '#4a9b7f',
  '#3fa8a0',
  '#4263d8',
  '#4e5499',
  '#5b8def',
  '#7d83c4',
  '#8b6fd6',
  '#6b9b4a',
  'var(--text-faint)',
];

// Resolve a stored key (status/priority/…) against the live label set, with a neutral
// fallback so a value whose label was deleted still renders (shows the raw key).
export function findLabel(
  defs: LabelDef[] | undefined,
  key: string | null | undefined,
): LabelDef {
  const d = defs?.find((l) => l.key === key);
  // Unresolved key (e.g. a label deleted on another tab) → neutral placeholder; never
  // surface the raw internal key in the UI.
  return d ?? { key: key ?? '', label: '—', bg: 'var(--text-faint)' };
}

// Fill any missing/empty field from the defaults — used when hydrating a fresh /prefs
// row (LabelsJson defaults to "{}") so the pickers are never empty.
export function normalizeLabels(
  raw: Partial<Record<LabelField, LabelDef[]>> | null | undefined,
): Record<LabelField, LabelDef[]> {
  const fields: LabelField[] = ['status', 'priority', 'type', 'source'];
  const out = {} as Record<LabelField, LabelDef[]>;
  for (const f of fields) {
    const arr = raw?.[f];
    out[f] =
      Array.isArray(arr) && arr.length
        ? arr.map((l) => ({ key: l.key, label: l.label, bg: l.bg }))
        : DEFAULT_LABELS[f].map((l) => ({ ...l }));
  }
  return out;
}

// Live registry mirror for the non-React derivation modules (derive.ts, timeline.ts)
// which compute outside a component and can't read the zustand store. The board store
// calls setLiveLabels on init / hydrate / every label edit to keep this in sync.
// React components should instead read `labels` from the store (reactive) + findLabel.
let LIVE_LABELS: Record<LabelField, LabelDef[]> = normalizeLabels(null);
export function setLiveLabels(l: Record<LabelField, LabelDef[]>): void {
  LIVE_LABELS = l;
}
export function labelsOf(field: LabelField): LabelDef[] {
  return LIVE_LABELS[field];
}
export function labelOf(
  field: LabelField,
  key: string | null | undefined,
): LabelDef {
  return findLabel(LIVE_LABELS[field], key);
}

export const PHASES: Record<PhaseKey, { label: string; color: string }> = {
  analysis: { label: 'Аналитика', color: '#7d83c4' },
  dev: { label: 'Разработка', color: '#5b8def' },
  test: { label: 'Тестирование', color: '#d6953f' },
};
export const PHASE_ORDER: PhaseKey[] = ['analysis', 'dev', 'test'];

export const SECTIONS = [
  'Обращения',
  'Клиенты',
  'Отчётность',
  'Справочники',
  'SLA',
  'Интеграции',
  'Безопасность',
  'Качество',
];

export const PEOPLE: Person[] = [
  {
    id: 'p1',
    name: 'Анна Котова',
    initials: 'АК',
    color: '#5b8def',
    email: 'a.kotova@work.app',
    role: 'Админ',
    lastActive: '2 мин назад',
    active: true,
  },
  {
    id: 'p2',
    name: 'Дмитрий Морозов',
    initials: 'ДМ',
    color: '#8b6fd6',
    email: 'd.morozov@work.app',
    role: 'Участник',
    lastActive: '15 мин назад',
    active: true,
  },
  {
    id: 'p3',
    name: 'Елена Волкова',
    initials: 'ЕВ',
    color: '#3fa8a0',
    email: 'e.volkova@work.app',
    role: 'Участник',
    lastActive: '1 ч назад',
    active: true,
  },
  {
    id: 'p4',
    name: 'Сергей Павлов',
    initials: 'СП',
    color: '#d6953f',
    email: 's.pavlov@work.app',
    role: 'Участник',
    lastActive: '40 мин назад',
    active: true,
  },
  {
    id: 'p5',
    name: 'Игорь Романов',
    initials: 'ИР',
    color: '#cf6b6b',
    email: 'i.romanov@work.app',
    role: 'Наблюдатель',
    lastActive: '3 ч назад',
    active: true,
  },
  {
    id: 'p6',
    name: 'Ольга Зайцева',
    initials: 'ОЗ',
    color: '#6b9b4a',
    email: 'o.zaytseva@partner.io',
    role: 'Гость',
    lastActive: 'вчера',
    active: true,
  },
  {
    id: 'p7',
    name: 'Павел Лебедев',
    initials: 'ПЛ',
    color: 'var(--text-faint)',
    email: 'p.lebedev@work.app',
    role: 'Участник',
    lastActive: '2 недели назад',
    active: false,
  },
];

export const ROLES = ['Админ', 'Участник', 'Наблюдатель', 'Гость'];
export const ROLE_COLORS: Record<string, string> = {
  Админ: '#7d83c4',
  Участник: '#5b8def',
  Наблюдатель: '#3fa8a0',
  Гость: 'var(--text-faint)',
};

export const PARITY_COLS = [
  'Чтение',
  'CRUD',
  'Экспорт',
  'Права',
  'Отчёты',
  'API',
];
export const PARITY_ORDER: ParityKey[] = ['none', 'work', 'done', 'skip'];
export const PARITY_STATES: Record<
  ParityKey,
  { label: string; color: string }
> = {
  none: { label: 'нет', color: 'var(--line)' },
  work: { label: 'в работе', color: '#cf9248' },
  done: { label: 'готово', color: '#4a9b7f' },
  skip: { label: 'не переносим', color: 'var(--surf-2)' },
};
export const PARITY_DIVERGED: Record<string, string> = {
  g2: 'Права',
  g1: 'Отчёты',
};

export const COL_TYPES: {
  key: ColType;
  label: string;
  sub: string;
  d: string;
}[] = [
  {
    key: 'text',
    label: 'Текст',
    sub: 'Свободный ввод',
    d: 'M4 7h16M4 12h10M4 17h7',
  },
  {
    key: 'number',
    label: 'Число',
    sub: 'Цифры, метрики',
    d: 'M6 4v16M14 4v16M4 9h16M4 15h16',
  },
  {
    key: 'status',
    label: 'Статус',
    sub: 'Цветная метка',
    d: 'M3 5h12l3 4-3 4H3z',
  },
  {
    key: 'date',
    label: 'Дата',
    sub: 'Календарь',
    d: 'M3 5h18v16H3zM3 9h18M8 3v4M16 3v4',
  },
  {
    key: 'people',
    label: 'Люди',
    sub: 'Ответственный',
    d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  { key: 'check', label: 'Чекбокс', sub: 'Да / нет', d: 'M5 12l5 5L20 6' },
];

// ---- table column metadata (shared by TableView, the column header menu, and the store) ----
export const BUILTIN_COL_KEYS = [
  'task',
  'owner',
  'status',
  'due',
  'priority',
  'tl',
  'note',
  'updated',
  'section',
  'type',
  'source',
];
export const BUILTIN_COL_LABEL: Record<string, string> = {
  task: 'Задача',
  owner: 'Владелец',
  status: 'Статус',
  due: 'Срок',
  priority: 'Приоритет',
  tl: 'Шкала времени',
  note: 'Примечания',
  updated: 'Обновлено',
  section: 'Раздел',
  type: 'Тип',
  source: 'Источник',
};
export const BUILTIN_COL_WIDTH: Record<string, number> = {
  task: 264,
  owner: 100,
  status: 138,
  due: 118,
  priority: 138,
  tl: 184,
  note: 172,
  updated: 132,
  section: 128,
  type: 116,
  source: 138,
};
// Columns that can be grouped-by (categorical — buildView supports these groupBy keys).
export const GROUPABLE_COLS = new Set([
  'status',
  'owner',
  'section',
  'priority',
  'type',
  'source',
]);

// Resolve the user's saved column order against the live column set (built-ins + custom ids): saved
// order first (dropping removed columns), then any columns not yet in it appended in natural order.
export function resolveColOrder(
  savedOrder: string[],
  customIds: string[],
): string[] {
  const all = [...BUILTIN_COL_KEYS, ...customIds];
  return [
    ...savedOrder.filter((k) => all.includes(k)),
    ...all.filter((k) => !savedOrder.includes(k)),
  ];
}

export const CUSTOM_STATES = [
  { label: 'Не начато', color: 'var(--text-faint)' },
  { label: 'В работе', color: '#cf9248' },
  { label: 'На проверке', color: '#7d83c4' },
  { label: 'Готово', color: '#4a9b7f' },
];

export const COACH = [
  {
    title: 'Командная палитра',
    body: 'Нажмите ⌘K (Ctrl+K) — мгновенный переход к любой задаче, виду или роли.',
    x: '50%',
    y: '44%',
    right: 'auto',
  },
  {
    title: 'Виды доски',
    body: 'Таблица, Таймлайн с фазами, Канбан, Календарь, Паритет-матрица, «Что горит» и Импорт — переключаются здесь.',
    x: '150px',
    y: '160px',
    right: 'auto',
  },
  {
    title: 'Роли и режим просмотра',
    body: 'Переключатель «Участник / Наблюдатель» включает настоящий read-only для демонстрации витрины бизнесу.',
    x: 'auto',
    y: '66px',
    right: '250px',
  },
  {
    title: 'Тёмная тема',
    body: 'Клавиша D — стеклянный интерфейс в тёмном. Удобно для дашборда на ТВ-панели.',
    x: 'auto',
    y: '66px',
    right: '150px',
  },
];

// ---- demo seed (matches the prototype's initial state) ----
export const initialGroups: Group[] = [
  {
    id: 'g1',
    name: 'Саппорт',
    color: '#5b8def',
    boardId: 'b1',
    tasks: [
      {
        id: 't1',
        name: 'Перенос тикетов саппорта на Work',
        owner: 'p1',
        status: 'work',
        due: '2026-06-29',
        priority: 'high',
        tl: { start: '2026-06-20', end: '2026-06-30' },
        note: 'ETL батчами по 50к',
        lastBy: 'p2',
        lastAgo: '32 мин',
        section: 'Обращения',
        type: 'mig',
        source: 'ours',
        phases: {
          analysis: { days: 3, res: 'p3' },
          dev: { days: 5, res: 'p4' },
          test: { days: 3, res: 'p3' },
        },
        anchor: { type: 'start', date: '2026-06-20' },
        subs: [
          {
            id: 's1a',
            name: 'Бэкенд: экспорт тикетов из старой системы',
            owner: 'p4',
            status: 'work',
            due: '2026-06-27',
          },
          {
            id: 's1b',
            name: 'Фронт: экран импорта',
            owner: 'p2',
            status: 'done',
            due: '2026-06-24',
          },
          {
            id: 's1c',
            name: 'Парити-тест выгрузки',
            owner: 'p3',
            status: 'plan',
            due: '2026-06-29',
          },
        ],
      },
      {
        id: 't2',
        name: 'Маппинг статусов обращений',
        owner: 'p2',
        status: 'done',
        due: '2026-06-22',
        priority: 'mid',
        tl: { start: '2026-06-16', end: '2026-06-22' },
        note: '12 статусов сведены',
        lastBy: 'p1',
        lastAgo: '2 ч',
        section: 'Обращения',
        type: 'mig',
        source: 'ours',
      },
      {
        id: 't3',
        name: 'Настройка SLA-таймеров',
        owner: 'p3',
        status: 'stuck',
        due: '2026-06-25',
        priority: 'crit',
        tl: { start: '2026-06-23', end: '2026-07-02' },
        note: 'ждём доступ к API',
        lastBy: 'p3',
        lastAgo: '1 д',
        section: 'SLA',
        type: 'feat',
        source: 'contour',
      },
    ],
  },
  {
    id: 'g2',
    name: 'Разработка',
    color: '#8b6fd6',
    boardId: 'b1',
    tasks: [
      {
        id: 't4',
        name: 'Синк с YouTrack: обращения',
        owner: 'p4',
        status: 'work',
        due: '2026-07-03',
        priority: 'high',
        tl: { start: '2026-06-24', end: '2026-07-05' },
        note: 'webhooks + обратный поток',
        lastBy: 'p4',
        lastAgo: '15 мин',
        section: 'Интеграции',
        type: 'feat',
        source: 'contour',
        phases: {
          analysis: { days: 4, res: 'p1' },
          dev: { days: 6, res: 'p4' },
          test: { days: 2, res: 'p3' },
        },
        anchor: { type: 'start', date: '2026-06-24' },
      },
      {
        id: 't5',
        name: 'Импорт базы клиентов',
        owner: 'p5',
        status: 'work',
        due: '2026-07-01',
        priority: 'high',
        tl: { start: '2026-06-22', end: '2026-07-01' },
        note: '1.2M записей',
        lastBy: 'p5',
        lastAgo: '40 мин',
        section: 'Клиенты',
        type: 'mig',
        source: 'ours',
        phases: {
          analysis: { days: 3, res: 'p1' },
          dev: { days: 5, res: 'p5' },
          test: { days: 2, res: 'p3' },
        },
        anchor: { type: 'start', date: '2026-06-22' },
        subs: [
          {
            id: 's5a',
            name: 'Бэкенд: ETL клиентов',
            owner: 'p5',
            status: 'work',
            due: '2026-06-30',
          },
          {
            id: 's5b',
            name: 'Парити-тест по 1% выборке',
            owner: 'p3',
            status: 'plan',
            due: '2026-07-01',
          },
        ],
      },
      {
        id: 't6',
        name: 'Миграция справочников ролей',
        owner: 'p1',
        status: 'done',
        due: '2026-06-20',
        priority: 'mid',
        tl: { start: '2026-06-15', end: '2026-06-20' },
        note: '',
        lastBy: 'p2',
        lastAgo: '3 д',
        section: 'Справочники',
        type: 'mig',
        source: 'ours',
      },
      {
        id: 't7',
        name: 'Рефактор слоя авторизации',
        owner: 'p4',
        status: 'plan',
        due: null,
        priority: 'low',
        tl: null,
        note: 'после миграции',
        lastBy: 'p4',
        lastAgo: '5 д',
        section: 'Безопасность',
        type: 'feat',
        source: 'ours',
      },
    ],
  },
  {
    id: 'g3',
    name: 'Аналитика',
    color: '#3fa8a0',
    boardId: 'b1',
    tasks: [
      {
        id: 't8',
        name: 'Перенос дашбордов отчётности',
        owner: 'p3',
        status: 'work',
        due: '2026-07-08',
        priority: 'mid',
        tl: { start: '2026-07-01', end: '2026-07-10' },
        note: '6 дашбордов',
        lastBy: 'p3',
        lastAgo: '1 ч',
        section: 'Отчётность',
        type: 'mig',
        source: 'ours',
        phases: {
          analysis: { days: 2, res: 'p1' },
          dev: { days: 6, res: 'p3' },
          test: { days: 2, res: 'p2' },
        },
        anchor: { type: 'start', date: '2026-07-01' },
        subs: [
          {
            id: 's8a',
            name: 'Маппинг метрик',
            owner: 'p1',
            status: 'done',
            due: '2026-07-03',
          },
          {
            id: 's8b',
            name: 'Пересборка 6 дашбордов',
            owner: 'p3',
            status: 'work',
            due: '2026-07-09',
          },
          {
            id: 's8c',
            name: 'Сверка с эталоном',
            owner: 'p2',
            status: 'plan',
            due: '2026-07-10',
          },
        ],
      },
      {
        id: 't9',
        name: 'Сверка escaped defects',
        owner: 'p2',
        status: 'plan',
        due: '2026-07-12',
        priority: 'mid',
        tl: { start: '2026-07-08', end: '2026-07-14' },
        note: '',
        lastBy: 'p2',
        lastAgo: '2 д',
        section: 'Качество',
        type: 'bug',
        source: 'contour',
      },
      {
        id: 't10',
        name: 'Расчёт hit-rate витрины',
        owner: 'p1',
        status: 'work',
        due: '2026-07-05',
        priority: 'low',
        tl: { start: '2026-06-30', end: '2026-07-06' },
        note: '',
        lastBy: 'p1',
        lastAgo: '6 ч',
        section: 'Отчётность',
        type: 'feat',
        source: 'ours',
      },
    ],
  },
  {
    id: 'g4',
    name: 'QA / Тестирование',
    color: '#d6953f',
    boardId: 'b1',
    tasks: [
      {
        id: 't11',
        name: 'Регресс после импорта клиентов',
        owner: 'p5',
        status: 'stuck',
        due: '2026-07-02',
        priority: 'crit',
        tl: { start: '2026-06-30', end: '2026-07-04' },
        note: 'блокер импорта',
        lastBy: 'p5',
        lastAgo: '20 мин',
        section: 'Клиенты',
        type: 'bug',
        source: 'ours',
      },
      {
        id: 't12',
        name: 'Тест синка статусов',
        owner: 'p4',
        status: 'plan',
        due: '2026-07-06',
        priority: 'high',
        tl: { start: '2026-07-03', end: '2026-07-07' },
        note: '',
        lastBy: 'p4',
        lastAgo: '1 д',
        section: 'Интеграции',
        type: 'bug',
        source: 'contour',
      },
      {
        id: 't13',
        name: 'Приёмка SLA-таймеров',
        owner: 'p3',
        status: 'plan',
        due: null,
        priority: 'mid',
        tl: null,
        note: 'ждёт SLA',
        lastBy: 'p3',
        lastAgo: '4 д',
        section: 'SLA',
        type: 'feat',
        source: 'contour',
      },
    ],
  },
];

export const initialParity: Parity = {
  g1: {
    Чтение: 'done',
    CRUD: 'done',
    Экспорт: 'work',
    Права: 'done',
    Отчёты: 'work',
    API: 'none',
  },
  g2: {
    Чтение: 'done',
    CRUD: 'work',
    Экспорт: 'work',
    Права: 'done',
    Отчёты: 'none',
    API: 'work',
  },
  g3: {
    Чтение: 'done',
    CRUD: 'done',
    Экспорт: 'done',
    Права: 'done',
    Отчёты: 'work',
    API: 'skip',
  },
  g4: {
    Чтение: 'done',
    CRUD: 'work',
    Экспорт: 'none',
    Права: 'work',
    Отчёты: 'none',
    API: 'skip',
  },
};

export const initialBoards: Board[] = [
  { id: 'b1', name: 'Переезд на Work', color: '#4263d8' },
  { id: 'b2', name: 'Спринты Work', color: '#c9b46b' },
  { id: 'b3', name: 'Бэклог', color: '#9b8fd1' },
];

// Seed mapping rules — the three examples from the brief (§5.12).
export const initialMappingRules: MappingRule[] = [
  {
    id: 'mr1',
    field: 'Статус',
    src: 'State (YouTrack)',
    cond: 'Fixed, Verified',
    to: 'Готово',
    color: '#4a9b7f',
  },
  {
    id: 'mr2',
    field: 'Приоритет',
    src: 'Priority',
    cond: 'Critical',
    to: 'Критичный',
    color: '#cf6b6b',
  },
  {
    id: 'mr3',
    field: '% выполнения',
    src: 'Поле «Прогресс»',
    cond: '0–100',
    to: 'Прогресс-бар',
    color: '#4263d8',
  },
];

export const initialCfg: Cfg = {
  ytrackUrl: 'https://youtrack.work.app',
  ytrackToken: 'perm:a1b2-c3d4-e5f6-token',
  ytrackProject: 'XRM',
  webhookUrl: 'https://work.app/api/hooks/youtrack',
  syncInterval: '5',
  smtpHost: 'smtp.work.app',
  smtpPort: '587',
  fromEmail: 'noreply@work.app',
  digestTime: '09:00',
};

// ---- date utils (ported 1:1) ----
export const dayNum = (iso: string): number =>
  Math.round(new Date(iso + 'T00:00:00Z').getTime() / 86400000);
export const fmt = (iso: string | null): string => {
  if (!iso) return '';
  const p = iso.split('-');
  return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1];
};
export const iso = (y: number, m0: number, d: number): string => {
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return y + '-' + p(m0 + 1) + '-' + p(d);
};
export const pct = (isoDate: string): number => {
  const a = dayNum(WIN_START);
  const b = dayNum(WIN_END);
  const v = dayNum(isoDate);
  return Math.max(0, Math.min(100, ((v - a) / (b - a)) * 100));
};
// Position of a date within an arbitrary [ws, we] day-window (0–100%), for board-relative gantt
// bars (the table mini-timeline shares the Таймлайн's dynamic window instead of the fixed one).
export const pctIn = (isoDate: string, ws: number, we: number): number => {
  if (we <= ws) return 0;
  const v = dayNum(isoDate);
  return Math.max(0, Math.min(100, ((v - ws) / (we - ws)) * 100));
};
export const isoFromDate = (dt: Date): string =>
  iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
export const shiftIso = (isoDate: string, dd: number): string =>
  isoFromDate(new Date((dayNum(isoDate) + dd) * 86400000));
export const lighten = (hex: string): string => {
  // token-safe: a CSS var (e.g. a theme token) can't be byte-parsed — return as-is.
  if (!hex.startsWith('#')) return hex;
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  const f = 0.28;
  const L = (v: number) => Math.round(v + (255 - v) * f);
  const h = (v: number) => ('0' + L(v).toString(16)).slice(-2);
  return '#' + h(r) + h(g) + h(b);
};

export const personById = (id: string | null): Person | undefined =>
  id ? PEOPLE.find((p) => p.id === id) : undefined;
