import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delta, SnapshotInfo } from '../api/snapshots';
import { DeltaView } from './DeltaView';

const delta: Delta = {
  baseTakenAt: '2026-07-06T21:30:00Z',
  targetTakenAt: '2026-07-07T21:30:00Z',
  closed: [
    { key: 'BAC-1', title: 'Дочка закрылась', kind: 'sub', parent: 'R425 · Отчёт', was: 'plan', now: 'done' },
  ],
  new: [
    { key: 'BAC-9', title: 'Новая из интейка', kind: 'task', parent: '📥 Разобрать', was: null, now: 'plan' },
  ],
  statusChanged: [],
  gone: [],
  ownerChanged: [],
};

const snapshots: SnapshotInfo[] = [
  { id: 2, takenAt: '2026-07-07T21:30:00Z', entries: 10 },
  { id: 1, takenAt: '2026-07-06T21:30:00Z', entries: 9 },
];

vi.mock('../api/snapshots', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/snapshots')>()),
  fetchDelta: vi.fn(async () => delta),
  fetchSnapshots: vi.fn(async () => snapshots),
  takeSnapshot: vi.fn(async () => ({ id: 3, takenAt: '2026-07-07T22:00:00Z', entries: 10 })),
}));

afterEach(cleanup);

describe('Δ Что изменилось', () => {
  it('показывает счётчики и списки было→стало с чипами тикетов', async () => {
    render(<DeltaView />);

    await waitFor(() => expect(screen.getByText('✅ Закрытые')).toBeTruthy());
    expect(screen.getByText('Дочка закрылась')).toBeTruthy();
    expect(screen.getByText('BAC-1')).toBeTruthy(); // чип тикета
    expect(screen.getByText(/R425/)).toBeTruthy(); // родитель-эпик
    expect(screen.getByText('🆕 Новые')).toBeTruthy();
    expect(screen.getByText('Новая из интейка')).toBeTruthy();
    // селектор «сравнить с» наполнен слепками
    expect(screen.getByText('сравнить с: предыдущим')).toBeTruthy();
    // кнопка «Снапшот сейчас» на месте
    expect(screen.getByText('Снапшот сейчас')).toBeTruthy();
  });
});
