"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const socketServer_1 = require("./socket/socketServer");
dotenv_1.default.config();
const PORT = Number(process.env.PORT) || 3000;
// Arranque coordenado: BD -> HTTP -> Socket.
const bootstrap = async () => {
    await (0, db_1.connectDB)();
    // Create HTTP server from Express app
    const httpServer = (0, http_1.createServer)(app_1.default);
    // Inicializa Socket.io
    (0, socketServer_1.initSocketServer)(httpServer);
    httpServer.listen(PORT, () => {
        console.log(`API a correr em http://localhost:${PORT}`);
    });
};
bootstrap().catch((err) => {
    console.error('Erro a iniciar o servidor:', err);
    process.exit(1);
});
