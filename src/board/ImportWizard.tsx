// Excel import wizard (brief §5.16, prototype buildImport ~2009 + template ~599).
// 4-step master: Загрузка → Превью → Маппинг → Импорт. Demo dataset is canned
// (no real parsing) — column names, sample rows and validation numbers are 1:1
// with the prototype. Ephemeral wizard state lives in the store (not persisted).
import { useBoard } from './store';

const ACCENT = '#4263d8';

const NOT_FOUND = '— не найдено —';

// [board field, auto-matched Excel column, required] — verbatim from the prototype.
const FIELDS_RAW: [string, string, boolean][] = [
  ['Отчёт', 'Название отчёта', true],
  ['Модуль', 'Модуль / Столбец', true],
  ['Раздел', 'Раздел', false],
  ['Роль', 'Роль', true],
  ['Исполнитель', 'Ответственный', false],
  ['Сложность', 'Сложность', false],
  ['Тикет', 'Ссылка (BAC/YouTrack)', false],
  ['Аналитика: оценка', 'Эст. Аналитика', false],
  ['Разработка: оценка', 'Эст. Разработка', false],
  ['Тестирование: оценка', 'Эст. Тестирование', false],
  ['Статус', 'Состояние', true],
  ['% выполнения', NOT_FOUND, false],
  ['Паритет', NOT_FOUND, false],
];

const PREVIEW_COLS = ['Название отчёта', 'Модуль', 'Роль', 'Ответственный', 'Состояние', 'Эст. Разработка'];
const PREVIEW_ROWS: string[][] = [
  ['Карточка обращения', 'Шапка', 'Саппорт', 'А. Котова', 'В работе', '5'],
  ['Список тикетов', 'Таблица', 'Саппорт', 'Д. Морозов', 'Готово', '3'],
  ['Импорт клиентов', 'ETL', 'Разработка', 'И. Романов', 'В работе', '5'],
  ['SLA-таймеры', 'Виджет', 'Саппорт', 'Е. Волкова', 'Блок', '4'],
];
const PREVIEW_GRID = '1.6fr 1fr 1fr 1.2fr 1fr 0.9fr';

// The distinct recognized Excel columns, used to populate the mapping dropdowns.
const EXCEL_COLS: string[] = Array.from(
  new Set(FIELDS_RAW.map(([, x]) => x).filter((x) => x !== NOT_FOUND)),
);

const ERRORS: { row: string; msg: string }[] = [
  { row: '12 строка', msg: 'пустое обязательное поле «Роль»' },
  { row: '17 строка', msg: 'неизвестный статус «N/A» — не сопоставлен' },
];

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2.2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Prototype-styled faux dropdown: a fixed label + chevron (Лист / Строка заголовков).
function PickerBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: 'var(--text-soft)',
          textTransform: 'uppercase',
          letterSpacing: '.3px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 38,
          padding: '0 12px',
          border: '1px solid var(--hover)',
          borderRadius: 10,
          background: 'var(--glass)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {value}
        <Chevron />
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps: [number, string][] = [
    [1, 'Загрузка'],
    [2, 'Превью'],
    [3, 'Маппинг'],
    [4, 'Импорт'],
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
      {steps.map(([n, label]) => {
        const bg = n === step ? ACCENT : n < step ? '#4a9b7f' : 'var(--hover)';
        const fg = n <= step ? '#fff' : 'var(--text-faint)';
        const lineBg = n < step ? '#4a9b7f' : 'var(--hover)';
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="noinv"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: bg,
                  color: fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            <div style={{ flex: 1, height: 2, background: lineBg, margin: '0 10px', borderRadius: 2 }} />
          </div>
        );
      })}
    </div>
  );
}

