import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).default([]),
  archived: z.boolean().default(false),
  userId: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).default([]),
});

export const NoteUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
    tags: z.array(z.string()).optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export const NoteQuerySchema = z.object({
  search: z.string().optional(),
  archived: z.coerce.boolean().optional(),
  tags: z.string().optional(),
  createdAfter: z.iso.datetime().optional(),
  createdBefore: z.iso.datetime().optional(),
});

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;