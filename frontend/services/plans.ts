import { api } from './httpClient';
import type { Paginated, TrainingPlan, TrainingSession, CompletionLog, CompletionStatus } from '../types/domain';

export const listPlans = async (params?: { clientId?: string; trainerId?: string; page?: number; limit?: number }) => {
  const { data } = await api.get<Paginated<TrainingPlan>>('/plans', { params });
  return data;
};

export const createPlan = async (payload: Omit<TrainingPlan, '_id'>): Promise<TrainingPlan> => {
  const { data } = await api.post<TrainingPlan>('/plans', payload);
  return data;
};

export const getPlanById = async (id: string): Promise<TrainingPlan> => {
  const { data } = await api.get<TrainingPlan>(`/plans/${id}`);
  return data;
};

export const updatePlan = async (id: string, payload: Partial<TrainingPlan>): Promise<TrainingPlan> => {
  const { data } = await api.patch<TrainingPlan>(`/plans/${id}`, payload);
  return data;
};

export const deletePlan = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/plans/${id}`);
  return data;
};

export const listSessions = async (planId: string, params?: { dayOfWeek?: number }) => {
  const { data } = await api.get<TrainingSession[]>(`/plans/${planId}/sessions`, { params });
  return data;
};

export const createSession = async (planId: string, payload: Omit<TrainingSession, '_id' | 'planId'>) => {
  const { data } = await api.post<TrainingSession>(`/plans/${planId}/sessions`, payload);
  return data;
};

export const updateSession = async (id: string, payload: Partial<TrainingSession>) => {
  const { data } = await api.patch<TrainingSession>(`/sessions/${id}`, payload);
  return data;
};

export const deleteSession = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/sessions/${id}`);
  return data;
};

export const listCompletion = async (params?: {
  clientId?: string;
  trainerId?: string;
  status?: CompletionStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) => {
  const { data } = await api.get<Paginated<CompletionLog>>('/completion', { params });
  return data;
};

export const upsertCompletion = async (payload: {
  clientId: string;
  trainerId: string;
  planId: string;
  sessionId: string;
  date: string;
  status: CompletionStatus;
  reason?: string;
  proofImage?: string;
}) => {
  const { data } = await api.post<CompletionLog>('/completion', payload);
  return data;
};

export const deleteCompletion = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/completion/${id}`);
  return data;
};
