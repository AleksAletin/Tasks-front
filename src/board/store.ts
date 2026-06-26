import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Board,
  type Cfg,
  type CustomCol,
  type Group,
  type MappingRule,
  type Parity,
  type ParityKey,
  type Person,
  type Task,
  PARITY_ORDER,
  PEOPLE,
  ROLES,
  initialBoards,
  initialCfg,
  initialGroups,
  initialMappingRules,
  initialParity,
} from './model';

export interface UserOverride {
  role?: string;
  active?: boolean;
}

export type Screen = 'board' | 'dashboard' | 'users';
export type BoardTab = 'table' | 'timeline' | 'parity' | 'alerts' | 'import' | 'calendar';
export type SettingsTab = 'integrations' | 'sync' | 'mapping' | 'access' | 'appearance';

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
export interface TlDrag {
  id: string;
  dd: number;
}
export interface CalMonth {
  y: number;
  m0: number;
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
  tlDrag: TlDrag | null;
  calMonth: CalMonth;
  importStep: number;
  importDone: boolean;
  importTemplate: boolean;
  importMap: Record<string, string>;

  // ---- actions ----
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
  cycleParity: (gid: string, col: string) => void;
  setParity: (gid: string, col: string, value: ParityKey) => void;
  toggleCollapse: (gid: string) => void;
  toggleExpand: (taskId: string) => void;
  toggleSelect: (taskId: string) => void;
  clearSelection: () => void;
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
  setTlDrag: (d: TlDrag | null) => void;
  setCalMonth: (m: CalMonth) => void;
  shiftCalMonth: (delta: number) => void;
  importNext: () => void;
  importBack: () => void;
  importRun: () => void;
  importReset: () => void;
  setImportField: (field: string, excel: string) => void;
  toggleImportTemplate: () => void;
}

const patchTask = (groups: Group[], taskId: string, patch: Partial<Task>): Group[] =>
  groups.map((g) => ({
    ...g,
    tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
  }));

