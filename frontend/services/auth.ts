import { api } from './httpClient';
import type { AuthResponse, User } from '../types/domain';

export const login = async (payload: { emailOrUsername: string; password: string }): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
};

export const register = async (payload: FormData | {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wantsTrainer?: boolean;
  trainerCertification?: string;
  trainerSpecialties?: string;
  trainerHourlyRate?: string | number;
}): Promise<AuthResponse> => {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const { data } = await api.post<AuthResponse>('/auth/register', payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  return data;
};

export const refresh = async (refreshToken: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
  return data;
};

export const me = async (): Promise<User> => {
  const { data } = await api.get<User>('/users/me');
  return data;
};

export const qrStart = async (): Promise<{ code: string; expiresAt: string }> => {
  const { data } = await api.post<{ code: string; expiresAt: string }>('/auth/qr/start');
  return data;
};

export const qrApprove = async (code: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/qr/approve', { code });
  return data;
};

export const qrReject = async (code: string): Promise<{ message: string }> => {
  const { data } = await api.post('/auth/qr/reject', { code });
  return data;
};

export const qrPoll = async (
  code: string
): Promise<
  | { status: 'PENDING' | 'REJECTED' | 'EXPIRED' }
  | ({ status: 'APPROVED' } & AuthResponse)
> => {
  const { data } = await api.get(`/auth/qr/poll`, { params: { code } });
  return data;
};

/**
 * Gerar QR Code para login (chamado na página de perfil)
 */
export const qrGenerate = async (): Promise<{ token: string; expiresAt: string }> => {
  const { data } = await api.post<{ token: string; expiresAt: string }>('/auth/qr/generate');
  return data;
};

/**
 * Login via token QR escaneado (chamado na página de login)
 */
export const qrScanLogin = async (token: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/qr/scan-login', { token });
  return data;
};

