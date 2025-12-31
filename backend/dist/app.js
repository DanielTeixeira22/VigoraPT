"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const uploads_routes_1 = __importDefault(require("./routes/uploads.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const qr_routes_1 = __importDefault(require("./routes/qr.routes"));
const plans_routes_1 = __importDefault(require("./routes/plans.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const trainers_routes_1 = __importDefault(require("./routes/trainers.routes"));
const clients_routes_1 = __importDefault(require("./routes/clients.routes"));
const trainer_change_routes_1 = __importDefault(require("./routes/trainer-change.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const stats_routes_1 = __importDefault(require("./routes/stats.routes"));
const bodyMetrics_routes_1 = __importDefault(require("./routes/bodyMetrics.routes"));
// Express setup: global middleware, routes, and docs.
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
try {
    const swaggerPath = path_1.default.join(process.cwd(), 'src', 'docs', 'swagger.json');
    if (fs_1.default.existsSync(swaggerPath)) {
        const swaggerDoc = JSON.parse(fs_1.default.readFileSync(swaggerPath, 'utf8'));
        app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDoc));
        console.log('📘 Swagger disponível em /api-docs');
    }
    else {
        console.warn('⚠️  swagger.json não encontrado em src/docs/');
    }
}
catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao carregar swagger.json:', message);
}
// QR login must be registered before /api/auth to avoid route conflicts.
app.use('/api/auth/qr', qr_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/uploads', uploads_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api', plans_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/trainers', trainers_routes_1.default);
app.use('/api/clients', clients_routes_1.default);
app.use('/api/trainer-change-requests', trainer_change_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
app.use('/api/stats', stats_routes_1.default);
app.use('/api/body-metrics', bodyMetrics_routes_1.default);
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint não encontrado.' });
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Erro interno do servidor.',
    });
});
exports.default = app;
