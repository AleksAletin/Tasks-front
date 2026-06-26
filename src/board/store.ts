import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Board,
  type Cfg,
  type CustomCol,
  type Group,
  type Parity,
  type ParityKey,
  type Task,
  PARITY_ORDER,
  initialBoards,
  initialCfg,
  initialGroups,
  initialParity,
} from './model';

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

  // ---- ephemeral ----
  authed: boolean;
  loginEmail: string;
  viewer: boolean;
  screen: Screen;
  boardTab: BoardTab;
  navOpen: boolean;
  settingsScreen: boolean;
  settingsTab: SettingsTab;
  query: string;
  selectedIds: Record<string, boolean>;
  expanded: Record<string, boolean>;
  popup: PopupState | null;
  panelId: string | null;
  toolMenu: ToolMenu | null;
  tlDrag: TlDrag | null;

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

      authed: false,
      loginEmail: '',
      viewer: false,
      screen: 'board',
      boardTab: 'table',
      navOpen: true,
      settingsScreen: false,
      settingsTab: 'integrations',
      query: '',
      selectedIds: {},
      expanded: {},
      popup: null,
      panelId: null,
      toolMenu: null,
      tlDrag: null,

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
      }),
    },
  ),
);
