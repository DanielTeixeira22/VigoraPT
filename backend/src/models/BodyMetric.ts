import { Schema, model, Types, Model, HydratedDocument } from 'mongoose';

export interface BodyMetric {
    userId: Types.ObjectId;
    weight?: number;        // kg
    muscleMass?: number;    // percentage
    completionLogId?: Types.ObjectId;
    recordedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type BodyMetricDocument = HydratedDocument<BodyMetric>;

const BodyMetricSchema = new Schema<BodyMetric>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        weight: {
            type: Number,
            min: 0,
            max: 500,
        },
        muscleMass: {
            type: Number,
            min: 0,
            max: 100,
        },
        completionLogId: {
            type: Schema.Types.ObjectId,
            ref: 'CompletionLog',
        },
        recordedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

// Index for efficient time-series queries
BodyMetricSchema.index({ userId: 1, recordedAt: -1 });

const BodyMetricModel: Model<BodyMetric> = model<BodyMetric>('BodyMetric', BodyMetricSchema);

export default BodyMetricModel;
