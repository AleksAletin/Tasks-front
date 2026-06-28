import { apiClient } from './client';

/** Response of `POST /import/preview` — the parsed header + a sample of rows. */
export interface ImportPreview {
  columns: string[];
  rows: string[][];
  totalRows: number;
}

/** Response of `POST /import/commit` — upsert counts + per-row errors. */
export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

/** Body of `POST /import/commit` (sent as a JSON form field alongside the file). */
export interface CommitRequest {
  sectionId: string;
  columnMap: Record<string, string>;
  keyColumn: string;
}

// axios fills the multipart boundary itself when the body is FormData + this Content-Type.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/** Parse an uploaded xlsx/csv and return its columns + first rows (no DB writes). */
export async function previewImport(file: File): Promise<ImportPreview> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ImportPreview>(
    '/import/preview',
    form,
    MULTIPART,
  );
  return data;
}

/** Apply a column mapping and upsert reports into a section. */
export async function commitImport(
  file: File,
  request: CommitRequest,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('request', JSON.stringify(request));
  const { data } = await apiClient.post<ImportResult>(
    '/import/commit',
    form,
    MULTIPART,
  );
  return data;
}

interface SectionLite {
  id: string;
  name: string;
}

const IMPORT_SECTION = 'Импорт из Excel';

/** Reports need a Section to live in; reuse (or create once) a dedicated import section. */
export async function ensureImportSection(): Promise<string> {
  const { data: sections } = await apiClient.get<SectionLite[]>('/sections');
  const found = sections.find((s) => s.name === IMPORT_SECTION);
  if (found) {
    return found.id;
  }
  const { data: created } = await apiClient.post<SectionLite>('/sections', {
    name: IMPORT_SECTION,
    order: 0,
  });
  return created.id;
}
