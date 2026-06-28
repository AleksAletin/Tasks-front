// Excel import wizard (brief §5.16, prototype buildImport ~2009 + template ~599).
// 4-step master: Загрузка → Превью → Маппинг → Импорт.
//   • VITE_USE_BACKEND off  → the canned prototype demo (no real parsing), 1:1 with the design.
//   • VITE_USE_BACKEND on   → wired to the backend: real file → POST /import/preview →
//     map board-task fields → POST /import/commit-board (load rows as tasks into an «Импорт из
//     Excel» group, then re-hydrate /board so they appear on the доска immediately).
import { useState, useEffect } from 'react';
import { useBoard } from './store';
import { fetchBoard } from '../api/board';
import {
  previewImport,
  commitImportToBoard,
  listMappings,
  saveMapping,
  type ImportPreview,
  type ImportResult,
  type MappingTemplate,
} from '../api/import';

const ACCENT = '#4263d8';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

const NOT_FOUND = '— не найдено —';

// [board field, auto-matched Excel column, required] — verbatim from the prototype (demo mode).
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

const PREVIEW_COLS = [
  'Название отчёта',
  'Модуль',
  'Роль',
  'Ответственный',
  'Состояние',
  'Эст. Разработка',
];
const PREVIEW_ROWS: string[][] = [
  ['Карточка обращения', 'Шапка', 'Саппорт', 'А. Котова', 'В работе', '5'],
  ['Список тикетов', 'Таблица', 'Саппорт', 'Д. Морозов', 'Готово', '3'],
  ['Импорт клиентов', 'ETL', 'Разработка', 'И. Романов', 'В работе', '5'],
  ['SLA-таймеры', 'Виджет', 'Саппорт', 'Е. Волкова', 'Блок', '4'],
];
const PREVIEW_GRID = '1.6fr 1fr 1fr 1.2fr 1fr 0.9fr';

// The distinct recognized Excel columns, used to populate the mapping dropdowns (demo mode).
const EXCEL_COLS: string[] = Array.from(
  new Set(FIELDS_RAW.map(([, x]) => x).filter((x) => x !== NOT_FOUND)),
);

const ERRORS: { row: string; msg: string }[] = [
  { row: '12 строка', msg: 'пустое обязательное поле «Роль»' },
  { row: '17 строка', msg: 'неизвестный статус «N/A» — не сопоставлен' },
];

// ── Real (backend) mode ────────────────────────────────────────────────────
const NONE = '— не выбрано —';

// The board-task fields the backend importer maps (ImportService.CommitToBoardAsync) + name-match
// hints. Name is the task title (required); Status/Due are normalized server-side (keyword → status
// enum, any date format → ISO); Owner/Note land in the task note (Excel owners can't map to demo ids).
const TARGET_FIELDS: {
  field: string;
  label: string;
  required: boolean;
  match: string[];
}[] = [
  {
    field: 'Name',
    label: 'Название задачи',
    required: true,
    match: ['отч', 'задачк', 'назван', 'модул', 'тема', 'name', 'title'],
  },
  {
    field: 'Status',
    label: 'Статус',
    required: false,
    match: ['состоян', 'статус', 'этап', 'status', 'state'],
  },
  {
    // Prefer the final due date: 'окончания' (genitive) hits «Дата окончания» but not
    // «Окончание Аналитики/Разработки»; avoid bare 'дата'/'оконч' (they'd grab a phase/start date).
    field: 'Due',
    label: 'Срок',
    required: false,
    match: ['срок сдач', 'дедлайн', 'окончания', 'дата оконч', 'срок', 'due', 'finish'],
  },
  {
    field: 'Owner',
    label: 'Исполнитель',
    required: false,
    match: ['исполн', 'ответствен', 'owner', 'assign', 'manager'],
  },
  {
    field: 'Note',
    label: 'Заметка',
    required: false,
    match: ['примеч', 'коммент', 'заметк', 'опис', 'тикет', 'bac', 'задачк', 'note', 'desc'],
  },
];

function autoMatch(columns: string[], keywords: string[]): string {
  const lower = columns.map((c) => c.toLowerCase());
  for (const kw of keywords) {
    const i = lower.findIndex((c) => c && c.includes(kw));
    if (i >= 0) return columns[i];
  }
  return NONE;
}

function errMsg(e: unknown): string {
  const ax = e as { response?: { status?: number; data?: unknown }; message?: string };
  if (ax?.response?.status === 401 || ax?.response?.status === 403) {
    return 'Нет доступа к импорту (нужна авторизация). Локально работает в dev-режиме API.';
  }
  const d = ax?.response?.data;
  if (typeof d === 'string' && d.trim()) return d;
  return ax?.message ?? 'Не удалось выполнить запрос.';
}

