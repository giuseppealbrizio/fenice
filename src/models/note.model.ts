import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

export interface NoteDocument extends Omit<Note, 'id'>, Document {}

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
      minlength: 1,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]): boolean {
          return tags.every(tag => tag.length >= 1 && tag.length <= 50);
        },
        message: 'Each tag must be between 1 and 50 characters',
      },
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        if (ret['createdAt'] instanceof Date) ret['createdAt'] = ret['createdAt'].toISOString();
        if (ret['updatedAt'] instanceof Date) ret['updatedAt'] = ret['updatedAt'].toISOString();
        return ret;
      },
    },
  }
);

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, title: 'text', content: 'text' });
noteSchema.index({ userId: 1, tags: 1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);
