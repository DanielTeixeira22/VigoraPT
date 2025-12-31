"use strict";
/**
 * Upload Controller
 *
 * Handles file upload and asset management including:
 * - Single file uploads
 * - Listing user assets
 * - Deleting assets (owner or admin)
 *
 * @module controllers/upload
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAsset = exports.listMyAssets = exports.uploadSingle = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const http_errors_1 = __importDefault(require("http-errors"));
const FileAsset_1 = __importDefault(require("../models/FileAsset"));
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Generates a public URL for an uploaded file.
 *
 * @param req - Express request object
 * @param filename - The filename to generate URL for
 * @returns Public URL string
 */
const getFilePublicUrl = (req, filename) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${filename}`;
};
/**
 * Parses a numeric value from unknown input.
 *
 * @param value - The value to parse
 * @param fallback - Default value if parsing fails
 * @returns Parsed number or fallback
 */
const parseNumber = (value, fallback) => {
    const parsed = Number.parseInt(typeof value === 'string' ? value : `${value !== null && value !== void 0 ? value : ''}`, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};
/**
 * Safely parses JSON metadata.
 *
 * @param metadata - Metadata string to parse
 * @returns Parsed object or raw string wrapper
 */
const parseMetadata = (metadata) => {
    if (!metadata)
        return undefined;
    try {
        return JSON.parse(metadata);
    }
    catch {
        return { raw: String(metadata) };
    }
};
// ============================================================================
// Upload Endpoints
// ============================================================================
/**
 * Uploads a single file and creates an asset record.
 *
 * @route POST /api/upload
 * @access Private (optional - can work without auth)
 *
 * @param req - Express request with file
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {FileAsset} The created file asset record
 * @throws {HttpError} 400 if no file provided
 */
const uploadSingle = async (req, res, next) => {
    var _a;
    try {
        const file = req.file;
        if (!file) {
            throw (0, http_errors_1.default)(400, 'Ficheiro em falta (campo "file").');
        }
        const { purpose = 'OTHER', metadata } = req.body;
        const ownerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const asset = await FileAsset_1.default.create({
            ...(ownerId ? { ownerId } : {}),
            purpose,
            filename: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            url: getFilePublicUrl(req, file.filename),
            metadata: parseMetadata(metadata),
        });
        res.status(201).json(asset);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadSingle = uploadSingle;
/**
 * Lists file assets for the authenticated user.
 *
 * @route GET /api/upload/my-assets
 * @access Private
 *
 * @param req - Express request with pagination query params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {PaginatedResponse<FileAsset>} Paginated list of assets
 */
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
        res.json({
            items,
            page,
            total,
            pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listMyAssets = listMyAssets;
/**
 * Deletes a file asset and its physical file.
 * Only owner or admin can delete.
 *
 * @route DELETE /api/upload/:id
 * @access Private
 *
 * @param req - Express request with asset ID
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 401 if not authenticated
 * @throws {HttpError} 403 if not owner or admin
 * @throws {HttpError} 404 if asset not found
 */
const deleteAsset = async (req, res, next) => {
    try {
        if (!req.user) {
            throw (0, http_errors_1.default)(401, 'Autenticação requerida.');
        }
        const { id } = req.params;
        const asset = await FileAsset_1.default.findById(id);
        if (!asset) {
            throw (0, http_errors_1.default)(404, 'Ficheiro não encontrado.');
        }
        // Validate permissions.
        const isOwner = String(asset.ownerId) === String(req.user._id);
        const isAdmin = req.user.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            throw (0, http_errors_1.default)(403, 'Sem permissão para apagar este ficheiro.');
        }
        // Delete physical file (ignore errors if file doesn't exist)
        const filepath = path_1.default.join(process.cwd(), 'uploads', asset.filename);
        await promises_1.default.unlink(filepath).catch(() => null);
        // Delete database record
        await asset.deleteOne();
        res.json({ message: 'Ficheiro removido.' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAsset = deleteAsset;
