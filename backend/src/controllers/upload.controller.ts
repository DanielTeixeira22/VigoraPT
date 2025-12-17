import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import FileAsset from '../models/FileAsset';

const filePublicUrl = (req: Request, filename: string): string => {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${filename}`;
};

const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(typeof value === 'string' ? value : `${value ?? ''}`, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const uploadSingle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: 'Ficheiro em falta (campo "file").' });

    const { purpose = 'OTHER', metadata } = req.body as { purpose?: string; metadata?: string };
    const ownerId = req.user?._id;

    const asset = await FileAsset.create({
      ...(ownerId ? { ownerId } : {}),
      purpose,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: filePublicUrl(req, file.filename),
      metadata: (() => {
        if (!metadata) return undefined;
        try { return JSON.parse(metadata); } catch { return { raw: String(metadata) }; }
      })(),
    });

    return res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
};

export const listMyAssets = async (req: Request, res: Response, next: NextFunction) => {
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

    res.json({ items, page, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const deleteAsset = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Autenticação requerida.' });
    const { id } = req.params;

    const asset = await FileAsset.findById(id);
    if (!asset) return res.status(404).json({ message: 'Ficheiro não encontrado.' });

    const isOwner = String(asset.ownerId) === String(req.user._id);
    const isAdmin = req.user.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para apagar este ficheiro.' });
    }

    const filepath = path.join(process.cwd(), 'uploads', asset.filename);
    await fs.unlink(filepath).catch(() => null);

    await asset.deleteOne();

    res.json({ message: 'Ficheiro removido.' });
  } catch (err) {
    next(err);
  }
};
