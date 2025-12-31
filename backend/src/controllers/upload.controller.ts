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

import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import FileAsset from '../models/FileAsset';

// ============================================================================
// Types & Interfaces
// ============================================================================

/** Payload for file upload metadata */
interface UploadPayload {
  purpose?: string;
  metadata?: string;
}

/** Paginated response structure */
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  total: number;
  pages: number;
}

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
const getFilePublicUrl = (req: Request, filename: string): string => {
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
const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(typeof value === 'string' ? value : `${value ?? ''}`, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely parses JSON metadata.
 * 
 * @param metadata - Metadata string to parse
 * @returns Parsed object or raw string wrapper
 */
const parseMetadata = (metadata?: string): Record<string, unknown> | undefined => {
  if (!metadata) return undefined;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
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
export const uploadSingle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      throw createError(400, 'Ficheiro em falta (campo "file").');
    }

    const { purpose = 'OTHER', metadata } = req.body as UploadPayload;
    const ownerId = req.user?._id;

    const asset = await FileAsset.create({
      ...(ownerId ? { ownerId } : {}),
      purpose,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: getFilePublicUrl(req, file.filename),
      metadata: parseMetadata(metadata),
    });

    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
};

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
export const listMyAssets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?._id;
    const query = ownerId ? { ownerId } : {};

    const page = Math.max(1, parseNumber(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, parseNumber(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      FileAsset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      FileAsset.countDocuments(query),
    ]);

    res.json({
      items,
      page,
      total,
      pages: Math.ceil(total / limit),
    } as PaginatedResponse<unknown>);
  } catch (error) {
    next(error);
  }
};

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
export const deleteAsset = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw createError(401, 'Autenticação requerida.');
    }

    const { id } = req.params;

    const asset = await FileAsset.findById(id);
    if (!asset) {
      throw createError(404, 'Ficheiro não encontrado.');
    }

    // Validate permissions.
    const isOwner = String(asset.ownerId) === String(req.user._id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw createError(403, 'Sem permissão para apagar este ficheiro.');
    }

    // Delete physical file (ignore errors if file doesn't exist)
    const filepath = path.join(process.cwd(), 'uploads', asset.filename);
    await fs.unlink(filepath).catch(() => null);

    // Delete database record
    await asset.deleteOne();

    res.json({ message: 'Ficheiro removido.' });
  } catch (error) {
    next(error);
  }
};
