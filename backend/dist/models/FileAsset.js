"use strict";
/**
 * Model: Ficheiro/Asset
 * Ficheiros carregados pelos utilizadores.
 * Categorizado por propósito (perfil, prova, conteúdo, outro).
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ============================================================================
// Schema
// ============================================================================
const FileAssetSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    purpose: {
        type: String,
        enum: ['PROFILE', 'PROOF', 'CONTENT', 'OTHER'],
        default: 'OTHER',
        index: true,
    },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    url: { type: String, required: true, trim: true },
    cloudinaryId: { type: String, trim: true },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
}, { timestamps: true });
FileAssetSchema.index({ createdAt: -1 });
const FileAssetModel = (0, mongoose_1.model)('FileAsset', FileAssetSchema);
exports.default = FileAssetModel;
