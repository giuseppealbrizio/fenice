import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a valid note', () => {
    const validNote = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'This is a test note content',
      tags: ['tag1', 'tag2'],
      archived: false,
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should require all fields except optional ones', () => {
    const result = NoteSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => issue.path[0]);
      expect(fieldErrors).toContain('id');
      expect(fieldErrors).toContain('title');
      expect(fieldErrors).toContain('content');
      expect(fieldErrors).toContain('userId');
      expect(fieldErrors).toContain('createdAt');
      expect(fieldErrors).toContain('updatedAt');
    }
  });

  it('should have default values for tags and archived', () => {
    const noteWithDefaults = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'This is a test note content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(noteWithDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.archived).toBe(false);
    }
  });

  it('should validate title length constraints', () => {
    const baseNote = {
      id: '507f1f77bcf86cd799439011',
      content: 'Valid content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    // Empty title
    expect(NoteSchema.safeParse({ ...baseNote, title: '' }).success).toBe(false);

    // Title too long
    const longTitle = 'a'.repeat(201);
    expect(NoteSchema.safeParse({ ...baseNote, title: longTitle }).success).toBe(false);

    // Valid title
    expect(NoteSchema.safeParse({ ...baseNote, title: 'Valid Title' }).success).toBe(true);
  });

  it('should validate content length constraints', () => {
    const baseNote = {
      id: '507f1f77bcf86cd799439011',
      title: 'Valid title',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    // Empty content
    expect(NoteSchema.safeParse({ ...baseNote, content: '' }).success).toBe(false);

    // Content too long
    const longContent = 'a'.repeat(10001);
    expect(NoteSchema.safeParse({ ...baseNote, content: longContent }).success).toBe(false);

    // Valid content
    expect(NoteSchema.safeParse({ ...baseNote, content: 'Valid content' }).success).toBe(true);
  });
});

describe('NoteCreateSchema', () => {
  it('should validate valid create data', () => {
    const validCreate = {
      title: 'New Note',
      content: 'This is a new note',
      tags: ['work', 'important'],
    };

    const result = NoteCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
  });

  it('should require title and content', () => {
    const result = NoteCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => issue.path[0]);
      expect(fieldErrors).toContain('title');
      expect(fieldErrors).toContain('content');
    }
  });

  it('should have default empty tags array', () => {
    const createData = {
      title: 'Test Note',
      content: 'Test content',
    };

    const result = NoteCreateSchema.safeParse(createData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('should validate title and content constraints', () => {
    // Title too short
    expect(
      NoteCreateSchema.safeParse({
        title: '',
        content: 'Valid content',
      }).success
    ).toBe(false);

    // Content too long
    const longContent = 'a'.repeat(10001);
    expect(
      NoteCreateSchema.safeParse({
        title: 'Valid title',
        content: longContent,
      }).success
    ).toBe(false);
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate partial updates', () => {
    const updateData = {
      title: 'Updated Title',
    };

    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(true);
  });

  it('should allow all optional fields', () => {
    const updateData = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated', 'tags'],
      archived: true,
    };

    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(true);
  });

  it('should allow empty object', () => {
    const result = NoteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject unknown fields due to strict mode', () => {
    const updateData = {
      title: 'Updated Title',
      unknownField: 'should fail',
    };

    const result = NoteUpdateSchema.safeParse(updateData);
    expect(result.success).toBe(false);
  });

  it('should validate field constraints', () => {
    // Title too long
    const longTitle = 'a'.repeat(201);
    expect(
      NoteUpdateSchema.safeParse({
        title: longTitle,
      }).success
    ).toBe(false);

    // Content too long
    const longContent = 'a'.repeat(10001);
    expect(
      NoteUpdateSchema.safeParse({
        content: longContent,
      }).success
    ).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate valid query parameters', () => {
    const queryParams = {
      search: 'test query',
      archived: true,
      tags: 'work,important',
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
    };

    const result = NoteQuerySchema.safeParse(queryParams);
    expect(result.success).toBe(true);
  });

  it('should allow empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should coerce archived boolean', () => {
    const result = NoteQuerySchema.safeParse({ archived: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(true);
    }

    const result2 = NoteQuerySchema.safeParse({ archived: 'false' });
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data.archived).toBe(false);
    }
  });

  it('should validate ISO datetime strings', () => {
    // Valid ISO datetime
    expect(
      NoteQuerySchema.safeParse({
        createdAfter: '2024-01-01T00:00:00.000Z',
      }).success
    ).toBe(true);

    // Invalid datetime format
    expect(
      NoteQuerySchema.safeParse({
        createdAfter: '2024-01-01',
      }).success
    ).toBe(false);
  });
});