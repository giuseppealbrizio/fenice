import { z } from 'zod';

export const TodoStatusEnum = z.enum(['pending', 'in-progress', 'completed']);

export const TodoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: TodoStatusEnum.default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.iso.datetime().optional(),
  completed: z.boolean().default(false),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const TodoCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: TodoStatusEnum.default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.iso.datetime().optional(),
});

export const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    status: TodoStatusEnum.optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.iso.datetime().optional(),
    completed: z.boolean().optional(),
  })
  .strict();

export const TodoQuerySchema = z.object({
  search: z.string().optional(),
  status: TodoStatusEnum.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  completed: z.coerce.boolean().optional(),
  dueBefore: z.iso.datetime().optional(),
  dueAfter: z.iso.datetime().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type TodoQuery = z.infer<typeof TodoQuerySchema>;
