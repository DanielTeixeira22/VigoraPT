// API service for Notifications.

import { api } from './httpClient';
import type { Notification } from '../types/domain';

export const listNotifications = async (onlyUnread = false): Promise<Notification[]> => {
  const { data } = await api.get<Notification[]>('/notifications', { params: { onlyUnread } });
  return data;
};

export const markNotificationRead = async (id: string): Promise<Notification> => {
  const { data } = await api.post<Notification>(`/notifications/${id}/read`, {});
  return data;
};

export const markAllNotificationsRead = async (): Promise<{ message: string; modifiedCount: number }> => {
  const { data } = await api.post<{ message: string; modifiedCount: number }>('/notifications/read-all', {});
  return data;
};

export const sendAlert = async (payload: { clientId: string; message?: string }) => {
  const { data } = await api.post<Notification>('/notifications/alerts', payload);
  return data;
};
