import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  const validNote = {
    id: '507f1f77bcf86cd799439011',
    title: 'My Note',
    content: 'This is the content of my note.',
    tags: ['work', 'important'],
    userId: '507f1f77bcf86cd799439012',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('should validate a valid note', () => {
    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should fail for missing required fields', () => {
    const incomplete = {
      tags: ['work'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const result = NoteSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should fail for empty title', () => {
    const result = NoteSchema.safeParse({ ...validNote, title: '' });
    expect(result.success).toBe(false);
  });

  it('should fail for title too long', () => {
    const longTitle = 'a'.repeat(201);
    const result = NoteSchema.safeParse({ ...validNote, title: longTitle });
    expect(result.success).toBe(false);
  });

  it('should validate with empty tags array', () => {
    const result = NoteSchema.safeParse({ ...validNote, tags: [] });
    expect(result.success).toBe(true);
  });

  it('should fail for invalid date format', () => {
    const result = NoteSchema.safeParse({ ...validNote, createdAt: 'invalid-date' });
    expect(result.success).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  const validCreate = {
    title: 'My Note',
    content: 'This is the content of my note.',
    tags: ['work', 'important'],
  };

  it('should validate valid create data', () => {
    const result = NoteCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should default tags to empty array', () => {
    const withoutTags = {
      title: 'My Note',
      content: 'This is the content of my note.',
    };
    const result = NoteCreateSchema.safeParse(withoutTags);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('should fail for missing title', () => {
    const incomplete = {
      content: 'This is the content of my note.',
      tags: ['work', 'important'],
    };
    const result = NoteCreateSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should fail for missing content', () => {
    const incomplete = {
      title: 'My Note',
      tags: ['work', 'important'],
    };
    const result = NoteCreateSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('should fail for empty title', () => {
    const result = NoteCreateSchema.safeParse({ ...validCreate, title: '' });
    expect(result.success).toBe(false);
  });

  it('should fail for title too long', () => {
    const longTitle = 'a'.repeat(201);
    const result = NoteCreateSchema.safeParse({ ...validCreate, title: longTitle });
    expect(result.success).toBe(false);
  });

  it('should validate with empty content', () => {
    const result = NoteCreateSchema.safeParse({ ...validCreate, content: '' });
    expect(result.success).toBe(true);
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate partial updates', () => {
    const updates = [
      { title: 'Updated Title' },
      { content: 'Updated content' },
      { tags: ['updated', 'tags'] },
      { title: 'New Title', content: 'New content' },
    ];

    updates.forEach(update => {
      const result = NoteUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  it('should validate empty update', () => {
    const result = NoteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should fail for empty title when provided', () => {
    const result = NoteUpdateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('should fail for title too long when provided', () => {
    const longTitle = 'a'.repeat(201);
    const result = NoteUpdateSchema.safeParse({ title: longTitle });
    expect(result.success).toBe(false);
  });

  it('should validate empty content when provided', () => {
    const result = NoteUpdateSchema.safeParse({ content: '' });
    expect(result.success).toBe(true);
  });

  it('should fail for unknown fields (strict mode)', () => {
    const result = NoteUpdateSchema.safeParse({ unknownField: 'value' });
    expect(result.success).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate all optional fields', () => {
    const query = {
      search: 'test search',
      tags: 'work,important',
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
    };
    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should validate partial query', () => {
    const queries = [
      { search: 'test' },
      { tags: 'work' },
      { createdAfter: '2024-01-01T00:00:00.000Z' },
      { createdBefore: '2024-12-31T23:59:59.999Z' },
    ];

    queries.forEach(query => {
      const result = NoteQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  it('should fail for invalid date formats', () => {
    const queries = [
      { createdAfter: 'invalid-date' },
      { createdBefore: 'not-a-date' },
    ];

    queries.forEach(query => {
      const result = NoteQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});