import mongoose, { Schema, type Document } from 'mongoose';
import type { BuilderJob, BuilderJobStatus } from '../schemas/builder.schema.js';
import { BuilderJobStatusEnum } from '../schemas/builder.schema.js';

export interface BuilderJobDocument extends Omit<BuilderJob, 'id'>, Document {
  status: BuilderJobStatus;
}

const generatedFileSchema = new Schema(
  {
    path: { type: String, required: true },
    content: { type: String, required: true },
    action: { type: String, enum: ['created', 'modified'], required: true },
  },
  { _id: false }
);

const jobResultSchema = new Schema(
  {
    files: { type: [generatedFileSchema], default: [] },
    prUrl: String,
    prNumber: Number,
    branch: String,
    validationPassed: Boolean,
  },
  { _id: false }
);

const jobErrorSchema = new Schema(
  {
    code: { type: String, required: true },
    message: { type: String, required: true },
    step: { type: String, enum: BuilderJobStatusEnum.options },
  },
  { _id: false }
);

const builderJobSchema = new Schema<BuilderJobDocument>(
  {
    prompt: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: BuilderJobStatusEnum.options,
      default: 'queued',
    },
    options: {
      dryRun: { type: Boolean, default: false },
      targetTag: String,
      includeModel: { type: Boolean, default: true },
      includeTests: { type: Boolean, default: true },
    },
    result: { type: jobResultSchema },
    error: { type: jobErrorSchema },
    userId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

builderJobSchema.index({ userId: 1, createdAt: -1 });
builderJobSchema.index({ status: 1 });

export const BuilderJobModel = mongoose.model<BuilderJobDocument>('BuilderJob', builderJobSchema);
