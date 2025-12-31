import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: Server | null = null;

// Socket map per user for targeted delivery.
const userSockets = new Map<string, Set<string>>();

interface JwtPayload {
    id: string;
    role: string;
}

/**
 * Inicializa o servidor Socket.io com autenticação JWT.
 */
export const initSocketServer = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Auth middleware to ensure sockets are tied to a user.
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as JwtPayload;
            socket.data.userId = decoded.id;
            socket.data.role = decoded.role;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId;
        console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);

        // Register the socket for the user.
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        // Join the personal room for targeted events.
        socket.join(`user:${userId}`);

        // Cleanup state when the socket disconnects.
        socket.on('disconnect', () => {
            console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);
            userSockets.get(userId)?.delete(socket.id);
            if (userSockets.get(userId)?.size === 0) {
                userSockets.delete(userId);
            }
        });

        // Join/leave conversation rooms for chat.
        socket.on('join:conversation', (conversationId: string) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`[Socket] User ${userId} joined conversation ${conversationId}`);
        });

        socket.on('leave:conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });
    });

    console.log('[Socket] WebSocket server initialized');
    return io;
};

/**
 * Obtém a instância ativa do Socket.io.
 */
export const getIO = (): Server | null => io;

/**
 * Emite um evento para um utilizador específico.
 */
export const emitToUser = (userId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

/**
 * Emite um evento para uma sala de conversa.
 */
export const emitToConversation = (conversationId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`conversation:${conversationId}`).emit(event, data);
    }
};

/**
 * Indica se o utilizador tem pelo menos um socket ativo.
 */
export const isUserOnline = (userId: string): boolean => {
    return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
};