function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-faint)"
      strokeWidth="2.2"
    >
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
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                height: 2,
                background: lineBg,
                margin: '0 10px',
                borderRadius: 2,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function WizardShell({
  step,
  children,
  footer,
}: {
  step: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div style={{ padding: '20px 22px 50px', maxWidth: 760 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>
          Импорт из Excel
        </h2>
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
        {children}
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
          {footer}
        </div>
      </div>
    </div>
  );
}

function navBtn(label: string, onClick: () => void, primary: boolean, disabled = false) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        height: 40,
        padding: primary ? '0 22px' : '0 18px',
        border: primary ? 'none' : '1px solid var(--hover)',
        background: primary ? ACCENT : 'transparent',
        color: primary ? '#fff' : 'var(--text-mut)',
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── Demo (canned) wizard — VITE_USE_BACKEND off ────────────────────────────
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
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="1.8"
          style={{ marginBottom: 10 }}
        >
          <path d="M12 3v12M8 11l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)' }}>
          Перетащите файл или выберите
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>
          .xlsx или .csv до 10 МБ
        </div>
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
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4a9b7f"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
            gant_pereezd.xlsx
          </div>
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

function PreviewTable({
  cols,
  rows,
  grid,
}: {
  cols: string[];
  rows: string[][];
  grid: string;
}) {
  return (
    <div style={{ border: '1px solid var(--hover)', borderRadius: 11, overflow: 'hidden' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: grid,
          background: 'var(--surf-1)',
          borderBottom: '1px solid var(--hover)',
        }}
      >
        {cols.map((c, i) => (
          <div
            key={i}
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
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: grid,
            borderBottom: '1px solid var(--hover)',
          }}
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
  );
}

function MappingRow({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required: boolean;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const empty = value === NOT_FOUND || value === NONE;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 18px 1.2fr',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
        {label}
        {required && <span style={{ color: '#cf6b6b' }}> *</span>}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--line)" strokeWidth="2">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            width: '100%',
            height: 36,
            padding: '0 30px 0 11px',
            border: '1px solid var(--hover)',
            borderRadius: 9,
            background: empty ? 'var(--red-tint)' : 'var(--glass)',
            fontSize: 12.5,
            fontWeight: 600,
            color: empty ? '#cf6b6b' : 'var(--text-3)',
            cursor: 'pointer',
          }}
        >
          {options.map((col) => (
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
}

function MockImportWizard() {
  const step = useBoard((s) => s.importStep);
  const importDone = useBoard((s) => s.importDone);
  const importTemplate = useBoard((s) => s.importTemplate);
  const importMap = useBoard((s) => s.importMap);
  const setImportField = useBoard((s) => s.setImportField);
  const importNext = useBoard((s) => s.importNext);
  const importBack = useBoard((s) => s.importBack);
  const importRun = useBoard((s) => s.importRun);
  const importReset = useBoard((s) => s.importReset);
  const toggleImportTemplate = useBoard((s) => s.toggleImportTemplate);

  const canBack = step > 1 && !importDone;
  const primaryLabel = importDone ? 'Готово' : step < 4 ? 'Далее' : 'Импортировать';
  const onPrimary = importDone ? importReset : step < 4 ? importNext : importRun;

  return (
    <WizardShell
      step={step}
      footer={
        <>
          {canBack && navBtn('Назад', importBack, false)}
          <div style={{ flex: 1 }} />
          <label
            onClick={toggleImportTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              color: 'var(--text-soft)',
              cursor: 'pointer',
            }}
          >
            <span
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
          {navBtn(primaryLabel, onPrimary, true)}
        </>
      }
    >
      {step === 1 && <StepUpload />}
      {step === 2 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 12 }}>
            Первые строки файла — колонки распознаны:
          </div>
          <PreviewTable cols={PREVIEW_COLS} rows={PREVIEW_ROWS} grid={PREVIEW_GRID} />
        </>
      )}
      {step === 3 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 14 }}>
            Сопоставьте поля борды с колонками Excel — авто-подбор по имени, поправьте при необходимости.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {FIELDS_RAW.map(([field, autoExcel, req]) => (
              <MappingRow
                key={field}
                label={field}
                required={req}
                value={importMap[field] ?? autoExcel}
                options={[NOT_FOUND, ...EXCEL_COLS]}
                onChange={(v) => setImportField(field, v)}
              />
            ))}
          </div>
        </>
      )}
      {step === 4 && <MockDone done={importDone} />}
      {importDone && <DoneToast text="Импорт завершён · создано 14, обновлено 2" />}
    </WizardShell>
  );
}

