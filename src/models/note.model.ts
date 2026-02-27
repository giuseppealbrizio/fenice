import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

export interface NoteDocument extends Omit<Note, 'id' | 'userId'>, Document {
  userId: mongoose.Types.ObjectId;
}

const noteSchema = new Schema<NoteDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    isPinned: {
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

noteSchema.index({ userId: 1, title: 'text', content: 'text' });
noteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);
