import mongoose, { Schema, type Document } from 'mongoose';

export interface NoteDocument extends Document {
  title: string;
  content: string;
  userId: mongoose.Types.ObjectId;
  tags: string[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<NoteDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]): boolean => tags.length <= 20,
        message: 'Cannot have more than 20 tags',
      },
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        ret['userId'] = String(ret['userId']);
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Indexes for efficient querying
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, archived: 1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ title: 'text', content: 'text' });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);