import mongoose, { Schema, type Document } from 'mongoose';
import type { Todo } from '../schemas/todo.schema.js';
import { TodoStatusEnum, TodoPriorityEnum } from '../schemas/todo.schema.js';

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
    },
    status: {
      type: String,
      enum: TodoStatusEnum.options,
      default: 'pending',
    },
    priority: {
      type: String,
      enum: TodoPriorityEnum.options,
      default: 'medium',
    },
    dueDate: Date,
    completedAt: Date,
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
        if (ret['dueDate'] instanceof Date) ret['dueDate'] = ret['dueDate'].toISOString();
        if (ret['completedAt'] instanceof Date) ret['completedAt'] = ret['completedAt'].toISOString();
        return ret;
      },
    },
  }
);

todoSchema.index({ userId: 1, status: 1 });
todoSchema.index({ userId: 1, dueDate: 1 });
todoSchema.index({ userId: 1, createdAt: 1 });

export const TodoModel = mongoose.model<TodoDocument>('Todo', todoSchema);
