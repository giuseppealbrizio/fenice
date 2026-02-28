import mongoose, { Schema, type Document } from 'mongoose';
import type { Todo } from '../schemas/todo.schema.js';
import { PriorityEnum } from '../schemas/todo.schema.js';

export interface TodoDocument extends Omit<Todo, 'id'>, Document {}

const todoSchema = new Schema<TodoDocument>(
  {
    userId: {
      type: String,
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
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: PriorityEnum.options,
      default: 'medium',
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
        if (ret['createdAt'] instanceof Date) ret['createdAt'] = ret['createdAt'].toISOString();
        if (ret['updatedAt'] instanceof Date) ret['updatedAt'] = ret['updatedAt'].toISOString();
        return ret;
      },
    },
  }
);

todoSchema.index({ userId: 1, createdAt: -1 });
todoSchema.index({ userId: 1, completed: 1 });

export const TodoModel = mongoose.model<TodoDocument>('Todo', todoSchema);
