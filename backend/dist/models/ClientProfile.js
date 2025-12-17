"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ClientProfileSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    trainerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TrainerProfile',
        default: null,
        index: true,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
    goals: {
        type: String,
        trim: true,
    },
    injuries: {
        type: String,
        trim: true,
    },
    preferences: {
        type: String,
        trim: true,
    },
}, { timestamps: true });
// Índices úteis para listagens
ClientProfileSchema.index({ createdAt: -1 });
const ClientProfileModel = (0, mongoose_1.model)('ClientProfile', ClientProfileSchema);
exports.default = ClientProfileModel;
