/**
 * Model: Ficheiro/Asset
 * Ficheiros carregados pelos utilizadores.
 * Categorizado por propósito (perfil, prova, conteúdo, outro).
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** Finalidade do ficheiro */
export type FilePurpose = 'PROFILE' | 'PROOF' | 'CONTENT' | 'OTHER';

/** FileAsset document. */
export interface FileAsset {
  ownerId?: Types.ObjectId;
  purpose: FilePurpose;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  cloudinaryId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type FileAssetDocument = HydratedDocument<FileAsset>;

// ============================================================================
// Schema
// ============================================================================

const FileAssetSchema = new Schema<FileAsset>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
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
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

FileAssetSchema.index({ createdAt: -1 });

const FileAssetModel: Model<FileAsset> = model<FileAsset>('FileAsset', FileAssetSchema);

export default FileAssetModel;
