import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TicketsScreen } from './TicketsScreen';
import { useBoard } from '../board/store';
import * as api from '../api/feedback';
import type { TicketStaffView } from '../api/feedback';

vi.mock('../api/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/feedback')>()),
  listTickets: vi.fn(),
  staffReply: vi.fn(),
  setTicketStatus: vi.fn(),
  ticketToTask: vi.fn(),
}));
vi.mock('../api/board', () => ({
  fetchBoard: vi.fn().mockRejectedValue(new Error('нет бэка в тесте')),
}));

const ticket = (over: Partial<TicketStaffView> = {}): TicketStaffView => ({
  id: 1,
  number: 'ОС-1',
  status: 'new',
  type: 'problem',
  criticality: 'high',
  authorName: 'Анна Котова',
  authorEmail: 'a@office.lan',
  authorRole: 'П.Агент',
  section: 'Новая админка (Work)',
  moduleId: null,
  moduleName: '',
  text: 'Пропала кнопка блокировки',
  createdAt: '2026-07-03T10:00:00Z',
  updatedAt: '2026-07-03T10:00:00Z',
  replies: [],
  boardTaskId: null,
  token: 'tok',
  ...over,
});

describe('TicketsScreen (штабной инбокс)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoard.setState({ viewer: false, ticketsNewCount: 0 });
  });

  it('рендерит очередь, счётчики статусов и обновляет бейдж «новых»', async () => {
    vi.mocked(api.listTickets).mockResolvedValue([
      ticket(),
      ticket({ id: 2, number: 'ОС-2', status: 'answered' }),
    ]);

    render(<TicketsScreen />);

    expect(await screen.findByText('ОС-1')).toBeInTheDocument();
    expect(screen.getByText('все · 2')).toBeInTheDocument();
    expect(screen.getByText('новое · 1')).toBeInTheDocument();
    await waitFor(() => expect(useBoard.getState().ticketsNewCount).toBe(1));
  });

  it('ответ уходит через staffReply и статус в деталке меняется', async () => {
    vi.mocked(api.listTickets).mockResolvedValue([ticket()]);
    vi.mocked(api.staffReply).mockResolvedValue(
      ticket({
        status: 'answered',
        replies: [{ by: 'staff', text: 'Кнопка в меню «⋯»', at: '2026-07-03T11:00:00Z' }],
      }),
    );

    render(<TicketsScreen />);
    fireEvent.click(await screen.findByText('ОС-1'));
    fireEvent.change(screen.getByPlaceholderText(/Ответ автору/), {
      target: { value: 'Кнопка в меню «⋯»' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ответить' }));

    await waitFor(() => expect(api.staffReply).toHaveBeenCalledWith(1, 'Кнопка в меню «⋯»'));
    expect(await screen.findByText('Кнопка в меню «⋯»')).toBeInTheDocument();
    expect(screen.getAllByText('отвечено').length).toBeGreaterThan(0);
  });

  it('«Создать таску» зовёт to-task и показывает чип с id таски', async () => {
    vi.mocked(api.listTickets).mockResolvedValue([ticket()]);
    vi.mocked(api.ticketToTask).mockResolvedValue(
      ticket({ status: 'task_created', boardTaskId: 'fb_1' }),
    );

    render(<TicketsScreen />);
    fireEvent.click(await screen.findByText('ОС-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Создать таску' }));

    await waitFor(() => expect(api.ticketToTask).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/таска: fb_1/)).toBeInTheDocument();
  });

  it('Наблюдателю экран закрыт (персональные данные авторов)', () => {
    useBoard.setState({ viewer: true });
    render(<TicketsScreen />);

    expect(screen.getByText(/доступны только участникам/)).toBeInTheDocument();
    expect(api.listTickets).not.toHaveBeenCalled();
  });
});
