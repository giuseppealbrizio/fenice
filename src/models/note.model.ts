import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

export interface NoteDocument extends Omit<Note, 'id'>, Document {
  userId: string;
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
      minlength: 1,
      maxlength: 10000,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]): boolean => v.length <= 20,
        message: 'Maximum 20 tags allowed',
      },
    },
    archived: {
      type: Boolean,
      default: false,
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
        return ret;
      },
    },
  }
);

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, archived: 1 });
noteSchema.index({ userId: 1, tags: 1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);