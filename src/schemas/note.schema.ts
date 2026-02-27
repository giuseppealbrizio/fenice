import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  authorId: z.string(),
  authorEmail: z.string(),
  isPrivate: z.boolean().default(false),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  isPrivate: z.boolean().default(false),
});

export const NoteUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    isPrivate: z.boolean().optional(),
  })
  .strict();

export const NoteQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(),
  isPrivate: z.coerce.boolean().optional(),
  authorId: z.string().optional(),
  createdAfter: z.iso.datetime().optional(),
  createdBefore: z.iso.datetime().optional(),
});

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;