import { describe, it, expect } from 'vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema, NoteQuerySchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  const validNote = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Note',
    content: 'This is a test note content.',
    userId: '507f1f77bcf86cd799439012',
    tags: ['work', 'important'],
    archived: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  it('should validate a valid note', () => {
    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for optional fields', () => {
    const noteWithDefaults = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'This is a test note content.',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    
    const result = NoteSchema.safeParse(noteWithDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.archived).toBe(false);
    }
  });

  it('should reject invalid title length', () => {
    const invalidNote = { ...validNote, title: '' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject title longer than 200 chars', () => {
    const invalidNote = { ...validNote, title: 'a'.repeat(201) };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const invalidNote = { ...validNote, content: '' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject content longer than 10000 chars', () => {
    const invalidNote = { ...validNote, content: 'a'.repeat(10001) };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject invalid ISO datetime', () => {
    const invalidNote = { ...validNote, createdAt: 'invalid-date' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject invalid tag length', () => {
    const invalidNote = { ...validNote, tags: [''] };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject tag longer than 50 chars', () => {
    const invalidNote = { ...validNote, tags: ['a'.repeat(51)] };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  const validCreateData = {
    title: 'New Note',
    content: 'This is new note content.',
    tags: ['personal'],
    archived: false,
  };

  it('should validate valid create data', () => {
    const result = NoteCreateSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
  });

  it('should apply defaults for optional fields', () => {
    const minimalData = {
      title: 'Minimal Note',
      content: 'Minimal content.',
    };
    
    const result = NoteCreateSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.archived).toBe(false);
    }
  });

  it('should require title', () => {
    const invalidData = { ...validCreateData };
    delete (invalidData as Partial<typeof validCreateData>).title;
    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should require content', () => {
    const invalidData = { ...validCreateData };
    delete (invalidData as Partial<typeof validCreateData>).content;
    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty title', () => {
    const invalidData = { ...validCreateData, title: '' };
    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const invalidData = { ...validCreateData, content: '' };
    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate partial update data', () => {
    const updateData = { title: 'Updated Title' };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(true);
  });

  it('should validate empty update object', () => {
    const result = NoteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate all optional fields', () => {
    const updateData = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated', 'tags'],
      archived: true,
    };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(true);
  });

  it('should reject unknown fields due to strict mode', () => {
    const updateData = { 
      title: 'Updated Title',
      unknownField: 'should be rejected',
    };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(false);
  });

  it('should reject empty title when provided', () => {
    const updateData = { title: '' };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(false);
  });

  it('should reject empty content when provided', () => {
    const updateData = { content: '' };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid tag when provided', () => {
    const updateData = { tags: [''] };
    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate full query', () => {
    const query = {
      search: 'test search',
      archived: 'true',
      tags: 'work,personal',
      createdAfter: '2023-01-01T00:00:00.000Z',
      createdBefore: '2023-12-31T23:59:59.000Z',
    };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(true);
    }
  });

  it('should coerce boolean fields', () => {
    const query = { archived: 'false' };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(false);
    }
  });

  it('should validate ISO datetime fields', () => {
    const query = {
      createdAfter: '2023-01-01T00:00:00.000Z',
      createdBefore: '2023-12-31T23:59:59.000Z',
    };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should reject invalid ISO datetime', () => {
    const query = { createdAfter: 'invalid-date' };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it('should accept tags as comma-separated string', () => {
    const query = { tags: 'work,personal,urgent' };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toBe('work,personal,urgent');
    }
  });
});