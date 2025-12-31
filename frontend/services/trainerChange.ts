// API service for Trainer Change.

import { api } from './httpClient';
import type { TrainerChangeRequest, TrainerChangeStatus } from '../types/domain';

export const createTrainerChangeRequest = async (payload: { requestedTrainerId: string; reason?: string }) => {
  const { data } = await api.post<TrainerChangeRequest>('/trainer-change-requests', payload);
  return data;
};

export const listTrainerChangeRequests = async (status?: TrainerChangeStatus) => {
  const params = status ? { status } : undefined;
  const { data } = await api.get<TrainerChangeRequest[]>('/trainer-change-requests', { params });
  return data;
};

export const decideTrainerChangeRequest = async (id: string, status: Exclude<TrainerChangeStatus, 'PENDING'>) => {
  const { data } = await api.patch<TrainerChangeRequest>(`/trainer-change-requests/${id}`, { status });
  return data;
};
