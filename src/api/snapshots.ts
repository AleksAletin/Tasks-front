import { apiClient } from './client';

// Снапшоты + Δ «что изменилось» (ТЗ v2 §6): слепки состояния задач и сравнение
// день-к-дню (база = предыдущий слепок по порядку, выходные схлопываются сами).

export interface SnapshotInfo {
  id: number;
  takenAt: string;
  entries: number;
}

export interface DeltaItem {
  key: string;
  title: string;
  kind: 'task' | 'sub';
  parent: string | null;
  was: string | null;
  now: string | null;
}

export interface Delta {
  baseTakenAt: string | null;
  targetTakenAt: string;
  closed: DeltaItem[];
  new: DeltaItem[];
  statusChanged: DeltaItem[];
  gone: DeltaItem[];
  ownerChanged: DeltaItem[];
}

export async function takeSnapshot(): Promise<SnapshotInfo> {
  const { data } = await apiClient.post<SnapshotInfo>('/snapshots');
  return data;
}

export async function fetchSnapshots(): Promise<SnapshotInfo[]> {
  const { data } = await apiClient.get<SnapshotInfo[]>('/snapshots');
  return data;
}

/** Δ последнего слепка с предыдущим; baseId — селектор «сравнить с». */
export async function fetchDelta(baseId?: number): Promise<Delta> {
  const { data } = await apiClient.get<Delta>('/snapshots/delta', {
    params: baseId !== undefined ? { baseId } : {},
  });
  return data;
}
