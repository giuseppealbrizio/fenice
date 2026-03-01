import { z } from 'zod';

export const TodoStatusEnum = z.enum(['pending', 'completed', 'cancelled']);

export const TodoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: TodoStatusEnum.default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TodoCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional(),
});

export const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    status: TodoStatusEnum.optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .strict();

export const TodoQuerySchema = z.object({
  search: z.string().optional(),
  status: TodoStatusEnum.optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type TodoQuery = z.infer<typeof TodoQuerySchema>;
