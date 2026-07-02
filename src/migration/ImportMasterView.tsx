// Импорт мастера: upload Ultra_Support_MASTER.xlsx → the backend parses «Реестр+Борд» /
// «Матрица» / «Новинки» / «модули», cross-checks them (warnings, not silent fixes) and replaces
// the stored dataset — no more hand-run converter scripts. The screen refetches on success.
import { useRef, useState } from 'react';
import { importMaster, type MigrationImportSummary } from '../api/migration';
import { CARD } from './ui';

export function ImportMasterView({
  sourceFile,
  updatedAt,
  isServerData,
  onImported,
}: {
  sourceFile: string | null;
  updatedAt: string | null;
  isServerData: boolean;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MigrationImportSummary | null>(null);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const result = await importMaster(file);
      setSummary(result);
      onImported();
    } catch (e) {
      const msg =
        (e as { response?: { data?: unknown } })?.response?.data ??
        'Не удалось загрузить — бэкенд недоступен?';
      setError(typeof msg === 'string' ? msg : 'Файл не принят — проверьте, что это мастер-файл.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ ...CARD, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 6 }}>
          Загрузить мастер-файл переезда
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-soft)', lineHeight: 1.55, marginBottom: 14 }}>
          Возьмите свежий <b>Ultra_Support_MASTER.xlsx</b> и загрузите сюда — обновятся модули,
          членство ролей и новинки. Бакеты, волны В1–В7, вердикты и Score пересчитаются сами.
          Нужны листы «Реестр+Борд», «Матрица», «Новинки» (+«модули» для заметок).
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <button
          onClick={pick}
          disabled={busy}
          style={{
            padding: '9px 18px',
            borderRadius: 9,
            border: 'none',
            background: busy ? 'var(--surf-2)' : '#4263d8',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Загружаю…' : 'Выбрать .xlsx'}
        </button>
        <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 12 }}>
          Сейчас на экране:{' '}
          {isServerData ? (
            <>
              серверные данные{sourceFile ? ` · ${sourceFile}` : ''}
              {updatedAt ? ` · обновлено ${new Date(updatedAt).toLocaleString('ru-RU')}` : ''}
            </>
          ) : (
            'встроенный снапшот от 02.07.2026 (сервер пуст или недоступен)'
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            ...CARD,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid #cf6b6b55',
            background: '#cf6b6b12',
            fontSize: 12.5,
            color: '#b55454',
            fontWeight: 600,
          }}
        >
          ⛔ {error}
        </div>
      )}

      {summary && (
        <div style={{ ...CARD, padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#4a9b7f', marginBottom: 8 }}>
            ✓ Загружено: {summary.modules} модулей · {summary.roles} ролей · {summary.novelties}{' '}
            новинок
          </div>
          {summary.warnings.length > 0 ? (
            <div style={{ fontSize: 12, color: '#b8862f', lineHeight: 1.55 }}>
              {summary.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              Кросс-чеки чистые: нужность сходится с членством, счёт новинок — с листом «Новинки».
            </div>
          )}
        </div>
      )}
    </div>
  );
}
