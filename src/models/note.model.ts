import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

export interface NoteDocument extends Omit<Note, 'id'>, Document {
  authorId: mongoose.Types.ObjectId;
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
        validator: function (tags: string[]) {
          return tags.every((tag) => tag.length >= 1 && tag.length <= 50);
        },
        message: 'Each tag must be between 1 and 50 characters',
      },
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
        ret['id'] = String(ret['_id']);
        ret['authorId'] = String(ret['authorId']);
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  }
);

noteSchema.index({ authorId: 1, createdAt: -1 });
noteSchema.index({ title: 'text', content: 'text' });
noteSchema.index({ tags: 1 });
noteSchema.index({ isPinned: 1, createdAt: -1 });
noteSchema.index({ isPublic: 1, createdAt: -1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);