// Вкладка «Импорт» доски — настоящий импорт RAW-мастера (New (N).xlsx /
// Ultra_Support_MASTER.xlsx) вместо прототипного демо-визарда: файл уходит на
// POST /migration/import (парс «Реестр+Борд»/«Матрица»/«Новинки»/«🧩 Эпики»/«Модуль→Отчёт»,
// кросс-чеки → warnings), затем свежий датасет раскладывается на три доски (модули ·
// новинки · эпики «В работе/Готово», reconcile для эпиков) — тот же цикл, что кнопка
// «Разложить» на карте, но в один жест.
import { useEffect, useRef, useState } from 'react';
import {
  fetchMigration,
  importMaster,
  type MigrationImportSummary,
} from '../api/migration';
import {
  applyMembership,
  masterDerive,
  type EpicRow,
  type NoveltyRow,
} from '../migration/domain';
import { epicsToBoard, migrationToBoard, noveltiesToBoard } from '../migration/toBoard';
import { useBoard } from './store';

const ACCENT = '#4263d8';

interface DoneState {
  summary: MigrationImportSummary;
  addedModules: number;
  addedNovelties: number;
  addedEpics: number;
}

export function ImportWizard() {
  const importMigrationBoard = useBoard((s) => s.importMigrationBoard);
  const addToast = useBoard((s) => s.addToast);
  const setBoardTab = useBoard((s) => s.setBoardTab);
  const viewer = useBoard((s) => s.viewer);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);
  const [current, setCurrent] = useState<{ sourceFile: string | null; updatedAt: string | null }>(
    { sourceFile: null, updatedAt: null },
  );

  useEffect(() => {
    fetchMigration().then(
      (d) => setCurrent({ sourceFile: d.sourceFile, updatedAt: d.updatedAt }),
      () => undefined,
    );
  }, [done]);

  const upload = async (file: File) => {
    if (viewer || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const summary = await importMaster(file);

      // Свежий датасет → доменка → раскладка на доски (эпики reconcile'ом).
      const d = await fetchMigration();
      const rows = masterDerive(
        applyMembership(d.modules, d.roles),
        d.novelties as NoveltyRow[],
        d.roles,
      );
      const addedNovelties = importMigrationBoard(noveltiesToBoard(d.novelties, rows));
      const addedModules = importMigrationBoard(migrationToBoard(rows));
      const epics = (d.epics ?? []) as EpicRow[];
      const addedEpics = epics.length
        ? importMigrationBoard({ ...epicsToBoard(epics), retirePrefix: 'g_epic_' })
        : 0;

      setDone({ summary, addedModules, addedNovelties, addedEpics });
      addToast(
        `Импортировано: ${summary.modules} модулей · ${summary.novelties} новинок · ${summary.epics} эпиков — доски обновлены`,
      );
      // Раскладка перещёлкивает на таблицу; при варнингах возвращаемся показать их.
      if (summary.warnings.length > 0) {
        setBoardTab('import');
      }
    } catch (e) {
      const msg =
        (e as { response?: { data?: unknown } })?.response?.data ??
        'Не удалось загрузить — бэкенд недоступен?';
      setError(typeof msg === 'string' ? msg : 'Файл не принят — это точно RAW-мастер (.xlsx)?');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void upload(f);
  };

  return (
    <div style={{ padding: '22px 26px 40px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Импорт мастера (RAW)</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
          New (N).xlsx · листы «Реестр+Борд», «Матрица», «Новинки», «🧩 Эпики», «Модуль→Отчёт»
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 16, lineHeight: 1.5 }}>
        Файл заливается на сервер, пересчитываются карта и бэклоги, а доски (модули · новинки ·
        эпики «В работе/Готово») раскладываются сами: вычисляемое обновляется, ваши правки и
        подзадачи не трогаются.
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={(e) => onFiles(e.target.files)}
      />
      <div
        onClick={() => !viewer && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!viewer) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!viewer) onFiles(e.dataTransfer.files);
        }}
        style={{
          border: `2px dashed ${dragOver ? ACCENT : 'var(--line)'}`,
          background: dragOver ? 'rgba(66,99,216,0.06)' : 'var(--glass)',
          borderRadius: 14,
          padding: '44px 20px',
          textAlign: 'center',
          cursor: viewer || busy ? 'default' : 'pointer',
          transition: 'border-color .15s, background .15s',
          marginBottom: 16,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={dragOver ? ACCENT : 'var(--text-faint)'}
          strokeWidth="1.8"
          style={{ marginBottom: 10 }}
        >
          <path d="M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>
          {busy ? 'Загружаю и раскладываю…' : 'Перетащите RAW-мастер или выберите'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>.xlsx до 64 МБ</div>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginBottom: 18 }}>
        Сейчас в системе:{' '}
        {current.sourceFile ? (
          <>
            {current.sourceFile}
            {current.updatedAt
              ? ` · обновлено ${new Date(current.updatedAt).toLocaleString('ru-RU')}`
              : ''}
          </>
        ) : (
          'данные ещё не заливались'
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 14,
            border: '1px solid #cf6b6b55',
            background: '#cf6b6b12',
            borderRadius: 10,
            fontSize: 12.5,
            color: '#b55454',
            fontWeight: 600,
          }}
        >
          ⛔ {error}
        </div>
      )}

      {done && (
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid var(--surf-1)',
            background: 'var(--card)',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: '#4a9b7f', marginBottom: 6 }}>
            ✓ {done.summary.modules} модулей · {done.summary.roles} ролей ·{' '}
            {done.summary.novelties} новинок · {done.summary.epics} эпиков
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--text-soft)',
              marginBottom: done.summary.warnings.length ? 8 : 0,
            }}
          >
            Доски обновлены: модулей +{done.addedModules}, новинок +{done.addedNovelties}, эпиков +
            {done.addedEpics}.{' '}
            <span
              onClick={() => setBoardTab('table')}
              style={{ color: ACCENT, fontWeight: 700, cursor: 'pointer' }}
            >
              К таблице →
            </span>
          </div>
          {done.summary.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: '#b8862f', lineHeight: 1.55 }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
