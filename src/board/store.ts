import { create } from 'zustand';
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware';
import {
  type Anchor,
  type Board,
  type Cfg,
  type ColType,
  type CustomCol,
  type Group,
  type LabelDef,
  type LabelField,
  type MappingRule,
  type Parity,
  type ParityKey,
  type Person,
  type PhaseKey,
  type Phases,
  type Sub,
  type Task,
  COACH,
  LABEL_PALETTE,
  PARITY_ORDER,
  PEOPLE,
  ROLES,
  TODAY,
  dayNum,
  normalizeLabels,
  resolveColOrder,
  setLiveLabels,
  initialBoards,
  initialCfg,
  initialGroups,
  initialMappingRules,
  initialParity,
  shiftIso,
} from './model';
import { computePhases } from './phases';

export interface UserOverride {
  role?: string;
  active?: boolean;
}

export type Screen = 'board' | 'dashboard' | 'users' | 'migration' | 'tickets';
export type BoardTab =
  | 'table'
  | 'timeline'
  | 'parity'
  | 'alerts'
  | 'import'
  | 'calendar';
export type SettingsTab =
  | 'integrations'
  | 'sync'
  | 'mapping'
  | 'access'
  | 'appearance';

export interface PopupState {
  kind: string;
  taskId?: string;
  field?: string;
  subId?: string;
  x: number;
  y: number;
}
export interface ToolMenu {
  kind: 'filter' | 'sort' | 'group';
  x: number;
  y: number;
}
export interface CtxMenu {
  taskId: string;
  x: number;
  y: number;
}
export interface HeaderMenu {
  key: string;
  x: number;
  y: number;
  custom: boolean;
  rename?: boolean;
}
export interface AddColMenu {
  x: number;
  y: number;
}
export interface TlDrag {
  id: string;
  dd: number;
}
export interface CalMonth {
  y: number;
  m0: number;
}
export interface Toast {
  id: string;
  text: string;
  undo?: () => void;
}
// Ephemeral drag-and-drop state (brief §5.8) — never persisted.
export interface RowDrag {
  id: string;
}
export interface DropTarget {
  groupId: string;
  taskId: string;
  before: boolean;
}
export interface GroupDrag {
  id: string;
}

interface BoardState {
  // ---- persisted ----
  groups: Group[];
  collapsed: Record<string, boolean>;
  boards: Board[];
  activeBoardId: string;
  customCols: CustomCol[];
  colValues: Record<string, unknown>;
  colLabels: Record<string, string>;
  // Editable pill-label sets for status/priority/type/source (shared via /prefs).
  labels: Record<LabelField, LabelDef[]>;
  // Backend optimistic-concurrency counter for /prefs (server-managed, not persisted locally).
  prefsVersion: number;
  /** /board optimistic-concurrency version (server-managed, never persisted) — see prefsVersion. */
  boardVersion: number;
  // Per-column widths (px) keyed by column key; missing → the column's default width.
  colWidths: Record<string, number>;
  // Explicit column order (column keys). Reconciled at render against the live column set,
  // so it can be partial/stale; missing columns fall back to the default order.
  colOrder: string[];
  // Per-column UI flags (keyed by column key) — column header menu (§5.10):
  colWrap: Record<string, boolean>; // wrap cell text instead of ellipsis
  colHidden: Record<string, boolean>; // hidden from the table (built-in «Удалить» = hide)
  colCollapsed: Record<string, boolean>; // collapsed to a thin strip
  cfg: Cfg;
  integrations: { ytrack: boolean; email: boolean };
  autoSync: boolean;
  twoWay: boolean;
  guestLinks: boolean;
  dark: boolean;
  filterStatus: Record<string, boolean>;
  filterOwner: string | null;
  sortBy: string | null;
  sortDir: 'asc' | 'desc';
  groupBy: string;
  parity: Parity;
  mappingRules: MappingRule[];
  userOverrides: Record<string, UserOverride>;
  invites: Person[];

  // ---- ephemeral ----
  /** «Обращения»: сколько тикетов в статусе «новое» — бейдж в сайдбаре. */
  ticketsNewCount: number;
  authed: boolean;
  loginEmail: string;
  viewer: boolean;
  screen: Screen;
  boardTab: BoardTab;
  navOpen: boolean;
  settingsScreen: boolean;
  settingsTab: SettingsTab;
  inviteOpen: boolean;
  inviteEmail: string;
  inviteRole: string;
  query: string;
  selectedIds: Record<string, boolean>;
  expanded: Record<string, boolean>;
  popup: PopupState | null;
  panelId: string | null;
  toolMenu: ToolMenu | null;
  ctxMenu: CtxMenu | null;
  headerMenu: HeaderMenu | null;
  addColMenu: AddColMenu | null;
  addingSub: string | null;
  subDraft: string;
  cmdOpen: boolean;
  cmdQuery: string;
  cmdIdx: number;
  coachOpen: boolean;
  coachStep: number;
  toasts: Toast[];
  tlDrag: TlDrag | null;
  drag: RowDrag | null;
  dropTarget: DropTarget | null;
  groupDrag: GroupDrag | null;
  groupDropId: string | null;
  calMonth: CalMonth;
  importStep: number;
  importDone: boolean;
  importTemplate: boolean;
  importMap: Record<string, string>;