function MockDone({ done }: { done: boolean }) {
  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '18px 0' }}>
        <DoneCircle />
        <div style={{ fontSize: 16, fontWeight: 800 }}>Импорт завершён</div>
        <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 5 }}>
          Создано 14 · обновлено 2 · реестр Саппорта наполнен
        </div>
      </div>
    );
  }
  const summary = [
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
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mut)', marginTop: 2 }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {ERRORS.map((e) => (
          <ErrorRow key={e.row} head={e.row} msg={e.msg} />
        ))}
      </div>
    </>
  );
}

function DoneCircle() {
  return (
    <div
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
  );
}

function ErrorRow({ head, msg }: { head: string; msg: string }) {
  return (
    <div
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
      <span style={{ color: '#cf6b6b', fontWeight: 800, whiteSpace: 'nowrap' }}>{head}</span>
      <span style={{ color: 'var(--text-soft)' }}>{msg}</span>
    </div>
  );
}

function DoneToast({ text }: { text: string }) {
  return (
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
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{text}</span>
    </div>
  );
}

// ── Real (backend-wired) wizard — VITE_USE_BACKEND on ──────────────────────
function RealImportWizard() {
  const hydrateBoard = useBoard((s) => s.hydrateBoard);
  const setBoardTab = useBoard((s) => s.setBoardTab);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [saveAsTpl, setSaveAsTpl] = useState(false);

  useEffect(() => {
    listMappings()
      .then(setTemplates)
      .catch(() => {});
  }, []);

  // Apply a saved field→column template, keeping only columns the current file actually has.
  const applyTemplate = (t: MappingTemplate) => {
    const cur = preview?.columns ?? [];
    try {
      const saved = JSON.parse(t.columnMapJson) as Record<string, string>;
      const next: Record<string, string> = {};
      for (const f of TARGET_FIELDS) {
        const col = saved[f.field];
        next[f.field] = col && cur.includes(col) ? col : NONE;
      }
      setMap(next);
    } catch {
      /* ignore a malformed template */
    }
  };

  const onFile = async (f: File) => {
    setError(null);
    setLoading(true);
    setFile(f);
    setPreview(null);
    setResult(null);
    try {
      const p = await previewImport(f);
      setPreview(p);
      const m: Record<string, string> = {};
      for (const t of TARGET_FIELDS) m[t.field] = autoMatch(p.columns, t.match);
      setMap(m);
    } catch (e) {
      setFile(null);
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const nameCol = map.Name;
  const nameOk = !!nameCol && nameCol !== NONE;

  const commit = async () => {
    if (!file || !preview || !nameOk) return;
    setError(null);
    setLoading(true);
    try {
      const columnMap: Record<string, string> = {};
      for (const t of TARGET_FIELDS) {
        const col = map[t.field];
        if (col && col !== NONE) columnMap[col] = t.field;
      }
      const res = await commitImportToBoard(file, {
        groupName: 'Импорт из Excel',
        columnMap,
      });
      setResult(res);
      // Pull the freshly-written board so the new «Импорт из Excel» group shows on the доска at once
      // (the debounced sync would also re-persist it — this just avoids waiting for a reload).
      try {
        hydrateBoard(await fetchBoard());
      } catch {
        /* the board will pick the group up on its next load */
      }
      if (saveAsTpl) {
        const name = file.name.replace(/\.[^.]+$/, '') || 'Шаблон';
        await saveMapping(name, JSON.stringify(map)).catch(() => {});
        listMappings().then(setTemplates).catch(() => {});
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMap({});
    setResult(null);
    setError(null);
  };

  const canNext =
    step === 1 ? !!preview && !loading : step === 3 ? nameOk : true;
  const primaryLabel =
    step < 4 ? 'Далее' : result ? 'Готово' : loading ? 'Импорт…' : 'Импортировать';
  const onPrimary = () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (result) {
      reset();
      setBoardTab('table'); // land on the доска so the imported «Импорт из Excel» group is visible
      return;
    }
    void commit();
  };

  const cols = preview?.columns ?? [];
  const colOptions = [NONE, ...cols.filter((c) => c.trim())];
  const previewGrid = `repeat(${Math.min(cols.filter((c) => c.trim()).length || 1, 7)}, minmax(0, 1fr))`;

  return (
    <WizardShell
      step={step}
      footer={
        <>
          {step > 1 && !result && navBtn('Назад', () => setStep(step - 1), false)}
          <div style={{ flex: 1 }} />
          {step >= 3 && !result && (
            <label
              onClick={() => setSaveAsTpl((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12.5,
                color: 'var(--text-soft)',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: saveAsTpl ? 'none' : '2px solid var(--line)',
                  background: saveAsTpl ? ACCENT : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                {saveAsTpl && (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12l5 5L20 6" />
                  </svg>
                )}
              </span>
              Сохранить как шаблон
            </label>
          )}
          {error && (
            <span style={{ fontSize: 12, color: '#cf6b6b', fontWeight: 600, maxWidth: 360 }}>
              {error}
            </span>
          )}
          {navBtn(primaryLabel, onPrimary, true, step < 4 && !canNext)}
        </>
      }
    >
      {step === 1 && (
        <RealUpload file={file} loading={loading} preview={preview} onFile={onFile} />
      )}
      {step === 2 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 12 }}>
            Распознано колонок: {cols.filter((c) => c.trim()).length} · всего строк данных:{' '}
            {preview?.totalRows ?? 0}. Первые строки:
          </div>
          <div style={{ overflowX: 'auto' }}>
            <PreviewTable
              cols={cols.filter((c) => c.trim()).slice(0, 7)}
              rows={(preview?.rows ?? [])
                .slice(0, 6)
                .map((r) => cols.map((c, i) => (c.trim() ? r[i] ?? '' : '')).filter((_, i) => cols[i]?.trim()).slice(0, 7))}
              grid={previewGrid}
            />
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)', marginBottom: 14 }}>
            Сопоставьте поля задачи с колонками файла — авто-подбор по имени, поправьте при
            необходимости. Строки лягут на доску задачами в группе «Импорт из Excel».
          </div>
          {templates.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 7,
                marginBottom: 14,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Шаблоны:</span>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  style={{
                    height: 26,
                    padding: '0 11px',
                    border: '1px solid var(--line)',
                    background: 'var(--glass)',
                    color: 'var(--text-3)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TARGET_FIELDS.map((t) => (
              <MappingRow
                key={t.field}
                label={t.label}
                required={t.required}
                value={map[t.field] ?? NONE}
                options={colOptions}
                onChange={(v) => setMap((m) => ({ ...m, [t.field]: v }))}
              />
            ))}
          </div>
        </>
      )}
      {step === 4 && <RealDone result={result} loading={loading} />}
      {result && (
        <DoneToast text={`Импорт завершён · ${result.created} задач на доске`} />
      )}
    </WizardShell>
  );
}

function RealUpload({
  file,
  loading,
  preview,
  onFile,
}: {
  file: File | null;
  loading: boolean;
  preview: ImportPreview | null;
  onFile: (f: File) => void;
}) {
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };
  return (
    <>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files);
        }}
        style={{
          display: 'block',
          border: '2px dashed var(--line)',
          borderRadius: 14,
          padding: 30,
          textAlign: 'center',
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        <input
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={(e) => pick(e.target.files)}
        />
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="1.8"
          style={{ marginBottom: 10 }}
        >
          <path d="M12 3v12M8 11l4 4 4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)' }}>
          Перетащите файл или выберите
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 3 }}>
          .xlsx или .csv до 10 МБ
        </div>
      </label>
      {file && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: loading ? 'var(--hover)' : 'rgba(74,155,127,0.08)',
            border: `1px solid ${loading ? 'var(--line)' : 'rgba(74,155,127,0.25)'}`,
            borderRadius: 11,
            padding: '11px 13px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={loading ? 'var(--text-faint)' : '#4a9b7f'} strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
              {(file.size / 1024).toFixed(0)} КБ ·{' '}
              {loading
                ? 'разбираю…'
                : preview
                  ? `распознано ${preview.columns.filter((c) => c.trim()).length} колонок, ${preview.totalRows} строк`
                  : 'загружен'}
            </div>
          </div>
          {!loading && preview && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4a9b7f' }}>✓</span>
          )}
        </div>
      )}
    </>
  );
}

function RealDone({ result, loading }: { result: ImportResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-soft)', fontSize: 14 }}>
        Создаю задачи на доске…
      </div>
    );
  }
  if (result) {
    return (
      <>
        <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
          <DoneCircle />
          <div style={{ fontSize: 16, fontWeight: 800 }}>Импорт завершён</div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 5 }}>
            На доску добавлено задач: {result.created} · группа «Импорт из Excel»
            {result.errors.length > 0 ? ` · пропущено ${result.errors.length}` : ''}
          </div>
        </div>
        {result.errors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 200, overflowY: 'auto' }}>
            {result.errors.slice(0, 20).map((e, i) => (
              <ErrorRow key={i} head="пропуск" msg={e} />
            ))}
          </div>
        )}
      </>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-soft)', fontSize: 14 }}>
      Готово к импорту — нажмите «Импортировать».
    </div>
  );
}

export function ImportWizard() {
  return USE_BACKEND ? <RealImportWizard /> : <MockImportWizard />;
}
