"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAsset = exports.listMyAssets = exports.uploadSingle = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const FileAsset_1 = __importDefault(require("../models/FileAsset"));
const filePublicUrl = (req, filename) => {
    const base = `${req.protocol}://${req.get('host')}`;
    return `${base}/uploads/${filename}`;
};
const parseNumber = (value, fallback) => {
    const parsed = Number.parseInt(typeof value === 'string' ? value : `${value !== null && value !== void 0 ? value : ''}`, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
const uploadSingle = async (req, res, next) => {
    var _a;
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ message: 'Ficheiro em falta (campo "file").' });
        const { purpose = 'OTHER', metadata } = req.body;
        const ownerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const asset = await FileAsset_1.default.create({
            ...(ownerId ? { ownerId } : {}),
            purpose,
            filename: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            url: filePublicUrl(req, file.filename),
            metadata: (() => {
                if (!metadata)
                    return undefined;
                try {
                    return JSON.parse(metadata);
                }
                catch {
                    return { raw: String(metadata) };
                }
            })(),
        });
        return res.status(201).json(asset);
    }
    catch (err) {
        next(err);
    }
};
exports.uploadSingle = uploadSingle;
const listMyAssets = async (req, res, next) => {
    var _a;
    try {
        const ownerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const query = ownerId ? { ownerId } : {};
        const page = Math.max(1, parseNumber(req.query.page, 1));
        const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 20)));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            FileAsset_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            FileAsset_1.default.countDocuments(query),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listMyAssets = listMyAssets;
const deleteAsset = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Autenticação requerida.' });
        const { id } = req.params;
        const asset = await FileAsset_1.default.findById(id);
        if (!asset)
            return res.status(404).json({ message: 'Ficheiro não encontrado.' });
        const isOwner = String(asset.ownerId) === String(req.user._id);
        const isAdmin = req.user.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Sem permissão para apagar este ficheiro.' });
        }
        const filepath = path_1.default.join(process.cwd(), 'uploads', asset.filename);
        await promises_1.default.unlink(filepath).catch(() => null);
        await asset.deleteOne();
        res.json({ message: 'Ficheiro removido.' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteAsset = deleteAsset;