  // ---- actions ----
  hydrateBoard: (payload: {
    boards: Board[];
    groups: Group[];
    parity: Parity;
    version?: number;
  }) => void;
  setBoardVersion: (v: number) => void;
  hydratePrefs: (payload: {
    cfg: Cfg;
    integrations: { ytrack: boolean; email: boolean };
    autoSync: boolean;
    twoWay: boolean;
    guestLinks: boolean;
    mappingRules: MappingRule[];
    userOverrides: Record<string, UserOverride>;
    invites: Person[];
    customCols: CustomCol[];
    colValues: Record<string, unknown>;
    colLabels: Record<string, string>;
    labels?: Record<LabelField, LabelDef[]>;
    version?: number;
  }) => void;
  setPrefsVersion: (v: number) => void;
  setTicketsNewCount: (n: number) => void;
  /** «Карта переезда» → доска: upsert доски и групп-волн; задачи добавляются только
   * отсутствующие (правки пользователя не трогаем). Возвращает число добавленных. */
  importMigrationBoard: (payload: {
    board: Board;
    groups: Group[];
    collapsedGroupIds: string[];
  }) => number;
  login: () => void;
  setLoginEmail: (v: string) => void;
  toggleNav: () => void;
  setScreen: (s: Screen) => void;
  setBoardTab: (t: BoardTab) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsTab: (t: SettingsTab) => void;
  selectBoard: (id: string) => void;
  addBoard: () => void;
  setViewer: (v: boolean) => void;
  toggleDark: () => void;
  setCfg: (patch: Partial<Cfg>) => void;
  setIntegration: (k: 'ytrack' | 'email', v: boolean) => void;
  setFlag: (k: 'autoSync' | 'twoWay' | 'guestLinks', v: boolean) => void;
  addMappingRule: () => void;
  editMappingRule: (id: string, patch: Partial<MappingRule>) => void;
  removeMappingRule: (id: string) => void;
  cycleRole: (id: string) => void;
  toggleUserActive: (id: string) => void;
  openInvite: () => void;
  closeInvite: () => void;
  setInviteEmail: (v: string) => void;
  setInviteRole: (r: string) => void;
  sendInvite: (email: string, role: string) => void;
  setQuery: (v: string) => void;
  updateTask: (taskId: string, patch: Partial<Task>) => void;
  setDue: (taskId: string, due: string | null) => void;
  renameGroup: (groupId: string, name: string) => void;
  addLabel: (field: LabelField) => void;
  editLabel: (field: LabelField, key: string, patch: Partial<LabelDef>) => void;
  removeLabel: (field: LabelField, key: string) => void;
  initPhases: (taskId: string) => void;
  phaseEdit: (
    taskId: string,
    mutator: (phases: Phases, anchor: Anchor) => void,
  ) => void;
  phaseDays: (taskId: string, key: PhaseKey, delta: number) => void;
  phaseRes: (taskId: string, key: PhaseKey) => void;
  phaseAnchorType: (taskId: string, type: Anchor['type']) => void;
  phaseAnchorShift: (taskId: string, delta: number) => void;
  cycleParity: (gid: string, col: string) => void;
  setParity: (gid: string, col: string, value: ParityKey) => void;
  toggleCollapse: (gid: string) => void;
  toggleExpand: (taskId: string) => void;
  addColumn: (type: ColType, afterKey?: string) => void;
  setColValue: (taskId: string, colId: string, value: unknown) => void;
  setColLabel: (id: string, label: string) => void;
  setColType: (id: string, type: ColType) => void;
  duplicateColumn: (key: string) => void;
  deleteColumn: (id: string) => void;
  setColWidth: (key: string, width: number) => void;
  setColOrder: (order: string[]) => void;
  toggleColWrap: (key: string) => void;
  toggleColHidden: (key: string) => void;
  toggleColCollapse: (key: string) => void;
  sortColumn: (key: string, dir: 'asc' | 'desc') => void;
  openHeaderMenu: (key: string, custom: boolean, x: number, y: number) => void;
  closeHeaderMenu: () => void;
  openAddColMenu: (x: number, y: number) => void;
  closeAddColMenu: () => void;
  addSub: (taskId: string, name: string) => void;
  updateSub: (taskId: string, subId: string, patch: Partial<Sub>) => void;
  startAddSub: (taskId: string) => void;
  setSubDraft: (v: string) => void;
  cancelAddSub: () => void;
  toggleSelect: (taskId: string) => void;
  clearSelection: () => void;
  duplicateTasks: (ids: string[]) => void;
  deleteTasks: (ids: string[]) => void;
  setFilterStatus: (key: string) => void;
  setFilterOwner: (id: string | null) => void;
  clearFilters: () => void;
  setSort: (by: string) => void;
  setGroupBy: (by: string) => void;
  openPopup: (p: PopupState) => void;
  closePopup: () => void;
  openTool: (t: ToolMenu) => void;
  closeTool: () => void;
  openPanel: (id: string) => void;
  closePanel: () => void;
  openCtx: (m: CtxMenu) => void;
  closeCtx: () => void;
  createTaskBelow: (id: string) => void;
  archiveTask: (id: string) => void;
  openCmd: () => void;
  closeCmd: () => void;
  setCmdQuery: (v: string) => void;
  setCmdIdx: (i: number) => void;
  startCoach: () => void;
  coachNext: () => void;
  coachSkip: () => void;
  addToast: (text: string, undo?: () => void) => void;
  dismissToast: (id: string) => void;
  setTlDrag: (d: TlDrag | null) => void;
  dragStart: (id: string) => void;
  dragOver: (groupId: string, taskId: string, before: boolean) => void;
  dropRow: () => void;
  dragEnd: () => void;
  moveTask: (taskId: string, toGroupId: string, toIndex: number) => void;
  groupDragStart: (id: string) => void;
  groupDragOver: (id: string) => void;
  groupDrop: (targetId: string) => void;
  groupDragEnd: () => void;
  moveGroup: (id: string, dir: number) => void;
  addGroup: () => void;
  createTask: () => void;
  addTaskToGroup: (groupId: string) => void;
  setCalMonth: (m: CalMonth) => void;
  shiftCalMonth: (delta: number) => void;
  importNext: () => void;
  importBack: () => void;
  importRun: () => void;
  importReset: () => void;
  setImportField: (field: string, excel: string) => void;
  toggleImportTemplate: () => void;
}

const patchTask = (
  groups: Group[],
  taskId: string,
  patch: Partial<Task>,
): Group[] =>
  groups.map((g) => ({
    ...g,
    tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  }));

// Debounced localStorage — the default persist middleware serializes the WHOLE persisted
// blob synchronously on every mutation (each keystroke / drag tick / parity toggle). Batch
// writes to ~400ms and flush on tab-hide so the last edit is never lost.
const debouncedStorage: StateStorage = (() => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: [string, string] | null = null;
  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (pending) {
      localStorage.setItem(pending[0], pending[1]);
      pending = null;
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return {
    getItem: (name) => localStorage.getItem(name),
    setItem: (name, value) => {
      pending = [name, value];
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 400);
    },
    removeItem: (name) => {
      pending = null;
      localStorage.removeItem(name);
    },
  };
})();

// Stable, unique key for a newly added label within a field (c5, c6, …). Avoids
// Date.now()/random so persisted task values reference deterministic keys.
function freshLabelKey(defs: LabelDef[]): string {
  let n = defs.length + 1;
  const taken = (k: string) => defs.some((d) => d.key === k);
  while (taken(`c${n}`)) n++;
  return `c${n}`;
}