function StepUpload() {
  return (
    <>
      <div
        style={{
          border: '2px dashed var(--line)',
          borderRadius: 14,
          padding: 30,
          textAlign: 'center',
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" style={{ marginBottom: 10 }}>
          <path d="M12 3v12M8 11l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)' }}>Перетащите файл или выберите</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>.xlsx или .csv до 10 МБ</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          background: 'rgba(74,155,127,0.08)',
          border: '1px solid rgba(74,155,127,0.25)',
          borderRadius: 11,
          padding: '11px 13px',
          marginBottom: 16,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9b7f" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>gant_pereezd.xlsx</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>84 КБ · загружен</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#4a9b7f' }}>✓</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <PickerBox label="Лист" value="Саппорт" />
        <PickerBox label="Строка заголовков" value="1" />
      </div>
    </>
  );
}

function StepPreview() {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 12 }}>
        Первые строки файла — колонки распознаны:
      </div>
      <div style={{ border: '1px solid var(--hover)', borderRadius: 11, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: PREVIEW_GRID,
            background: 'var(--surf-1)',
            borderBottom: '1px solid var(--hover)',
          }}
        >
          {PREVIEW_COLS.map((c) => (
            <div
              key={c}
              style={{
                padding: '9px 11px',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text-soft)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c}
            </div>
          ))}
        </div>
        {PREVIEW_ROWS.map((r, i) => (
          <div
            key={i}
            style={{ display: 'grid', gridTemplateColumns: PREVIEW_GRID, borderBottom: '1px solid var(--hover)' }}
          >
            {r.map((cell, j) => (
              <div
                key={j}
                style={{
                  padding: '9px 11px',
                  fontSize: 12.5,
                  color: 'var(--text-3)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function StepMapping() {
  const importMap = useBoard((s) => s.importMap);
  const setImportField = useBoard((s) => s.setImportField);

  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 14 }}>
        Сопоставьте поля борды с колонками Excel — авто-подбор по имени, поправьте при необходимости.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
        {FIELDS_RAW.map(([field, autoExcel, req]) => {
          const value = importMap[field] ?? autoExcel;
          const notMapped = value === NOT_FOUND;
          return (
            <div
              key={field}
              style={{ display: 'grid', gridTemplateColumns: '1fr 18px 1.2fr', alignItems: 'center', gap: 10 }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                {field}
                {req && <span style={{ color: '#cf6b6b' }}> *</span>}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <div style={{ position: 'relative' }}>
                <select
                  value={value}
                  onChange={(e) => setImportField(field, e.target.value)}
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    width: '100%',
                    height: 36,
                    padding: '0 30px 0 11px',
                    border: '1px solid var(--hover)',
                    borderRadius: 9,
                    background: notMapped ? 'var(--red-tint)' : 'var(--glass)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: notMapped ? '#cf6b6b' : 'var(--text-3)',
                    cursor: 'pointer',
                  }}
                >
                  <option value={NOT_FOUND}>{NOT_FOUND}</option>
                  {EXCEL_COLS.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 10, top: 11, pointerEvents: 'none' }}>
                  <Chevron size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StepValidateDone() {
  const importDone = useBoard((s) => s.importDone);

  if (importDone) {
    return (
      <div style={{ textAlign: 'center', padding: '18px 0' }}>
        <div
          className="noinv"
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'var(--green-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a9b7f" strokeWidth="2.6">
            <path d="M5 12l5 5L20 6" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Импорт завершён</div>
        <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 5 }}>
          Создано 14 · обновлено 2 · реестр Саппорта наполнен
        </div>
      </div>
    );
  }

  const summary: { value: string; label: string; color: string; bg: string }[] = [
    { value: '16', label: 'строк готовы', color: '#4a9b7f', bg: 'rgba(74,155,127,0.08)' },
    { value: '2', label: 'с ошибками', color: '#cf6b6b', bg: 'rgba(207,107,107,0.08)' },
    { value: '14/2', label: 'создать / обновить', color: 'var(--text-3)', bg: 'var(--hover)' },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {summary.map((c) => (
          <div key={c.label} style={{ flex: 1, background: c.bg, borderRadius: 11, padding: 13 }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: c.color }}>
              {c.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mut)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ERRORS.map((e) => (
          <div
            key={e.row}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontSize: 12.5,
              padding: '9px 11px',
              background: 'var(--red-tint)',
              borderRadius: 9,
            }}
          >
            <span style={{ color: '#cf6b6b', fontWeight: 800 }}>{e.row}</span>
            <span style={{ color: 'var(--text-soft)' }}>{e.msg}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ImportWizard() {
  const step = useBoard((s) => s.importStep);
  const importDone = useBoard((s) => s.importDone);
  const importTemplate = useBoard((s) => s.importTemplate);
  const importNext = useBoard((s) => s.importNext);
  const importBack = useBoard((s) => s.importBack);
  const importRun = useBoard((s) => s.importRun);
  const importReset = useBoard((s) => s.importReset);
  const toggleImportTemplate = useBoard((s) => s.toggleImportTemplate);

  const canBack = step > 1 && !importDone;
  const primaryLabel = importDone ? 'Готово' : step < 4 ? 'Далее' : 'Импортировать';
  const onPrimary = importDone ? importReset : step < 4 ? importNext : importRun;

  return (
    <div style={{ padding: '20px 22px 50px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>Импорт из Excel</h2>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-soft)' }}>
          мост от текущего гант-файла · дальше данные тянутся из систем
        </span>
      </div>

      <Stepper step={step} />

      <div
        style={{
          background: 'var(--glass)',
          backdropFilter: 'blur(20px) saturate(165%)',
          WebkitBackdropFilter: 'blur(20px) saturate(165%)',
          border: '1px solid var(--glass)',
          borderRadius: 16,
          boxShadow: 'inset 0 1px 0 var(--glass)',
          padding: 22,
        }}
      >
        {step === 1 && <StepUpload />}
        {step === 2 && <StepPreview />}
        {step === 3 && <StepMapping />}
        {step === 4 && <StepValidateDone />}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid var(--hover)',
          }}
        >
          {canBack && (
            <button
              onClick={importBack}
              style={{
                height: 40,
                padding: '0 18px',
                border: '1px solid var(--hover)',
                background: 'transparent',
                color: 'var(--text-mut)',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Назад
            </button>
          )}
          <div style={{ flex: 1 }} />
          <label
            onClick={toggleImportTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-soft)', cursor: 'pointer' }}
          >
            <span
              className={importTemplate ? 'noinv' : undefined}
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: importTemplate ? 'none' : '2px solid var(--line)',
                background: importTemplate ? ACCENT : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              {importTemplate && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 6" />
                </svg>
              )}
            </span>
            Сохранить маппинг как шаблон
          </label>
          <button
            onClick={onPrimary}
            className="noinv"
            style={{
              height: 40,
              padding: '0 22px',
              border: 'none',
              background: ACCENT,
              color: '#fff',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      {importDone && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: 'var(--glass-hi)',
            backdropFilter: 'blur(30px) saturate(185%)',
            WebkitBackdropFilter: 'blur(30px) saturate(185%)',
            border: '1px solid var(--glass)',
            borderRadius: 13,
            boxShadow: '0 18px 50px var(--shadow), inset 0 1px 0 var(--glass-hi)',
            padding: '13px 16px',
            animation: 'toastIn .26s ease',
          }}
        >
          <span
            className="noinv"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#4a9b7f',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12l5 5L20 6" />
            </svg>
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            Импорт завершён · создано 14, обновлено 2
          </span>
        </div>
      )}
    </div>
  );
}
