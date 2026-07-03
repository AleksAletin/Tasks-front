import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FeedbackApp } from './FeedbackApp';
import * as api from '../api/feedback';

vi.mock('../api/feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/feedback')>()),
  fetchFormMeta: vi.fn(),
  createFeedback: vi.fn(),
  trackFeedback: vi.fn(),
  authorReply: vi.fn(),
}));

describe('FeedbackApp (публичная форма и трек)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchFormMeta).mockResolvedValue({
      sections: ['Новая админка (Work)', 'Другое'],
      modules: [{ id: 9, name: 'Отчёт «Карточка игрока»' }],
      roles: ['П.Агент'],
    });
  });

  it('не отправляет пустую форму и показывает ошибку', async () => {
    window.history.pushState({}, '', '/feedback');
    render(<FeedbackApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Отправить обращение' }));

    expect(await screen.findByText(/Заполните имя и текст/)).toBeInTheDocument();
    expect(api.createFeedback).not.toHaveBeenCalled();
  });

  it('отправляет обращение и показывает персональную ссылку', async () => {
    vi.mocked(api.createFeedback).mockResolvedValue({ id: 7, number: 'ОС-7', token: 'tok7' });
    window.history.pushState({}, '', '/feedback');
    render(<FeedbackApp />);

    fireEvent.change(await screen.findByPlaceholderText('Иван Иванов'), {
      target: { value: 'Анна Котова' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Что делали/), {
      target: { value: 'Не видно историю блокировок' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отправить обращение' }));

    expect(await screen.findByText(/ОС-7 принято/)).toBeInTheDocument();
    expect(screen.getByText(/\/feedback\/t\/7\?token=tok7/)).toBeInTheDocument();
    expect(api.createFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: 'Анна Котова',
        text: 'Не видно историю блокировок',
        type: 'question',
      }),
    );
  });

  it('страница трека показывает статус, текст и ответ команды', async () => {
    vi.mocked(api.trackFeedback).mockResolvedValue({
      id: 7,
      number: 'ОС-7',
      status: 'answered',
      type: 'problem',
      criticality: 'high',
      section: 'Новая админка (Work)',
      moduleName: '',
      text: 'Не видно историю блокировок',
      createdAt: '2026-07-03T10:00:00Z',
      replies: [{ by: 'staff', text: 'Вкладка переехала в «Историю»', at: '2026-07-03T11:00:00Z' }],
    });
    window.history.pushState({}, '', '/feedback/t/7?token=tok7');
    render(<FeedbackApp />);

    expect(await screen.findByText('ОС-7')).toBeInTheDocument();
    expect(screen.getByText('отвечено')).toBeInTheDocument();
    expect(screen.getByText('Вкладка переехала в «Историю»')).toBeInTheDocument();
    await waitFor(() => expect(api.trackFeedback).toHaveBeenCalledWith(7, 'tok7'));
  });

  it('чужой/битый токен → «не найдено», без утечки существования', async () => {
    vi.mocked(api.trackFeedback).mockRejectedValue(new Error('404'));
    window.history.pushState({}, '', '/feedback/t/7?token=wrong');
    render(<FeedbackApp />);

    expect(await screen.findByText('Обращение не найдено')).toBeInTheDocument();
  });
});
