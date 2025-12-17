import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export type FilePurpose = 'PROFILE' | 'PROOF' | 'CONTENT' | 'OTHER';

export interface FileAsset {
  ownerId?: Types.ObjectId;
  purpose: FilePurpose;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type FileAssetDocument = HydratedDocument<FileAsset>;

const FileAssetSchema = new Schema<FileAsset>(
  {
    ownerId:   { type: Schema.Types.ObjectId, ref: 'User', index: true }, // quem subiu o ficheiro
    purpose:   { type: String, enum: ['PROFILE', 'PROOF', 'CONTENT', 'OTHER'], default: 'OTHER', index: true },
    filename:  { type: String, required: true, trim: true },
    mimeType:  { type: String, required: true, trim: true },
    size:      { type: Number, required: true, min: 0 },
    url:       { type: String, required: true, trim: true }, // CDN/S3/Cloudinary/GridFS URL
    metadata:  { type: Schema.Types.Mixed },                  // ex: { sessionId, completionLogId }
  },
  { timestamps: true }
);

FileAssetSchema.index({ createdAt: -1 });

const FileAssetModel: Model<FileAsset> = model<FileAsset>('FileAsset', FileAssetSchema);

export default FileAssetModel;
