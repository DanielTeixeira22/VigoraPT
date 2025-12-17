"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CompletionLogSchema = new mongoose_1.Schema({
    clientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ClientProfile',
        required: true,
        index: true,
    },
    trainerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainerProfile',
        required: true,
        index: true,
    },
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainingPlan',
        required: true,
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainingSession',
        required: true,
        index: true,
    },
    date: {
        // Dia em que a sessão estava planeada/foi realizada (usar só a parte de data no frontend)
        type: Date,
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['DONE', 'MISSED'],
        required: true,
        index: true,
    },
    reason: {
        // Motivo do não cumprimento (só faz sentido para MISSED)
        type: String,
        trim: true,
    },
    proofImage: {
        // URL de imagem (ex.: foto pós-treino) se quiseres permitir "evidência"
        type: String,
    },
}, { timestamps: true });
// Índices essenciais para dashboards e listagens
CompletionLogSchema.index({ clientId: 1, date: -1 });
CompletionLogSchema.index({ trainerId: 1, date: -1 });
// (Opcional mas recomendado) Evita duplicados para o mesmo cliente/sessão/dia
CompletionLogSchema.index({ clientId: 1, sessionId: 1, date: 1 }, { unique: true });
// Limpeza simples: esvazia "reason" quando status = DONE
CompletionLogSchema.pre('save', function (next) {
    if (this.status === 'DONE')
        this.reason = undefined;
    // normaliza minutes/seconds para 00:00:00 (evita duplicados por hora)
    if (this.date instanceof Date) {
        const d = new Date(this.date);
        d.setHours(0, 0, 0, 0);
        this.date = d;
    }
    next();
});
const CompletionLogModel = (0, mongoose_1.model)('CompletionLog', CompletionLogSchema);
exports.default = CompletionLogModel;
