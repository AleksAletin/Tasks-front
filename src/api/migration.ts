import { apiClient } from './client';
import type { EpicRow, ModuleRow, NoveltyRow, RoleRow } from '../migration/domain';

/** GET /migration payload — the server-stored MASTER dataset (empty = never imported). */
export interface MigrationDataset {
  modules: ModuleRow[];
  roles: RoleRow[];
  novelties: NoveltyRow[];
  epics: EpicRow[];
  updatedAt: string | null;
  sourceFile: string | null;
}

/** POST /migration/import outcome: parsed counts + non-fatal cross-check warnings. */
export interface MigrationImportSummary {
  modules: number;
  roles: number;
  novelties: number;
  epics: number;
  warnings: string[];
  updatedAt: string;
}

export async function fetchMigration(): Promise<MigrationDataset> {
  const { data } = await apiClient.get<MigrationDataset>('/migration');
  return data;
}

/** Upload the MASTER workbook — the backend parses «Реестр+Борд»/«Матрица»/«Новинки»/«модули»,
 * cross-checks them and replaces the stored dataset. */
export async function importMaster(file: File): Promise<MigrationImportSummary> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<MigrationImportSummary>('/migration/import', form, {
    // apiClient defaults every request to application/json — override so the FormData goes out
    // as multipart (axios fills in the boundary), otherwise the backend answers 415.
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Replace just the role↔module membership (the «Матрица» chip editor). Needs an existing
 * dataset — нужность/ярус/бакет are recomputed client-side from the new membership. */
export async function saveMigrationRoles(
  roles: RoleRow[],
): Promise<{ roles: number; updatedAt: string }> {
  const { data } = await apiClient.put<{ roles: number; updatedAt: string }>('/migration/roles', {
    roles,
  });
  return data;
}
