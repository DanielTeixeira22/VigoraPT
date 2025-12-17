import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as authApi from '../services/auth';
import type { User, AuthResponse } from '../types/domain';
import { AUTH_CLEARED_EVENT, clearTokens, getRefreshToken, setTokens } from '../utils/tokenStorage';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wantsTrainer?: boolean;
  trainerCertification?: string;
  trainerSpecialties?: string;
  trainerHourlyRate?: string | number;
  trainerDocument?: File | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: { emailOrUsername: string; password: string }) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  applyAuthResponse: (response: AuthResponse) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setUser(response.user);
    setAccessToken(response.accessToken);
    setTokens(response.accessToken, response.refreshToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearTokens();
  }, []);

  const login = useCallback(
    async (payload: { emailOrUsername: string; password: string }) => {
      const response = await authApi.login(payload);
      applyAuthResponse(response);
    },
    [applyAuthResponse]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      let body: FormData | typeof payload;
      if (payload.trainerDocument) {
        const formData = new FormData();
        formData.append('username', payload.username);
        formData.append('email', payload.email);
        formData.append('password', payload.password);
        formData.append('firstName', payload.firstName);
        formData.append('lastName', payload.lastName);
        if (payload.wantsTrainer) formData.append('wantsTrainer', 'true');
        if (payload.trainerCertification) formData.append('trainerCertification', payload.trainerCertification);
        if (payload.trainerSpecialties) formData.append('trainerSpecialties', payload.trainerSpecialties);
        if (payload.trainerHourlyRate) formData.append('trainerHourlyRate', String(payload.trainerHourlyRate));
        formData.append('trainerDocument', payload.trainerDocument);
        body = formData;
      } else {
        body = payload;
      }
      const response = await authApi.register(body);
      applyAuthResponse(response);
    },
    [applyAuthResponse]
  );

  const refreshSession = useCallback(async () => {
    const storedRefresh = getRefreshToken();
    if (!storedRefresh) {
      logout();
      return;
    }
    const response = await authApi.refresh(storedRefresh);
    // Backend refresh may or may not return user; fetch it if missing
    if (!response.user) {
      const currentUser = await authApi.me();
      applyAuthResponse({ ...response, user: currentUser });
    } else {
      applyAuthResponse(response);
    }
  }, [applyAuthResponse, logout]);

  // On mount, try to restore session
  useEffect(() => {
    const init = async () => {
      const storedRefresh = getRefreshToken();
      if (storedRefresh) {
        try {
          await refreshSession();
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    init();
  }, [logout, refreshSession]);

  // Keep auth state in sync when tokens are cleared elsewhere (e.g., interceptor)
  useEffect(() => {
    const handleCleared = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener(AUTH_CLEARED_EVENT, handleCleared);
    return () => window.removeEventListener(AUTH_CLEARED_EVENT, handleCleared);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: Boolean(user && accessToken),
        login,
        register,
        logout,
        applyAuthResponse,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
