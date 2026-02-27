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
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
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

noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ authorId: 1, createdAt: -1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ isPrivate: 1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);