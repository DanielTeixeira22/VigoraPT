import { api } from './httpClient';
import type { AxiosRequestConfig } from 'axios';

export interface FileAsset {
  _id?: string;
  ownerId?: string;
  purpose: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export const uploadFile = async (
  file: File,
  options?: { purpose?: string; metadata?: Record<string, unknown>; onUploadProgress?: AxiosRequestConfig['onUploadProgress'] }
): Promise<FileAsset> => {
  const form = new FormData();
  form.append('file', file);
  if (options?.purpose) form.append('purpose', options.purpose);
  if (options?.metadata) form.append('metadata', JSON.stringify(options.metadata));

  const { data } = await api.post<FileAsset>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options?.onUploadProgress,
  });

  return data;
};

export const listMyAssets = async (params?: { page?: number; limit?: number }) => {
  const { data } = await api.get<{ items: FileAsset[]; page: number; total: number; pages: number }>('/uploads', { params });
  return data;
};

export const deleteAsset = async (id: string) => {
  const { data } = await api.delete<{ message: string }>(`/uploads/${id}`);
  return data;
};
