import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './httpClient';
import { login, refresh, me, qrStart, qrPoll } from './auth';

// Mock do axios/httpClient
vi.mock('./httpClient', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

const mockApi = api as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

describe('auth service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('envia credenciais e retorna resposta de autenticação', async () => {
            const mockResponse = {
                data: {
                    user: { id: '1', username: 'testuser', email: 'test@test.com', role: 'CLIENT' },
                    accessToken: 'fake-access',
                    refreshToken: 'fake-refresh',
                },
            };
            mockApi.post.mockResolvedValue(mockResponse);

            const result = await login({ emailOrUsername: 'test@test.com', password: 'password123' });

            expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
                emailOrUsername: 'test@test.com',
                password: 'password123',
            });
            expect(result.user.username).toBe('testuser');
            expect(result.accessToken).toBe('fake-access');
        });

        it('propaga erro quando login falha', async () => {
            const error = new Error('Credenciais inválidas');
            mockApi.post.mockRejectedValue(error);

            await expect(login({ emailOrUsername: 'wrong', password: 'wrong' })).rejects.toThrow('Credenciais inválidas');
        });
    });

    describe('refresh', () => {
        it('envia refresh token e retorna novos tokens', async () => {
            const mockResponse = {
                data: {
                    accessToken: 'new-access',
                    refreshToken: 'new-refresh',
                },
            };
            mockApi.post.mockResolvedValue(mockResponse);

            const result = await refresh('old-refresh-token');

            expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh-token' });
            expect(result.accessToken).toBe('new-access');
        });
    });

    describe('me', () => {
        it('retorna perfil do utilizador autenticado', async () => {
            const mockResponse = {
                data: {
                    id: '1',
                    username: 'testuser',
                    email: 'test@test.com',
                    role: 'CLIENT',
                    profile: { firstName: 'Test', lastName: 'User' },
                },
            };
            mockApi.get.mockResolvedValue(mockResponse);

            const result = await me();

            expect(mockApi.get).toHaveBeenCalledWith('/users/me');
            expect(result.username).toBe('testuser');
            expect(result.profile.firstName).toBe('Test');
        });
    });

    describe('QR Login', () => {
        it('qrStart retorna código e data de expiração', async () => {
            const mockResponse = {
                data: {
                    code: 'abc123xyz',
                    expiresAt: '2025-12-18T23:45:00.000Z',
                },
            };
            mockApi.post.mockResolvedValue(mockResponse);

            const result = await qrStart();

            expect(mockApi.post).toHaveBeenCalledWith('/auth/qr/start');
            expect(result.code).toBe('abc123xyz');
            expect(result.expiresAt).toBeDefined();
        });

        it('qrPoll retorna PENDING enquanto não aprovado', async () => {
            const mockResponse = {
                data: { status: 'PENDING' },
            };
            mockApi.get.mockResolvedValue(mockResponse);

            const result = await qrPoll('abc123xyz');

            expect(mockApi.get).toHaveBeenCalledWith('/auth/qr/poll', { params: { code: 'abc123xyz' } });
            expect(result.status).toBe('PENDING');
        });

        it('qrPoll retorna tokens quando aprovado', async () => {
            const mockResponse = {
                data: {
                    status: 'APPROVED',
                    user: { id: '1', username: 'testuser' },
                    accessToken: 'qr-access',
                    refreshToken: 'qr-refresh',
                },
            };
            mockApi.get.mockResolvedValue(mockResponse);

            const result = await qrPoll('abc123xyz');

            expect(result.status).toBe('APPROVED');
            if (result.status === 'APPROVED') {
                expect(result.accessToken).toBe('qr-access');
            }
        });
    });
});