// Seed the label registry from the defaults and prime the live mirror (read by the
// non-React derivation modules) before the store exists.
const initialLabels = normalizeLabels(null);
setLiveLabels(initialLabels);

export const useBoard = create<BoardState>()(
  persist(
    (set, get) => ({
      groups: initialGroups,
      collapsed: {},
      boards: initialBoards,
      activeBoardId: 'b1',
      customCols: [],
      colValues: {},
      colLabels: {},
      labels: initialLabels,
      prefsVersion: 0,
      boardVersion: 0,
      ticketsNewCount: 0,
      colWidths: {},
      colOrder: [],
      colWrap: {},
      colHidden: {},
      colCollapsed: {},
      cfg: initialCfg,
      integrations: { ytrack: true, email: true },
      autoSync: true,
      twoWay: true,
      guestLinks: true,
      dark: false,
      filterStatus: {},
      filterOwner: null,
      sortBy: null,
      sortDir: 'asc',
      groupBy: 'role',
      parity: initialParity,
      mappingRules: initialMappingRules,
      userOverrides: {},
      invites: [],

      authed: false,
      loginEmail: '',
      viewer: false,
      screen: 'board',
      boardTab: 'table',
      navOpen: true,
      settingsScreen: false,
      settingsTab: 'integrations',
      inviteOpen: false,
      inviteEmail: '',
      inviteRole: 'Участник',
      query: '',
      selectedIds: {},
      expanded: {},
      popup: null,
      panelId: null,
      toolMenu: null,
      ctxMenu: null,
      headerMenu: null,
      addColMenu: null,
      addingSub: null,
      subDraft: '',
      cmdOpen: false,
      cmdQuery: '',
      cmdIdx: 0,
      coachOpen: false,
      coachStep: 0,
      toasts: [],
      tlDrag: null,
      drag: null,
      dropTarget: null,
      groupDrag: null,
      groupDropId: null,
      calMonth: { y: 2026, m0: 5 },
      importStep: 1,
      importDone: false,
      importTemplate: false,
      importMap: {},

      // Replace the board data with a payload from the backend (GET /board). Used only on
      // the VITE_USE_BACKEND path; keeps activeBoardId valid against the incoming boards.
      hydrateBoard: ({ boards, groups, parity, version }) =>
        set((s) => ({
          boards,
          groups,
          parity,
          ...(version !== undefined ? { boardVersion: version } : {}),
          activeBoardId: boards.some((b) => b.id === s.activeBoardId)
            ? s.activeBoardId
            : (boards[0]?.id ?? s.activeBoardId),
        })),
      // Replace the SHARED prefs slices with a payload from the backend (GET /prefs). Used only on
      // the VITE_USE_BACKEND path; the board (boards/groups/parity) and personal UI prefs are not
      // touched. A flat set() of all 11 slices, mirroring hydrateBoard.
      hydratePrefs: (payload) => {
        // A fresh /prefs row stores LabelsJson "{}" → normalize fills from defaults.
        const labels = normalizeLabels(payload.labels);
        setLiveLabels(labels);
        set({
          // Coalesce over defaults so a legacy /prefs row missing a cfg field (e.g. ytrackQuery,
          // added later) doesn't propagate null into the store and break the next save.
          cfg: {
            ...initialCfg,
            ...Object.fromEntries(
              Object.entries(payload.cfg).filter(([, v]) => v != null),
            ),
          } as Cfg,
          integrations: payload.integrations,
          autoSync: payload.autoSync,
          twoWay: payload.twoWay,
          guestLinks: payload.guestLinks,
          mappingRules: payload.mappingRules,
          userOverrides: payload.userOverrides,
          invites: payload.invites,
          customCols: payload.customCols,
          colValues: payload.colValues,
          colLabels: payload.colLabels,
          labels,
          prefsVersion: payload.version ?? 0,
        });
      },
      setPrefsVersion: (v) => set({ prefsVersion: v }),
      setBoardVersion: (v) => set({ boardVersion: v }),
      setTicketsNewCount: (n) => set({ ticketsNewCount: n }),
      importMigrationBoard: ({ board, groups, collapsedGroupIds }) => {
        let added = 0;
        set((s) => {
          const boards = s.boards.some((b) => b.id === board.id)
            ? s.boards.map((b) => (b.id === board.id ? { ...b, name: board.name, color: board.color } : b))
            : [...s.boards, board];

          const existingById = new Map(
            s.groups.filter((g) => (g.boardId ?? 'b1') === board.id).map((g) => [g.id, g]),
          );
          const presentTaskIds = new Set(
            s.groups
              .filter((g) => (g.boardId ?? 'b1') === board.id)
              .flatMap((g) => g.tasks.map((t) => t.id)),
          );

          const mergedNew = groups.map((incoming) => {
            const existing = existingById.get(incoming.id);
            if (!existing) {
              added += incoming.tasks.length;
              return incoming;
            }
            const fresh = incoming.tasks.filter((t) => !presentTaskIds.has(t.id));
            added += fresh.length;
            return { ...existing, name: incoming.name, color: incoming.color, tasks: [...existing.tasks, ...fresh] };
          });
          const others = s.groups.filter((g) => (g.boardId ?? 'b1') !== board.id);
          const collapsed = { ...s.collapsed };
          for (const gid of collapsedGroupIds) {
            if (!(gid in collapsed)) collapsed[gid] = true;
          }

          return {
            boards,
            groups: [...others, ...mergedNew],
            collapsed,
            activeBoardId: board.id,
            screen: 'board',
            boardTab: 'table',
            settingsScreen: false,
          };
        });
        return added;
      },
      login: () => set({ authed: true }),
      setLoginEmail: (v) => set({ loginEmail: v }),
      toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
      setScreen: (screen) => set({ screen, settingsScreen: false }),
      setBoardTab: (boardTab) =>
        set({ boardTab, screen: 'board', settingsScreen: false }),
      openSettings: () => set({ settingsScreen: true }),
      closeSettings: () => set({ settingsScreen: false }),
      setSettingsTab: (settingsTab) => set({ settingsTab }),
      selectBoard: (activeBoardId) => set({ activeBoardId }),
      addBoard: () =>
        set((s) => {
          const palette = [
            '#4263d8',
            '#c9b46b',
            '#9b8fd1',
            '#3fa8a0',
            '#cf6b6b',
            '#5b8def',
          ];
          const id = 'b' + (s.boards.length + 1);
          const board: Board = {
            id,
            name: 'Новая доска',
            color: palette[s.boards.length % palette.length],
          };
          return { boards: [...s.boards, board], activeBoardId: id };
        }),
      setViewer: (viewer) => set({ viewer }),
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      setCfg: (patch) => set((s) => ({ cfg: { ...s.cfg, ...patch } })),
      setIntegration: (k, v) =>
        set((s) => ({ integrations: { ...s.integrations, [k]: v } })),
      setFlag: (k, v) => set({ [k]: v } as Partial<BoardState>),
      addMappingRule: () =>
        set((s) => {
          const rule: MappingRule = {
            id: 'mr' + Date.now(),
            field: 'Статус',
            src: 'State (YouTrack)',
            cond: 'In Progress',
            to: 'В работе',
            color: '#cf9248',
          };
          return { mappingRules: [...s.mappingRules, rule] };
        }),
      editMappingRule: (id, patch) =>
        set((s) => ({
          mappingRules: s.mappingRules.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),
      removeMappingRule: (id) =>
        set((s) => ({
          mappingRules: s.mappingRules.filter((r) => r.id !== id),
        })),
      cycleRole: (id) =>
        set((s) => {
          const base = PEOPLE.find((p) => p.id === id);
          if (base) {
            const cur = s.userOverrides[id]?.role ?? base.role;
            const next = ROLES[(ROLES.indexOf(cur) + 1) % ROLES.length];
            return {
              userOverrides: {
                ...s.userOverrides,
                [id]: { ...s.userOverrides[id], role: next },
              },
            };
          }
          return {
            invites: s.invites.map((u) =>
              u.id === id
                ? {
                    ...u,
                    role: ROLES[(ROLES.indexOf(u.role) + 1) % ROLES.length],
                  }
                : u,
            ),
          };
        }),
      toggleUserActive: (id) =>
        set((s) => {
          const base = PEOPLE.find((p) => p.id === id);
          if (base) {
            const cur = s.userOverrides[id]?.active ?? base.active;
            return {
              userOverrides: {
                ...s.userOverrides,
                [id]: { ...s.userOverrides[id], active: !cur },
              },
            };
          }
          return {
            invites: s.invites.map((u) =>
              u.id === id ? { ...u, active: !u.active } : u,
            ),
          };
        }),
      openInvite: () =>
        set({ inviteOpen: true, inviteEmail: '', inviteRole: 'Участник' }),
      closeInvite: () => set({ inviteOpen: false }),
      setInviteEmail: (inviteEmail) => set({ inviteEmail }),
      setInviteRole: (inviteRole) => set({ inviteRole }),
      sendInvite: (email, role) =>
        set((s) => {
          const trimmed = email.trim();
          if (!trimmed) return {};
          const part = trimmed.split('@')[0].replace(/[._-]/g, ' ');
          const name =
            part
              .split(' ')
              .filter(Boolean)
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(' ') || trimmed;
          const initials = (
            name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2) || '??'
          ).toUpperCase();
          const colors = [
            '#5b8def',
            '#8b6fd6',
            '#3fa8a0',
            '#d6953f',
            '#cf6b6b',
            '#6b9b4a',
          ];
          const u: Person = {
            id: 'u' + Date.now() + Math.floor(Math.random() * 99),
            name,
            initials,
            color: colors[s.invites.length % colors.length],
            email: trimmed,
            role,
            lastActive: 'приглашён',
            active: true,
          };
          return {
            invites: [...s.invites, u],
            inviteOpen: false,
            inviteEmail: '',
          };
        }),
      setQuery: (query) => set({ query }),
      updateTask: (taskId, patch) =>
        set((s) => ({ groups: patchTask(s.groups, taskId, patch) })),
      // The «Срок» and the timeline bar are linked: setting a due date moves the bar to end on it.
      // A phased bar shifts (keeping its phase durations); a plain bar stretches (keeping its start).
      // Clearing the due (null) leaves the bar. The reverse link (bar drag → due) lives in the
      // timeline drop handler and phaseEdit.
      setDue: (taskId, due) =>
        set((s) => {
          if (s.viewer) return {};
          const t = s.groups.flatMap((g) => g.tasks).find((x) => x.id === taskId);
          if (!t) return {};
          let patch: Partial<Task> = { due };
          if (due && t.tl) {
            const delta = dayNum(due) - dayNum(t.tl.end);
            if (t.phases && t.anchor) {
              patch = {
                due,
                anchor: { ...t.anchor, date: shiftIso(t.anchor.date, delta) },
                tl: { start: shiftIso(t.tl.start, delta), end: due },
              };
            } else {
              const start =
                dayNum(t.tl.start) <= dayNum(due) ? t.tl.start : due;
              patch = { due, tl: { start, end: due } };
            }
          }
          return { groups: patchTask(s.groups, taskId, patch) };
        }),
      renameGroup: (groupId, name) =>
        set((s) =>
          s.viewer
            ? {}
            : {
                groups: s.groups.map((g) =>
                  g.id === groupId ? { ...g, name } : g,
                ),
              },
        ),
      // Editable label registry (status/priority/type/source). Each mutation pushes the
      // new set into the live mirror (so derive.ts / timeline.ts see it) and updates the
      // `labels` ref so the /prefs sync flushes it to the backend.
      addLabel: (field) =>
        set((s) => {
          if (s.viewer) return {};
          const defs = s.labels[field];
          const next = {
            ...s.labels,
            [field]: [
              ...defs,
              {
                key: freshLabelKey(defs),
                label: 'Новая метка',
                bg: LABEL_PALETTE[defs.length % LABEL_PALETTE.length],
              },
            ],
          };
          setLiveLabels(next);
          return { labels: next };
        }),
      editLabel: (field, key, patch) =>
        set((s) => {
          if (s.viewer) return {};
          const next = {
            ...s.labels,
            [field]: s.labels[field].map((l) =>
              l.key === key ? { ...l, ...patch } : l,
            ),
          };
          setLiveLabels(next);
          return { labels: next };
        }),
      removeLabel: (field, key) =>
        set((s) => {
          if (s.viewer) return {};
          const defs = s.labels[field];
          if (defs.length <= 1) return {}; // keep at least one option
          const remaining = defs.filter((l) => l.key !== key);
          const next = { ...s.labels, [field]: remaining };
          // Reassign any task/sub still pointing at the removed key so no row is left
          // orphaned — an orphan drops out of grouped views, undercounts the dashboard, and
          // surfaces the raw key in its cell. Priority is nullable → null; the other three
          // fall back to the first remaining label.
          const fallback = field === 'priority' ? null : remaining[0].key;
          const groups = s.groups.map((g) => ({
            ...g,
            tasks: g.tasks.map((t) => {
              let nt = t;
              if (t[field] === key) {
                nt = { ...nt, [field]: fallback } as Task;
              }
              if (field === 'status' && nt.subs?.some((x) => x.status === key)) {
                nt = {
                  ...nt,
                  subs: nt.subs.map((x) =>
                    x.status === key ? ({ ...x, status: fallback } as Sub) : x,
                  ),
                };
              }
              return nt;
            }),
          }));
          setLiveLabels(next);
          return { labels: next, groups };
        }),
      // Phase-dates editor (brief §5.6, prototype openPopup 'phases' init ~1741): when a task
      // has no phases yet, seed the prototype default and store the derived tl so the gantt bar
      // (which segments by phases) renders immediately.
      initPhases: (taskId) =>
        set((s) => {
          if (s.viewer) return {};
          const t = s.groups
            .flatMap((g) => g.tasks)
            .find((x) => x.id === taskId);
          if (!t || t.phases) return {};
          const base = t.tl ? t.tl.start : TODAY;
          const phases: Phases = {
            analysis: { days: 3, res: 'p3' },
            dev: { days: 5, res: 'p4' },
            test: { days: 2, res: 'p3' },
          };
          const anchor: Anchor = { type: 'start', date: base };
          const cp = computePhases({ phases, anchor });
          return {
            groups: patchTask(s.groups, taskId, {
              phases,
              anchor,
              tl: { start: cp.start, end: cp.end },
            }),
          };
        }),
      // Ported 1:1 from the prototype's phaseEdit: clone phases+anchor, run the mutator,
      // recompute via computePhases, and persist phases/anchor/tl together so the bar stays live.
      phaseEdit: (taskId, mutator) =>
        set((s) => {
          if (s.viewer) return {};
          const t = s.groups
            .flatMap((g) => g.tasks)
            .find((x) => x.id === taskId);
          if (!t || !t.phases) return {};
          const phases: Phases = JSON.parse(JSON.stringify(t.phases));
          const anchor: Anchor = {
            ...(t.anchor ?? { type: 'start', date: t.tl ? t.tl.start : TODAY }),
          };
          mutator(phases, anchor);
          const cp = computePhases({ phases, anchor });
          return {
            groups: patchTask(s.groups, taskId, {
              phases,
              anchor,
              tl: { start: cp.start, end: cp.end },
              // Keep «Срок» on the bar's end (the two are linked).
              due: cp.end,
            }),
          };
        }),
      phaseDays: (taskId, key, delta) =>
        get().phaseEdit(taskId, (p) => {
          p[key].days = Math.max(0, (p[key].days || 0) + delta);
        }),
      phaseRes: (taskId, key) =>
        get().phaseEdit(taskId, (p) => {
          const idsList = PEOPLE.map((x) => x.id);
          const i = idsList.indexOf(p[key].res ?? '');
          p[key].res = idsList[(i + 1) % idsList.length];
        }),
      phaseAnchorType: (taskId, type) =>
        get().phaseEdit(taskId, (p, a) => {
          if (a.type === type) return;
          const cp = computePhases({ phases: p, anchor: a });
          a.type = type;
          a.date = type === 'start' ? cp.start : cp.end;
        }),
      phaseAnchorShift: (taskId, delta) =>
        get().phaseEdit(taskId, (_p, a) => {
          a.date = shiftIso(a.date, delta);
        }),
      cycleParity: (gid, col) =>
        set((s) => {
          const cur = (s.parity[gid] && s.parity[gid][col]) || 'none';
          const next =
            PARITY_ORDER[(PARITY_ORDER.indexOf(cur) + 1) % PARITY_ORDER.length];
          return {
            parity: { ...s.parity, [gid]: { ...s.parity[gid], [col]: next } },
          };
        }),
      setParity: (gid, col, value) =>
        set((s) => ({
          parity: { ...s.parity, [gid]: { ...s.parity[gid], [col]: value } },
        })),
      toggleCollapse: (gid) =>
        set((s) => ({
          collapsed: { ...s.collapsed, [gid]: !s.collapsed[gid] },
        })),
      toggleExpand: (taskId) =>
        set((s) => ({
          expanded: { ...s.expanded, [taskId]: !s.expanded[taskId] },
        })),
      addColumn: (type, afterKey) =>
        set((s) => {
          if (s.viewer) return {};
          const id = 'cc' + Date.now();
          const def: Record<ColType, string> = {
            text: 'Текст',
            number: 'Число',
            status: 'Статус',
            date: 'Дата',
            people: 'Люди',
            check: 'Готово',
          };
          const col: CustomCol = {
            id,
            label: def[type] || 'Новый столбец',
            type,
          };
          // Place the new column right after `afterKey` in the resolved order (else at the end).
          const customIds = [...s.customCols.map((c) => c.id), id];
          let order = resolveColOrder(s.colOrder, customIds).filter(
            (k) => k !== id,
          );
          const at = afterKey ? order.indexOf(afterKey) : -1;
          order =
            at >= 0
              ? [...order.slice(0, at + 1), id, ...order.slice(at + 1)]
              : [...order, id];
          return {
            customCols: [...s.customCols, col],
            colOrder: order,
            addColMenu: null,
            // Open the new column's menu straight in rename mode so it can be named.
            headerMenu: {
              key: id,
              x: Math.max(10, window.innerWidth - 280),
              y: 120,
              custom: true,
              rename: true,
            },
          };
        }),
      setColValue: (taskId, colId, value) =>
        set((s) => {
          if (s.viewer) return {};
          return {
            colValues: { ...s.colValues, [taskId + '::' + colId]: value },
          };
        }),
      setColLabel: (id, label) =>
        set((s) => {
          if (s.viewer) return {};
          if (id.indexOf('cc') === 0) {
            return {
              customCols: s.customCols.map((c) =>
                c.id === id ? { ...c, label } : c,
              ),
            };
          }
          return { colLabels: { ...s.colLabels, [id]: label } };
        }),
      deleteColumn: (id) =>
        set((s) => {
          if (s.viewer) return {};
          const colValues: Record<string, unknown> = {};
          for (const k of Object.keys(s.colValues)) {
            if (k.split('::')[1] !== id) colValues[k] = s.colValues[k];
          }
          const colWidths = { ...s.colWidths };
          delete colWidths[id];
          return {
            customCols: s.customCols.filter((c) => c.id !== id),
            colValues,
            colWidths,
            colOrder: s.colOrder.filter((k) => k !== id),
            headerMenu: null,
          };
        }),
      setColWidth: (key, width) =>
        set((s) =>
          s.viewer
            ? {}
            : { colWidths: { ...s.colWidths, [key]: Math.max(60, Math.round(width)) } },
        ),
      setColOrder: (order) => set((s) => (s.viewer ? {} : { colOrder: order })),
      setColType: (id, type) =>
        set((s) =>
          s.viewer
            ? {}
            : {
                customCols: s.customCols.map((c) =>
                  c.id === id ? { ...c, type } : c,
                ),
                headerMenu: null,
              },
        ),
      duplicateColumn: (key) =>
        set((s) => {
          if (s.viewer) return {};
          const src = s.customCols.find((c) => c.id === key);
          if (!src) return {}; // only custom columns can be duplicated
          const id = 'cc' + Date.now();
          const col: CustomCol = { ...src, id, label: src.label + ' (копия)' };
          const colValues = { ...s.colValues };
          for (const k of Object.keys(s.colValues)) {
            const [taskId, colId] = k.split('::');
            if (colId === key) colValues[taskId + '::' + id] = s.colValues[k];
          }
          const customIds = [...s.customCols.map((c) => c.id), id];
          let order = resolveColOrder(s.colOrder, customIds).filter(
            (k2) => k2 !== id,
          );
          const at = order.indexOf(key);
          order =
            at >= 0
              ? [...order.slice(0, at + 1), id, ...order.slice(at + 1)]
              : [...order, id];
          return {
            customCols: [...s.customCols, col],
            colValues,
            colOrder: order,
            headerMenu: null,
          };
        }),
      toggleColWrap: (key) =>
        set((s) => ({ colWrap: { ...s.colWrap, [key]: !s.colWrap[key] } })),
      toggleColHidden: (key) =>
        set((s) => ({
          colHidden: { ...s.colHidden, [key]: !s.colHidden[key] },
          headerMenu: null,
        })),
      toggleColCollapse: (key) =>
        set((s) => ({
          colCollapsed: { ...s.colCollapsed, [key]: !s.colCollapsed[key] },
        })),
      sortColumn: (key, dir) =>
        set({ sortBy: key, sortDir: dir, headerMenu: null }),
      openHeaderMenu: (key, custom, x, y) =>
        set((s) =>
          s.viewer
            ? {}
            : { headerMenu: { key, custom, x, y }, addColMenu: null },
        ),
      closeHeaderMenu: () => set({ headerMenu: null }),
      openAddColMenu: (x, y) =>
        set((s) =>
          s.viewer ? {} : { addColMenu: { x, y }, headerMenu: null },
        ),
      closeAddColMenu: () => set({ addColMenu: null }),
      addSub: (taskId, name) =>
        set((s) => {
          if (s.viewer) return {};
          const trimmed = name.trim();
          if (!trimmed) return {};
          const sid = 's' + Date.now() + Math.floor(Math.random() * 99);
          const ns: Sub = {
            id: sid,
            name: trimmed,
            owner: null,
            status: 'plan',
            due: null,
          };
          const groups = s.groups.map((g) => ({
            ...g,
            tasks: g.tasks.map((t) =>
              t.id === taskId ? { ...t, subs: [...(t.subs ?? []), ns] } : t,
            ),
          }));
          return { groups };
        }),
      updateSub: (taskId, subId, patch) =>
        set((s) => {
          if (s.viewer) return {};
          const groups = s.groups.map((g) => ({
            ...g,
            tasks: g.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subs: (t.subs ?? []).map((x) =>
                      x.id === subId ? { ...x, ...patch } : x,
                    ),
                  }
                : t,
            ),
          }));
          return { groups };
        }),
      startAddSub: (taskId) =>
        set((s) =>
          s.viewer
            ? {}
            : {
                addingSub: taskId,
                subDraft: '',
                expanded: { ...s.expanded, [taskId]: true },
                ctxMenu: null,
              },
        ),
      setSubDraft: (subDraft) => set({ subDraft }),
      cancelAddSub: () => set({ addingSub: null, subDraft: '' }),
      toggleSelect: (taskId) =>
        set((s) => {
          const selectedIds = { ...s.selectedIds };
          if (selectedIds[taskId]) delete selectedIds[taskId];
          else selectedIds[taskId] = true;
          return { selectedIds };
        }),
      clearSelection: () => set({ selectedIds: {} }),
      duplicateTasks: (ids) =>
        set((s) => {
          const idSet = new Set(ids);
          if (idSet.size === 0) return {};
          const prev = s.groups;
          const stamp = Date.now();
          let n = 0;
          const groups = s.groups.map((g) => {
            if (!g.tasks.some((t) => idSet.has(t.id))) return g;
            const tasks: Task[] = [];
            for (const t of g.tasks) {
              tasks.push(t);
              if (idSet.has(t.id)) {
                const k = n++;
                tasks.push({
                  ...t,
                  id: 't' + stamp + '_' + k,
                  name: t.name + ' (копия)',
                  subs: t.subs
                    ? t.subs.map((sub, j) => ({
                        ...sub,
                        id: 's' + stamp + '_' + k + '_' + j,
                      }))
                    : undefined,
                });
              }
            }
            return { ...g, tasks };
          });
          get().addToast('Дублировано задач: ' + idSet.size, () =>
            set({ groups: prev }),
          );
          return { groups, selectedIds: {} };
        }),
      deleteTasks: (ids) =>
        set((s) => {
          const idSet = new Set(ids);
          if (idSet.size === 0) return {};
          const prev = s.groups;
          const groups = s.groups.map((g) => ({
            ...g,
            tasks: g.tasks.filter((t) => !idSet.has(t.id)),
          }));
          const panelId = s.panelId && idSet.has(s.panelId) ? null : s.panelId;
          get().addToast('Удалено задач: ' + idSet.size, () =>
            set({ groups: prev }),
          );
          return { groups, selectedIds: {}, panelId };
        }),
      setFilterStatus: (key) =>
        set((s) => {
          const filterStatus = { ...s.filterStatus };
          if (filterStatus[key]) delete filterStatus[key];
          else filterStatus[key] = true;
          return { filterStatus };
        }),
      setFilterOwner: (filterOwner) =>
        set((s) => ({
          filterOwner: s.filterOwner === filterOwner ? null : filterOwner,
        })),
      clearFilters: () => set({ filterStatus: {}, filterOwner: null }),
      setSort: (by) =>
        set((s) =>
          s.sortBy === by
            ? { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' }
            : { sortBy: by, sortDir: 'asc' },
        ),
      setGroupBy: (groupBy) => set({ groupBy }),
      openPopup: (popup) =>
        set({ popup, toolMenu: null, headerMenu: null, addColMenu: null }),
      closePopup: () => set({ popup: null }),
      openTool: (toolMenu) =>
        set({ toolMenu, popup: null, headerMenu: null, addColMenu: null }),
      closeTool: () => set({ toolMenu: null }),
      openPanel: (panelId) => set({ panelId }),
      closePanel: () => set({ panelId: null, popup: null }),
      openCtx: (ctxMenu) =>
        set({
          ctxMenu,
          popup: null,
          toolMenu: null,
          headerMenu: null,
          addColMenu: null,
        }),
      closeCtx: () => set({ ctxMenu: null }),
      createTaskBelow: (id) =>
        set((s) => {
          const stamp = Date.now();
          const groups = s.groups.map((g) => {
            const i = g.tasks.findIndex((t) => t.id === id);
            if (i < 0) return g;
            const nt: Task = {
              id: 't' + stamp + '_' + Math.floor(Math.random() * 99),
              name: 'Новая задача',
              owner: null,
              status: 'plan',
              due: null,
              priority: null,
              tl: null,
              note: '',
              lastBy: 'p1',
              lastAgo: 'сейчас',
              section: 'Обращения',
              type: 'mig',
              source: 'ours',
            };
            const tasks = g.tasks.slice();
            tasks.splice(i + 1, 0, nt);
            return { ...g, tasks };
          });
          return { groups, ctxMenu: null };
        }),
      archiveTask: (id) =>
        set((s) => {
          const task = s.groups
            .flatMap((g) => g.tasks)
            .find((t) => t.id === id);
          const prev = s.groups;
          const groups = s.groups.map((g) => ({
            ...g,
            tasks: g.tasks.filter((t) => t.id !== id),
          }));
          const panelId = s.panelId === id ? null : s.panelId;
          get().addToast(
            'Задача «' + (task ? task.name : '') + '» в архиве',
            () => set({ groups: prev }),
          );
          return { groups, ctxMenu: null, panelId };
        }),
      openCmd: () =>
        set({ cmdOpen: true, cmdQuery: '', cmdIdx: 0, ctxMenu: null }),
      closeCmd: () => set({ cmdOpen: false }),
      setCmdQuery: (cmdQuery) => set({ cmdQuery, cmdIdx: 0 }),
      setCmdIdx: (cmdIdx) => set({ cmdIdx }),
      startCoach: () => set({ coachOpen: true, coachStep: 0, cmdOpen: false }),
      coachNext: () =>
        set((s) => {
          const n = s.coachStep + 1;
          if (n >= COACH.length) return { coachOpen: false };
          return { coachStep: n };
        }),
      coachSkip: () => set({ coachOpen: false }),
      addToast: (text, undo) =>
        set((s) => {
          const id = 'toast' + Date.now() + Math.floor(Math.random() * 1000);
          setTimeout(() => get().dismissToast(id), 4000);
          return { toasts: [...s.toasts, { id, text, undo }] };
        }),
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setTlDrag: (tlDrag) => set({ tlDrag }),
      dragStart: (id) => set((s) => (s.viewer ? {} : { drag: { id } })),
      dragOver: (groupId, taskId, before) =>
        set((s) => {
          if (!s.drag || s.drag.id === taskId) return {};
          const cur = s.dropTarget;
          if (
            cur &&
            cur.taskId === taskId &&
            cur.before === before &&
            cur.groupId === groupId
          )
            return {};
          return { dropTarget: { groupId, taskId, before } };
        }),
      dropRow: () => {
        const { drag, dropTarget } = get();
        if (!drag || !dropTarget) {
          set({ drag: null, dropTarget: null });
          return;
        }
        // Resolve the drop target (row + before/after) into an insertion index within
        // the target group, computed on the list with the dragged row removed — then
        // delegate the actual move to moveTask so the reorder lives in one place.
        const stripped = get().groups.map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => t.id !== drag.id),
        }));
        const tg = stripped.find((g) => g.id === dropTarget.groupId);
        if (!tg) {
          set({ drag: null, dropTarget: null });
          return;
        }
        const idx = tg.tasks.findIndex((t) => t.id === dropTarget.taskId);
        const at =
          idx < 0 ? tg.tasks.length : dropTarget.before ? idx : idx + 1;
        get().moveTask(drag.id, dropTarget.groupId, at);
        set({ drag: null, dropTarget: null });
      },
      dragEnd: () => set({ drag: null, dropTarget: null }),
      moveTask: (taskId, toGroupId, toIndex) =>
        set((s) => {
          if (s.viewer) return {};
          let moved: Task | null = null;
          const stripped = s.groups.map((g) => {
            const tasks = g.tasks.filter((t) => {
              if (t.id === taskId) {
                moved = t;
                return false;
              }
              return true;
            });
            return { ...g, tasks };
          });
          if (!moved) return {};
          const groups = stripped.map((g) => {
            if (g.id !== toGroupId) return g;
            const tasks = g.tasks.slice();
            const at =
              toIndex < 0 || toIndex > tasks.length ? tasks.length : toIndex;
            tasks.splice(at, 0, moved as Task);
            return { ...g, tasks };
          });
          return { groups };
        }),
      groupDragStart: (id) =>
        set((s) => (s.viewer ? {} : { groupDrag: { id } })),
      groupDragOver: (id) =>
        set((s) => {
          const d = s.groupDrag;
          if (!d || d.id === id) return {};
          if (s.groupDropId === id) return {};
          return { groupDropId: id };
        }),
      groupDrop: (targetId) => {
        const d = get().groupDrag;
        if (!d) {
          set({ groupDrag: null, groupDropId: null });
          return;
        }
        set((s) => {
          const gs = s.groups.slice();
          const from = gs.findIndex((g) => g.id === d.id);
          const to = gs.findIndex((g) => g.id === targetId);
          if (from < 0 || to < 0 || from === to)
            return { groupDrag: null, groupDropId: null };
          const m = gs.splice(from, 1)[0];
          gs.splice(to, 0, m);
          return { groups: gs, groupDrag: null, groupDropId: null };
        });
      },
      groupDragEnd: () => set({ groupDrag: null, groupDropId: null }),
      moveGroup: (id, dir) =>
        set((s) => {
          if (s.viewer) return {};
          const gs = s.groups.slice();
          const i = gs.findIndex((g) => g.id === id);
          if (i < 0) return {};
          // Swap with the nearest neighbour ON THE SAME BOARD (groups of other boards may be
          // interleaved in the flat array), so the up/down arrows reorder within the board only.
          const boardId = gs[i].boardId ?? 'b1';
          let j = i + dir;
          while (j >= 0 && j < gs.length && (gs[j].boardId ?? 'b1') !== boardId) {
            j += dir;
          }
          if (j < 0 || j >= gs.length) return {};
          const t = gs[i];
          gs[i] = gs[j];
          gs[j] = t;
          return { groups: gs };
        }),
      // Add an empty group to the ACTIVE board (entry point for a fresh/empty board).
      addGroup: () =>
        set((s) => {
          if (s.viewer) return {};
          const palette = [
            '#5b8def',
            '#8b6fd6',
            '#3fa8a0',
            '#d6953f',
            '#cf6b6b',
            '#6b9b4a',
          ];
          const boardCount = s.groups.filter(
            (g) => (g.boardId ?? 'b1') === s.activeBoardId,
          ).length;
          const group: Group = {
            id: 'g' + Date.now(),
            name: 'Новая группа',
            color: palette[boardCount % palette.length],
            boardId: s.activeBoardId,
            tasks: [],
          };
          return { groups: [...s.groups, group] };
        }),
      // Add a task to the active board's first group (creating a group if the board is empty).
      createTask: () =>
        set((s) => {
          if (s.viewer) return {};
          const stamp = Date.now();
          const nt: Task = {
            id: 't' + stamp + '_' + Math.floor(Math.random() * 99),
            name: 'Новая задача',
            owner: null,
            status: 'plan',
            due: null,
            priority: null,
            tl: null,
            note: '',
            lastBy: 'p1',
            lastAgo: 'сейчас',
            section: 'Обращения',
            type: 'mig',
            source: 'ours',
          };
          const boardGroups = s.groups.filter(
            (g) => (g.boardId ?? 'b1') === s.activeBoardId,
          );
          if (boardGroups.length === 0) {
            const group: Group = {
              id: 'g' + stamp,
              name: 'Новая группа',
              color: '#5b8def',
              boardId: s.activeBoardId,
              tasks: [nt],
            };
            return { groups: [...s.groups, group] };
          }
          const firstId = boardGroups[0].id;
          return {
            groups: s.groups.map((g) =>
              g.id === firstId ? { ...g, tasks: [nt, ...g.tasks] } : g,
            ),
          };
        }),
      // Append a task to a specific group (the per-group «Добавить задача» footer row).
      addTaskToGroup: (groupId) =>
        set((s) => {
          if (s.viewer) return {};
          const stamp = Date.now();
          const nt: Task = {
            id: 't' + stamp + '_' + Math.floor(Math.random() * 99),
            name: 'Новая задача',
            owner: null,
            status: 'plan',
            due: null,
            priority: null,
            tl: null,
            note: '',
            lastBy: 'p1',
            lastAgo: 'сейчас',
            section: 'Обращения',
            type: 'mig',
            source: 'ours',
          };
          return {
            groups: s.groups.map((g) =>
              g.id === groupId ? { ...g, tasks: [...g.tasks, nt] } : g,
            ),
          };
        }),
      setCalMonth: (calMonth) => set({ calMonth }),
      shiftCalMonth: (delta) =>
        set((s) => {
          let { y, m0 } = s.calMonth;
          m0 += delta;
          if (m0 < 0) {
            m0 = 11;
            y--;
          }
          if (m0 > 11) {
            m0 = 0;
            y++;
          }
          return { calMonth: { y, m0 } };
        }),
      importNext: () =>
        set((s) => ({ importStep: Math.min(4, s.importStep + 1) })),
      importBack: () =>
        set((s) => ({ importStep: Math.max(1, s.importStep - 1) })),
      importRun: () => set({ importDone: true }),
      importReset: () =>
        set({
          screen: 'board',
          boardTab: 'table',
          settingsScreen: false,
          importStep: 1,
          importDone: false,
          importMap: {},
          importTemplate: false,
        }),
      setImportField: (field, excel) =>
        set((s) => ({ importMap: { ...s.importMap, [field]: excel } })),
      toggleImportTemplate: () =>
        set((s) => ({ importTemplate: !s.importTemplate })),
    }),
    {
      name: 'work_board_v1',
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({
        groups: s.groups,
        collapsed: s.collapsed,
        boards: s.boards,
        activeBoardId: s.activeBoardId,
        customCols: s.customCols,
        colValues: s.colValues,
        colLabels: s.colLabels,
        labels: s.labels,
        colWidths: s.colWidths,
        colOrder: s.colOrder,
        colWrap: s.colWrap,
        colHidden: s.colHidden,
        colCollapsed: s.colCollapsed,
        cfg: s.cfg,
        integrations: s.integrations,
        autoSync: s.autoSync,
        twoWay: s.twoWay,
        guestLinks: s.guestLinks,
        dark: s.dark,
        filterStatus: s.filterStatus,
        filterOwner: s.filterOwner,
        sortBy: s.sortBy,
        sortDir: s.sortDir,
        groupBy: s.groupBy,
        parity: s.parity,
        mappingRules: s.mappingRules,
        userOverrides: s.userOverrides,
        invites: s.invites,
      }),
      // localStorage rehydration bypasses the actions, so re-prime the live label mirror
      // (and backfill any missing field) from the persisted set.
      onRehydrateStorage: () => (state) => {
        if (state) {
          const labels = normalizeLabels(state.labels);
          state.labels = labels;
          setLiveLabels(labels);
        }
      },
    },
  ),
);
