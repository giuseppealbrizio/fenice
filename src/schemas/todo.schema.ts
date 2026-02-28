import { z } from 'zod';

export const TodoStatusEnum = z.enum(['pending', 'inProgress', 'completed', 'cancelled']);

export const TodoPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

export const TodoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: TodoStatusEnum.default('pending'),
  priority: TodoPriorityEnum.default('medium'),
  dueDate: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const TodoCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: TodoPriorityEnum.default('medium'),
  dueDate: z.iso.datetime().optional(),
});

export const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    status: TodoStatusEnum.optional(),
    priority: TodoPriorityEnum.optional(),
    dueDate: z.iso.datetime().optional(),
    completedAt: z.iso.datetime().optional(),
  })
  .strict();

export const TodoQuerySchema = z.object({
  search: z.string().optional(),
  status: TodoStatusEnum.optional(),
  priority: TodoPriorityEnum.optional(),
  dueBefore: z.iso.datetime().optional(),
  dueAfter: z.iso.datetime().optional(),
  createdAfter: z.iso.datetime().optional(),
  createdBefore: z.iso.datetime().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type TodoQuery = z.infer<typeof TodoQuerySchema>;
