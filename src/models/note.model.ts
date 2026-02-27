import mongoose, { Schema, type Document } from 'mongoose';
import type { Note } from '../schemas/note.schema.js';

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
      minlength: 1,
      maxlength: 10000,
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
        validator: function (tags: string[]): boolean {
          return tags.every((tag) => tag.length >= 1 && tag.length <= 50);
        },
        message: 'Each tag must be between 1 and 50 characters',
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

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ userId: 1, archived: 1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ '$**': 'text' });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);