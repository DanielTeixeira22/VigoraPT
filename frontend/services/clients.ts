// API service for Clients.

import { api } from './httpClient';
import type { ClientProfile } from '../types/domain';

export const trainerCreateClient = async (payload: {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  goals?: string;
}) => {
  const { data } = await api.post('/clients', payload);
  return data;
};

export const listMyClients = async (): Promise<ClientProfile[]> => {
  const { data } = await api.get<ClientProfile[]>('/clients/my');
  return data;
};

export const getMyClientProfile = async (): Promise<ClientProfile> => {
  const { data } = await api.get<ClientProfile>('/clients/me');
  return data;
};

export const updateMyClientProfile = async (payload: Partial<ClientProfile>): Promise<ClientProfile> => {
  const { data } = await api.put<ClientProfile>('/clients/me', payload);
  return data;
};
