import { api } from './httpClient';
import type { Conversation, Message } from '../types/domain';

export const ensureConversation = async (payload: {
  clientId: string;
  trainerId: string;
  clientUserId: string;
  trainerUserId: string;
}) => {
  const { data } = await api.post<Conversation>('/chat/conversations', payload);
  return data;
};

export const listConversations = async (params?: { page?: number; limit?: number }) => {
  const { data } = await api.get<{ items: Conversation[]; page: number; total: number; pages: number }>('/chat/conversations', {
    params,
  });
  return data;
};

export const listMessages = async (conversationId: string, params?: { page?: number; limit?: number }) => {
  const { data } = await api.get<{ items: Message[]; page: number; total: number; pages: number }>(
    `/chat/conversations/${conversationId}/messages`,
    { params }
  );
  return data;
};

export const sendMessage = async (conversationId: string, payload: { content: string; attachments?: string[] }) => {
  const { data } = await api.post<Message>(`/chat/conversations/${conversationId}/messages`, payload);
  return data;
};

export const markMessageRead = async (messageId: string) => {
  const { data } = await api.post<Message>(`/chat/messages/${messageId}/read`, {});
  return data;
};
