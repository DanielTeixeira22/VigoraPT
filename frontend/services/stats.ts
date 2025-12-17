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
