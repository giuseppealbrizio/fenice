import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
  userId: z.string(),
  tags: z.array(z.string().min(1).max(50)).default([]),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
  tags: z.array(z.string().min(1).max(50)).optional(),
  pinned: z.boolean().optional(),
});

export const NoteUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(10000).optional(),
    tags: z.array(z.string().min(1).max(50)).optional(),
    pinned: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export const NoteQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  pinned: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;