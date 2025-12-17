"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI não definido no .env');
        process.exit(1);
    }
    mongoose_1.default.connection.on('connected', () => console.log('Conectado ao MongoDB'));
    mongoose_1.default.connection.on('error', (err) => console.error('MongoDB error:', err.message));
    mongoose_1.default.connection.on('disconnected', () => console.warn('MongoDB desconectado'));
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await mongoose_1.default.connect(uri, {});
            return;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error(`MongoDB tentativa ${attempt}/${maxRetries} falhou:`, message);
            if (attempt === maxRetries)
                process.exit(1);
            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
    }
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
