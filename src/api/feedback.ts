import { apiClient } from './client';

/** One message in a ticket's thread. */
export interface TicketReply {
  by: 'author' | 'staff';
  text: string;
  at: string;
}

/** Pickers for the public form (модули/роли приходят из датасета переезда). */
export interface FeedbackFormMeta {
  sections: string[];
  modules: { id: number; name: string }[];
  roles: string[];
}

export interface FeedbackCreatePayload {
  authorName: string;
  authorEmail: string;
  authorRole: string;
  section: string;
  moduleId: number | null;
  type: 'question' | 'problem' | 'change';
  criticality: 'low' | 'normal' | 'high' | 'critical';
  text: string;
  baseUrl: string;
}

export interface FeedbackCreated {
  id: number;
  number: string;
  token: string;
}

/** Author-visible ticket (via the personal token link). */
export interface FeedbackPublicView {
  id: number;
  number: string;
  status: string;
  type: string;
  criticality: string;
  section: string;
  moduleName: string;
  text: string;
  createdAt: string;
  replies: TicketReply[];
}

/** Staff inbox projection. */
export interface TicketStaffView {
  id: number;
  number: string;
  status: string;
  type: string;
  criticality: string;
  authorName: string;
  authorEmail: string;
  authorRole: string;
  section: string;
  moduleId: number | null;
  moduleName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
  boardTaskId: string | null;
  token: string;
}

// ---- public (форма по общей ссылке + персональный трек) ----

export async function fetchFormMeta(): Promise<FeedbackFormMeta> {
  const { data } = await apiClient.get<FeedbackFormMeta>('/feedback/form-meta');
  return data;
}

export async function createFeedback(payload: FeedbackCreatePayload): Promise<FeedbackCreated> {
  const { data } = await apiClient.post<FeedbackCreated>('/feedback', payload);
  return data;
}

export async function trackFeedback(id: number, token: string): Promise<FeedbackPublicView> {
  const { data } = await apiClient.get<FeedbackPublicView>(`/feedback/${id}`, {
    params: { token },
  });
  return data;
}

export async function authorReply(id: number, token: string, text: string): Promise<void> {
  await apiClient.post(`/feedback/${id}/reply`, { text }, { params: { token } });
}

// ---- staff (инбокс + триаж) ----

export async function listTickets(): Promise<TicketStaffView[]> {
  const { data } = await apiClient.get<TicketStaffView[]>('/tickets');
  return data;
}

export async function staffReply(
  id: number,
  text: string,
  status?: string,
): Promise<TicketStaffView> {
  const { data } = await apiClient.post<TicketStaffView>(`/tickets/${id}/reply`, { text, status });
  return data;
}

export async function setTicketStatus(id: number, status: string): Promise<TicketStaffView> {
  const { data } = await apiClient.post<TicketStaffView>(`/tickets/${id}/status`, { status });
  return data;
}

export async function ticketToTask(id: number): Promise<TicketStaffView> {
  const { data } = await apiClient.post<TicketStaffView>(`/tickets/${id}/to-task`);
  return data;
}

// ---- shared display maps ----

export const TICKET_STATUS_RU: Record<string, string> = {
  new: 'новое',
  in_progress: 'в работе',
  answered: 'отвечено',
  task_created: 'заведена задача',
  rejected: 'отклонено',
};

export const TICKET_STATUS_COLOR: Record<string, string> = {
  new: '#4263d8',
  in_progress: '#c8893f',
  answered: '#4a9b7f',
  task_created: '#8a63d8',
  rejected: '#8a8f98',
};

export const TICKET_TYPE_RU: Record<string, string> = {
  question: 'вопрос',
  problem: 'проблема',
  change: 'доработка',
};

export const TICKET_CRIT_RU: Record<string, string> = {
  low: 'низкая',
  normal: 'обычная',
  high: 'высокая',
  critical: 'критичная',
};
