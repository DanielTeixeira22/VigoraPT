// Utilities for Token Storage.

const TOKEN_KEY = 'vigora_access_token';
const REFRESH_KEY = 'vigora_refresh_token';
export const AUTH_CLEARED_EVENT = 'vigora:auth-cleared';

const notifyCleared = (): void => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
    }
};

export const getAccessToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_KEY);
};

export const setAccessToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
};

export const setRefreshToken = (token: string): void => {
    localStorage.setItem(REFRESH_KEY, token);
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    notifyCleared();
};
