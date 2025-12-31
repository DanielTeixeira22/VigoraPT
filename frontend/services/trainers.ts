// API service for Trainers.

import { api } from './httpClient';
import type { TrainerProfile } from '../types/domain';

export const getMyTrainerProfile = async (): Promise<TrainerProfile> => {
  const { data } = await api.get<TrainerProfile>('/trainers/me');
  return data;
};

export const updateMyTrainerProfile = async (
  payload: Partial<Pick<TrainerProfile, 'certification' | 'specialties' | 'avatarUrl' | 'documentUrls' | 'hourlyRate'>>
): Promise<TrainerProfile> => {
  const { data } = await api.put<TrainerProfile>('/trainers/me', payload);
  return data;
};

export const listTrainers = async (validated?: boolean): Promise<TrainerProfile[]> => {
  const params = validated !== undefined ? { validated } : undefined;
  const { data } = await api.get<TrainerProfile[]>('/trainers', { params });
  return data;
};

export const validateTrainer = async (id: string): Promise<TrainerProfile> => {
  const { data } = await api.patch<TrainerProfile>(`/trainers/${id}/validate`, {});
  return data;
};

export const rejectTrainer = async (id: string): Promise<TrainerProfile> => {
  const { data } = await api.patch<TrainerProfile>(`/trainers/${id}/reject`, {});
  return data;
};

export const adminUpdateTrainer = async (id: string, payload: Partial<Pick<TrainerProfile, 'certification' | 'specialties' | 'hourlyRate' | 'avatarUrl' | 'documentUrls'>>) => {
  const { data } = await api.patch<TrainerProfile>(`/trainers/${id}`, payload);
  return data;
};

export const listPublicTrainers = async (params?: { q?: string; page?: number; limit?: number; sort?: 'newest' | 'rating' }) => {
  const { data } = await api.get<{ items: TrainerProfile[]; page: number; total: number; pages: number }>('/trainers/public', { params });
  return data;
};
