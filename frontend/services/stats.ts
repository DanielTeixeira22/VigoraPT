// API service for Stats.

import { api } from './httpClient';

export interface CompletionSeriePoint {
  year: number;
  week?: number;
  month?: number;
  totalCompletions: number;
}

export const completionsByWeek = async (params?: { from?: string; to?: string; clientId?: string; trainerId?: string }) => {
  const { data } = await api.get<CompletionSeriePoint[]>('/stats/completions/weekly', { params });
  return data;
};

export const completionsByMonth = async (params?: { from?: string; to?: string; clientId?: string; trainerId?: string }) => {
  const { data } = await api.get<CompletionSeriePoint[]>('/stats/completions/monthly', { params });
  return data;
};

export const myCompletionsByWeek = async () => {
  const { data } = await api.get<CompletionSeriePoint[]>('/stats/my/weekly');
  return data;
};

export const myCompletionsByMonth = async () => {
  const { data } = await api.get<CompletionSeriePoint[]>('/stats/my/monthly');
  return data;
};

/** Admin dashboard overview statistics */
export interface AdminOverview {
  totalUsers: number;
  totalTrainers: number;
  totalClients: number;
  pendingApplications: number;
  totalWorkoutsCompleted: number;
  totalWorkoutsMissed: number;
  weeklyActivity: CompletionSeriePoint[];
  monthlyActivity: CompletionSeriePoint[];
  monthlyMissed: CompletionSeriePoint[];
}

/** Fetch admin dashboard overview (ADMIN only) */
export const getAdminOverview = async (): Promise<AdminOverview> => {
  const { data } = await api.get<AdminOverview>('/stats/admin/overview');
  return data;
};
