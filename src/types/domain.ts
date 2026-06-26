/**
 * Domain types mirroring the backend model of the XRM migration tool.
 * Enums are expressed as string-literal unions so they serialize 1:1 with the API.
 */

export interface Section {
  id: string;
  name: string;
}

export type RoleStatus = 'planning' | 'in_progress' | 'switched';

export interface Role {
  id: string;
  name: string;
  status: RoleStatus;
  switchDate?: string;
  readinessPercent?: number;
}

export type ReportType = 'read' | 'crud' | 'tool';
export type DataSource = 'own' | 'external';

export interface Report {
  id: string;
  sectionId: string;
  name: string;
  type: ReportType;
  dataSource: DataSource;
  complexity: number;
  ticketUrl?: string;
  ownerId?: string;
  state: string;
  percent: number;
}

export interface Module {
  id: string;
  reportId: string;
  name: string;
  isReusable: boolean;
}

export type PhaseKind = 'analytics' | 'dev' | 'testing';

export interface Phase {
  id: string;
  reportId: string;
  kind: PhaseKind;
  estimate: number;
  planDate?: string;
  actualDate?: string;
  status: string;
  assigneeId?: string;
}

export type ParityStatus = 'none' | 'in_progress' | 'done' | 'wont_port';

export interface ParityCell {
  reportId: string;
  roleId: string;
  moduleId: string;
  status: ParityStatus;
}

export interface Metric {
  key: string;
  value: number;
  label: string;
}
