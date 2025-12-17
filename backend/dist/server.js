"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const PORT = Number(process.env.PORT) || 3000;
const bootstrap = async () => {
    await (0, db_1.connectDB)();
    app_1.default.listen(PORT, () => {
        console.log(`API a correr em http://localhost:${PORT}`);
    });
};
bootstrap().catch((err) => {
    console.error('Erro a iniciar o servidor:', err);
    process.exit(1);
});