export const useBoard = create<BoardState>()(
  persist(
    (set) => ({
      groups: initialGroups,
      collapsed: {},
      boards: initialBoards,
      activeBoardId: 'b1',
      customCols: [],
      colValues: {},
      colLabels: {},
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
      tlDrag: null,
      calMonth: { y: 2026, m0: 5 },
      importStep: 1,
      importDone: false,
      importTemplate: false,
      importMap: {},

      login: () => set({ authed: true }),
      setLoginEmail: (v) => set({ loginEmail: v }),
      toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
      setScreen: (screen) => set({ screen, settingsScreen: false }),
      setBoardTab: (boardTab) => set({ boardTab, screen: 'board', settingsScreen: false }),
      openSettings: () => set({ settingsScreen: true }),
      closeSettings: () => set({ settingsScreen: false }),
      setSettingsTab: (settingsTab) => set({ settingsTab }),
      selectBoard: (activeBoardId) => set({ activeBoardId }),
      addBoard: () =>
        set((s) => {
          const palette = ['#4263d8', '#c9b46b', '#9b8fd1', '#3fa8a0', '#cf6b6b', '#5b8def'];
          const id = 'b' + (s.boards.length + 1);
          const board: Board = { id, name: 'Новая доска', color: palette[s.boards.length % palette.length] };
          return { boards: [...s.boards, board], activeBoardId: id };
        }),
      setViewer: (viewer) => set({ viewer }),
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      setCfg: (patch) => set((s) => ({ cfg: { ...s.cfg, ...patch } })),
      setIntegration: (k, v) => set((s) => ({ integrations: { ...s.integrations, [k]: v } })),
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
      removeMappingRule: (id) => set((s) => ({ mappingRules: s.mappingRules.filter((r) => r.id !== id) })),
      cycleRole: (id) =>
        set((s) => {
          const base = PEOPLE.find((p) => p.id === id);
          if (base) {
            const cur = s.userOverrides[id]?.role ?? base.role;
            const next = ROLES[(ROLES.indexOf(cur) + 1) % ROLES.length];
            return { userOverrides: { ...s.userOverrides, [id]: { ...s.userOverrides[id], role: next } } };
          }
          return {
            invites: s.invites.map((u) =>
              u.id === id ? { ...u, role: ROLES[(ROLES.indexOf(u.role) + 1) % ROLES.length] } : u,
            ),
          };
        }),
      toggleUserActive: (id) =>
        set((s) => {
          const base = PEOPLE.find((p) => p.id === id);
          if (base) {
            const cur = s.userOverrides[id]?.active ?? base.active;
            return { userOverrides: { ...s.userOverrides, [id]: { ...s.userOverrides[id], active: !cur } } };
          }
          return { invites: s.invites.map((u) => (u.id === id ? { ...u, active: !u.active } : u)) };
        }),
      openInvite: () => set({ inviteOpen: true, inviteEmail: '', inviteRole: 'Участник' }),
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
          const initials = (name.split(' ').map((w) => w[0]).join('').slice(0, 2) || '??').toUpperCase();
          const colors = ['#5b8def', '#8b6fd6', '#3fa8a0', '#d6953f', '#cf6b6b', '#6b9b4a'];
          const u: Person = {
            id: 'u' + Date.now(),
            name,
            initials,
            color: colors[s.invites.length % colors.length],
            email: trimmed,
            role,
            lastActive: 'приглашён',
            active: true,
          };
          return { invites: [...s.invites, u], inviteOpen: false, inviteEmail: '' };
        }),
      setQuery: (query) => set({ query }),
      updateTask: (taskId, patch) => set((s) => ({ groups: patchTask(s.groups, taskId, patch) })),
      cycleParity: (gid, col) =>
        set((s) => {
          const cur = (s.parity[gid] && s.parity[gid][col]) || 'none';
          const next = PARITY_ORDER[(PARITY_ORDER.indexOf(cur) + 1) % PARITY_ORDER.length];
          return { parity: { ...s.parity, [gid]: { ...s.parity[gid], [col]: next } } };
        }),
      setParity: (gid, col, value) =>
        set((s) => ({ parity: { ...s.parity, [gid]: { ...s.parity[gid], [col]: value } } })),
      toggleCollapse: (gid) => set((s) => ({ collapsed: { ...s.collapsed, [gid]: !s.collapsed[gid] } })),
      toggleExpand: (taskId) => set((s) => ({ expanded: { ...s.expanded, [taskId]: !s.expanded[taskId] } })),
      toggleSelect: (taskId) =>
        set((s) => {
          const selectedIds = { ...s.selectedIds };
          if (selectedIds[taskId]) delete selectedIds[taskId];
          else selectedIds[taskId] = true;
          return { selectedIds };
        }),
      clearSelection: () => set({ selectedIds: {} }),
      setFilterStatus: (key) =>
        set((s) => {
          const filterStatus = { ...s.filterStatus };
          if (filterStatus[key]) delete filterStatus[key];
          else filterStatus[key] = true;
          return { filterStatus };
        }),
      setFilterOwner: (filterOwner) => set((s) => ({ filterOwner: s.filterOwner === filterOwner ? null : filterOwner })),
      clearFilters: () => set({ filterStatus: {}, filterOwner: null }),
      setSort: (by) =>
        set((s) => (s.sortBy === by ? { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' } : { sortBy: by, sortDir: 'asc' })),
      setGroupBy: (groupBy) => set({ groupBy }),
      openPopup: (popup) => set({ popup, toolMenu: null }),
      closePopup: () => set({ popup: null }),
      openTool: (toolMenu) => set({ toolMenu, popup: null }),
      closeTool: () => set({ toolMenu: null }),
      openPanel: (panelId) => set({ panelId }),
      closePanel: () => set({ panelId: null }),
      setTlDrag: (tlDrag) => set({ tlDrag }),
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
      importNext: () => set((s) => ({ importStep: Math.min(4, s.importStep + 1) })),
      importBack: () => set((s) => ({ importStep: Math.max(1, s.importStep - 1) })),
      importRun: () => set({ importDone: true }),
      importReset: () =>
        set({ screen: 'board', boardTab: 'table', settingsScreen: false, importStep: 1, importDone: false, importMap: {}, importTemplate: false }),
      setImportField: (field, excel) => set((s) => ({ importMap: { ...s.importMap, [field]: excel } })),
      toggleImportTemplate: () => set((s) => ({ importTemplate: !s.importTemplate })),
    }),
    {
      name: 'work_board_v1',
      partialize: (s) => ({
        groups: s.groups,
        collapsed: s.collapsed,
        boards: s.boards,
        activeBoardId: s.activeBoardId,
        customCols: s.customCols,
        colValues: s.colValues,
        colLabels: s.colLabels,
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
    },
  ),
);
