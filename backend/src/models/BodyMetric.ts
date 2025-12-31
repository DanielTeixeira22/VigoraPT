/**
 * Model: Métricas Corporais
 * Histórico de peso e massa muscular do utilizador.
 * Ligado opcionalmente a um CompletionLog.
 */

import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

// ============================================================================
// Tipos
// ============================================================================

/** BodyMetric document. */
export interface BodyMetric {
    userId: Types.ObjectId;
    weight?: number;
    muscleMass?: number;
    completionLogId?: Types.ObjectId;
    recordedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type BodyMetricDocument = HydratedDocument<BodyMetric>;

// ============================================================================
// Schema
// ============================================================================

const BodyMetricSchema = new Schema<BodyMetric>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        weight: { type: Number, min: 0, max: 500 },
        muscleMass: { type: Number, min: 0, max: 100 },
        completionLogId: { type: Schema.Types.ObjectId, ref: 'CompletionLog' },
        recordedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
);

BodyMetricSchema.index({ userId: 1, recordedAt: -1 });

const BodyMetricModel: Model<BodyMetric> = model<BodyMetric>('BodyMetric', BodyMetricSchema);

export default BodyMetricModel;
