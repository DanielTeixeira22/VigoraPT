"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Subdocumento: Exercício dentro da sessão
const ExerciseSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
    mediaUrl: { type: String }, // link para vídeo/guia do exercício
}, { _id: true });
const TrainingSessionSchema = new mongoose_1.Schema({
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainingPlan',
        required: true,
        index: true,
    },
    dayOfWeek: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 6], // 0=Domingo, 1=Segunda, ... 6=Sábado
        required: true,
        index: true,
    },
    order: {
        type: Number,
        default: 0, // útil para ordenar várias sessões no mesmo dia (se precisares)
    },
    notes: {
        type: String,
        trim: true,
    },
    exercises: {
        type: [ExerciseSchema],
        default: [],
        validate: [
            (arr) => Array.isArray(arr) && arr.length <= 10,
            'Máximo de 10 exercícios por sessão.',
        ],
    },
}, { timestamps: true });
// Índices para consultas rápidas
TrainingSessionSchema.index({ planId: 1, dayOfWeek: 1 });
TrainingSessionSchema.index({ planId: 1, order: 1 });
// Sanitize simples (evita strings vazias desnecessárias)
TrainingSessionSchema.pre('save', function (next) {
    if (typeof this.notes === 'string' && !this.notes.trim())
        this.notes = undefined;
    if (Array.isArray(this.exercises)) {
        this.exercises = this.exercises.map((ex) => {
            if (typeof ex.notes === 'string' && !ex.notes.trim())
                ex.notes = undefined;
            return ex;
        });
    }
    next();
});
const TrainingSessionModel = (0, mongoose_1.model)('TrainingSession', TrainingSessionSchema);
exports.default = TrainingSessionModel;
