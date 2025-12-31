import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import * as authApi from '../services/auth';

// Create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Mock the API module.
vi.mock('../services/auth');

// Mock do tokenStorage
vi.mock('../utils/tokenStorage', () => ({
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  AUTH_CLEARED_EVENT: 'auth:cleared',
}));

// Test component that exposes the hook.
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button onClick={() => login({ emailOrUsername: 'test@test.com', password: 'password' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('deve lançar erro quando usado fora do AuthProvider', () => {
      // Silencia o console.error para este teste
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('começa com isLoading true e sem utilizador', async () => {
      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      // Espera loading terminar
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('username')).toHaveTextContent('none');
    });

    it('atualiza estado após login com sucesso', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@test.com',
        role: 'CLIENT' as const,
        profile: { firstName: 'Test', lastName: 'User' },
      };

      vi.mocked(authApi.login).mockResolvedValue({
        user: mockUser,
        accessToken: 'fake-token',
        refreshToken: 'fake-refresh',
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      // Espera loading terminar
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Click the login button.
      const loginButton = screen.getByText('Login');
      await userEvent.click(loginButton);

      // Verify that state was updated.
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
        expect(screen.getByTestId('username')).toHaveTextContent('testuser');
      });
    });

    it('limpa estado após logout', async () => {
      const mockUser = {
        id: '123',
        username: 'testuser',
        email: 'test@test.com',
        role: 'CLIENT' as const,
        profile: { firstName: 'Test', lastName: 'User' },
      };

      vi.mocked(authApi.login).mockResolvedValue({
        user: mockUser,
        accessToken: 'fake-token',
        refreshToken: 'fake-refresh',
      });

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      // Login
      await userEvent.click(screen.getByText('Login'));
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      // Logout
      await userEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
        expect(screen.getByTestId('username')).toHaveTextContent('none');
      });
    });
  });
});
