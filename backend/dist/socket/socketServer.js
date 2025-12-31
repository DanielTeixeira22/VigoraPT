"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUserOnline = exports.emitToConversation = exports.emitToUser = exports.getIO = exports.initSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let io = null;
// Socket map per user for targeted delivery.
const userSockets = new Map();
/**
 * Inicializa o servidor Socket.io com autenticação JWT.
 */
const initSocketServer = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
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
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
            socket.data.userId = decoded.id;
            socket.data.role = decoded.role;
            next();
        }
        catch (err) {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        console.log(`[Socket] User ${userId} connected (socket: ${socket.id})`);
        // Register the socket for the user.
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);
        // Join the personal room for targeted events.
        socket.join(`user:${userId}`);
        // Cleanup state when the socket disconnects.
        socket.on('disconnect', () => {
            var _a, _b;
            console.log(`[Socket] User ${userId} disconnected (socket: ${socket.id})`);
            (_a = userSockets.get(userId)) === null || _a === void 0 ? void 0 : _a.delete(socket.id);
            if (((_b = userSockets.get(userId)) === null || _b === void 0 ? void 0 : _b.size) === 0) {
                userSockets.delete(userId);
            }
        });
        // Join/leave conversation rooms for chat.
        socket.on('join:conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`[Socket] User ${userId} joined conversation ${conversationId}`);
        });
        socket.on('leave:conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
    });
    console.log('[Socket] WebSocket server initialized');
    return io;
};
exports.initSocketServer = initSocketServer;
/**
 * Obtém a instância ativa do Socket.io.
 */
const getIO = () => io;
exports.getIO = getIO;
/**
 * Emite um evento para um utilizador específico.
 */
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
/**
 * Emite um evento para uma sala de conversa.
 */
const emitToConversation = (conversationId, event, data) => {
    if (io) {
        io.to(`conversation:${conversationId}`).emit(event, data);
    }
};
exports.emitToConversation = emitToConversation;
/**
 * Indica se o utilizador tem pelo menos um socket ativo.
 */
const isUserOnline = (userId) => {
    return userSockets.has(userId) && userSockets.get(userId).size > 0;
};
exports.isUserOnline = isUserOnline;
