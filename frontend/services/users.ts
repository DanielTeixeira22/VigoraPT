// API service for Users.

import { api } from './httpClient';
import type { Role, User } from '../types/domain';

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/users/me');
  return data;
};

export const updateMe = async (payload: Partial<User['profile']> & { email?: string; avatarUrl?: string }): Promise<User> => {
  const { data } = await api.put<User>('/users/me', payload);
  return data;
};

export const changePassword = async (payload: { currentPassword: string; newPassword: string }) => {
  const { data } = await api.patch<{ message: string }>('/users/me/password', payload);
  return data;
};

export const searchUsers = async (params: { q?: string; role?: Role; page?: number; limit?: number }) => {
  const { data } = await api.get<{ data: User[]; page: number; total: number }>('/users', { params });
  return data;
};

export const adminCreateUser = async (payload: {
  username: string;
  email: string;
  password: string;
  role: Role;
  firstName?: string;
  lastName?: string;
}) => {
  const { data } = await api.post('/users', payload);
  return data;
};

export const adminUpdateUser = async (id: string, payload: Partial<User> & { role?: Role; isActive?: boolean }) => {
  const { data } = await api.put<User>(`/users/${id}`, payload);
  return data;
};

export const toggleUserActive = async (id: string) => {
  const { data } = await api.patch<{ id: string; isActive: boolean }>(`/users/${id}/toggle`, {});
  return data;
};
