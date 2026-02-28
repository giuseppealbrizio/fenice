import { z } from 'zod';

export const PriorityEnum = z.enum(['low', 'medium', 'high']);

export const TodoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  completed: z.boolean().default(false),
  priority: PriorityEnum.default('medium'),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const TodoCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: PriorityEnum.optional(),
});

export const TodoUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    completed: z.boolean().optional(),
    priority: PriorityEnum.optional(),
  })
  .strict();

export const TodoQuerySchema = z.object({
  search: z.string().optional(),
  completed: z.coerce.boolean().optional(),
  priority: PriorityEnum.optional(),
  createdAfter: z.iso.datetime().optional(),
  createdBefore: z.iso.datetime().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;
export type TodoCreate = z.infer<typeof TodoCreateSchema>;
export type TodoUpdate = z.infer<typeof TodoUpdateSchema>;
export type TodoQuery = z.infer<typeof TodoQuerySchema>;
