import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../utils/tokenStorage';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Core HTTP client with token refresh and queued requests.
const api: AxiosInstance = axios.create({ baseURL });
const raw: AxiosInstance = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let waiters: Array<(token: string | null) => void> = [];

const resolveQueue = (token: string | null) => {
  waiters.forEach((cb) => cb(token));
  waiters = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const { data } = await raw.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data.accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableConfig | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry && getRefreshToken()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waiters.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        resolveQueue(newToken);
        if (newToken) {
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        resolveQueue(null);
        clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // If 401 persists, clear tokens to force re-auth in the UI.
    if (status === 401) {
      clearTokens();
    }

    return Promise.reject(error);
  }
);

export { api, raw };
