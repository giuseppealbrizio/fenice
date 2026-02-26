import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

export interface NoteDocument extends Omit<Note, 'id'>, Document {}

const noteSchema = new Schema<NoteDocument>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tags: [{
      type: String,
      maxlength: 50,
      trim: true,
    }],
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = ret['_id']?.toString();
        ret['userId'] = ret['userId']?.toString();
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

// Compound indexes for efficient querying
noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, pinned: -1, createdAt: -1 });
noteSchema.index({ userId: 1, archived: 1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });

// Text index for search functionality
noteSchema.index({
  title: 'text',
  content: 'text',
  tags: 'text',
});

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);