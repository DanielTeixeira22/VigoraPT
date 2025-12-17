"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FileAssetSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true }, // quem subiu o ficheiro
    purpose: { type: String, enum: ['PROFILE', 'PROOF', 'CONTENT', 'OTHER'], default: 'OTHER', index: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    url: { type: String, required: true, trim: true }, // CDN/S3/Cloudinary/GridFS URL
    metadata: { type: mongoose_1.Schema.Types.Mixed }, // ex: { sessionId, completionLogId }
}, { timestamps: true });
FileAssetSchema.index({ createdAt: -1 });
const FileAssetModel = (0, mongoose_1.model)('FileAsset', FileAssetSchema);
exports.default = FileAssetModel;
