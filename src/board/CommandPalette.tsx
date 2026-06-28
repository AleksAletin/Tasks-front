// Command palette (brief §5.21, prototype ~1064 template + cmdItems builder ~1880).
// ⌘K / Ctrl+K glass modal: a search input over a live-filtered list spanning views,
// screens, actions, roles and tasks. Arrow up/down move a highlighted index, Enter
// activates, the selected row is tinted. Driven by ephemeral store state.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useBoard } from './store';
import type { BoardTab, Screen } from './store';

const ACCENT = '#4263d8';

interface CmdItem {
  kind: string;
  label: string;
  run: () => void;
}

export function CommandPalette() {
  const cmdOpen = useBoard((s) => s.cmdOpen);
  const cmdQuery = useBoard((s) => s.cmdQuery);
  const cmdIdx = useBoard((s) => s.cmdIdx);
  const groups = useBoard((s) => s.groups);
  const closeCmd = useBoard((s) => s.closeCmd);
  const setCmdQuery = useBoard((s) => s.setCmdQuery);
  const setCmdIdx = useBoard((s) => s.setCmdIdx);
  const setBoardTab = useBoard((s) => s.setBoardTab);
  const setScreen = useBoard((s) => s.setScreen);
  const openPanel = useBoard((s) => s.openPanel);
  const toggleDark = useBoard((s) => s.toggleDark);
  const setViewer = useBoard((s) => s.setViewer);
  const openSettings = useBoard((s) => s.openSettings);
  const startCoach = useBoard((s) => s.startCoach);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    (fn: () => void) => {
      closeCmd();
      setTimeout(fn, 10);
    },
    [closeCmd],
  );

  const items = useMemo<CmdItem[]>(() => {
    const tab = (t: BoardTab) => setBoardTab(t);
    const go = (sc: Screen) => setScreen(sc);
    const views: CmdItem[] = [
      { kind: 'Вид', label: 'Главная таблица', run: () => tab('table') },
      { kind: 'Вид', label: 'Таймлайн', run: () => tab('timeline') },
      { kind: 'Вид', label: 'Календарь', run: () => tab('calendar') },
      { kind: 'Вид', label: 'Паритет-матрица', run: () => tab('parity') },
      { kind: 'Вид', label: 'Что горит', run: () => tab('alerts') },
      { kind: 'Вид', label: 'Импорт из Excel', run: () => tab('import') },
      {
        kind: 'Экран',
        label: 'Дашборд и отчётность',
        run: () => go('dashboard'),
      },
      { kind: 'Экран', label: 'Пользователи и доступ', run: () => go('users') },
      { kind: 'Действие', label: 'Настройки', run: () => openSettings() },
      { kind: 'Действие', label: 'Тёмная тема', run: () => toggleDark() },
      {
        kind: 'Действие',
        label: 'Подсказки по работе',
        run: () => startCoach(),
      },
      { kind: 'Роль', label: 'Режим: Участник', run: () => setViewer(false) },
      { kind: 'Роль', label: 'Режим: Наблюдатель', run: () => setViewer(true) },
    ];
    const tasks: CmdItem[] = groups
      .flatMap((g) => g.tasks)
      .map((t) => ({
        kind: 'Задача',
        label: t.name,
        run: () => openPanel(t.id),
      }));
    const q = cmdQuery.trim().toLowerCase();
    let all = views.concat(tasks);
    if (q)
      all = all.filter(
        (i) =>
          i.label.toLowerCase().includes(q) || i.kind.toLowerCase().includes(q),
      );
    return all.slice(0, 8);
  }, [
    groups,
    cmdQuery,
    setBoardTab,
    setScreen,
    openPanel,
    toggleDark,
    setViewer,
    openSettings,
    startCoach,
  ]);

  useEffect(() => {
    if (cmdOpen) inputRef.current?.focus();
  }, [cmdOpen]);

  // Arrow up/down move the highlighted index, Enter activates the selected row. ⌘K
  // and Esc are handled globally in BoardApp; here we only steer the open list.
  useEffect(() => {
    if (!cmdOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCmdIdx(Math.min(items.length - 1, cmdIdx + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCmdIdx(Math.max(0, cmdIdx - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = items[cmdIdx];
        if (it) run(it.run);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, items, cmdIdx, setCmdIdx, run]);

  if (!cmdOpen) return null;

  return (
    <div
      onClick={closeCmd}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 140,
        background: 'rgba(20,22,28,0.36)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '13vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '92vw',
          background: 'var(--glass-hi)',
          backdropFilter: 'blur(40px) saturate(185%)',
          WebkitBackdropFilter: 'blur(40px) saturate(185%)',
          border: '1px solid var(--glass)',
          borderRadius: 17,
          boxShadow:
            '0 40px 90px var(--shadow-lg), inset 0 1px 0 var(--glass-hi)',
          overflow: 'hidden',
          animation: 'popIn .15s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '15px 17px',
            borderBottom: '1px solid var(--hover)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-faint)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={cmdQuery}
            onChange={(e) => setCmdQuery(e.target.value)}
            placeholder="Перейти к задаче, виду, роли…"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              outline: 'none',
              color: 'var(--text)',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-faint)',
              border: '1px solid var(--scrim)',
              borderRadius: 6,
              padding: '2px 7px',
            }}
          >
            ESC
          </span>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: 7 }}>
          {items.map((it, i) => {
            const active = i === cmdIdx;
            return (
              <div
                key={it.kind + '::' + it.label}
                onClick={() => run(it.run)}
                onMouseEnter={() => setCmdIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: active ? 'rgba(66,99,216,0.1)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '.4px',
                    color: 'var(--text-faint)',
                    minWidth: 62,
                  }}
                >
                  {it.kind}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {it.label}
                </span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            );
          })}
          {items.length === 0 && (
            <div
              style={{
                padding: 26,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-faint)',
              }}
            >
              Ничего не найдено
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '9px 15px',
            borderTop: '1px solid var(--hover)',
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--text-faint)',
          }}
        >
          <span>↑↓ навигация</span>
          <span>↵ открыть</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: ACCENT }}>⌘K вызвать</span>
        </div>
      </div>
    </div>
  );
}
