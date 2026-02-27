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
    title: 'My First Note',
    content: 'This is the content of my note.',
    tags: ['personal', 'todo'],
    userId: '507f1f77bcf86cd799439012',
    isPublic: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  it('should validate a complete note', () => {
    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should require all required fields', () => {
    const result = NoteSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map(issue => issue.path[0]);
      expect(fieldErrors).toContain('id');
      expect(fieldErrors).toContain('title');
      expect(fieldErrors).toContain('content');
      expect(fieldErrors).toContain('userId');
      expect(fieldErrors).toContain('createdAt');
      expect(fieldErrors).toContain('updatedAt');
    }
  });

  it('should apply default values', () => {
    const noteWithDefaults = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'Test content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(noteWithDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.isPublic).toBe(false);
    }
  });

  it('should reject invalid title length', () => {
    const noteWithLongTitle = {
      ...validNote,
      title: 'a'.repeat(201), // Exceeds max length
    };

    const result = NoteSchema.safeParse(noteWithLongTitle);
    expect(result.success).toBe(false);
  });

  it('should reject empty title', () => {
    const noteWithEmptyTitle = {
      ...validNote,
      title: '',
    };

    const result = NoteSchema.safeParse(noteWithEmptyTitle);
    expect(result.success).toBe(false);
  });

  it('should validate ISO datetime strings', () => {
    const noteWithInvalidDate = {
      ...validNote,
      createdAt: 'not-a-date',
    };

    const result = NoteSchema.safeParse(noteWithInvalidDate);
    expect(result.success).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  const validCreateData = {
    title: 'New Note',
    content: 'This is a new note.',
    tags: ['work', 'important'],
    isPublic: true,
  };

  it('should validate valid create data', () => {
    const result = NoteCreateSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
  });

  it('should require title and content', () => {
    const result = NoteCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.issues.map(issue => issue.path[0]);
      expect(fieldErrors).toContain('title');
      expect(fieldErrors).toContain('content');
    }
  });

  it('should apply default values for optional fields', () => {
    const minimalData = {
      title: 'Minimal Note',
      content: 'Just title and content.',
    };

    const result = NoteCreateSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.isPublic).toBe(false);
    }
  });

  it('should reject empty title', () => {
    const dataWithEmptyTitle = {
      ...validCreateData,
      title: '',
    };

    const result = NoteCreateSchema.safeParse(dataWithEmptyTitle);
    expect(result.success).toBe(false);
  });

  it('should reject title exceeding max length', () => {
    const dataWithLongTitle = {
      ...validCreateData,
      title: 'a'.repeat(201),
    };

    const result = NoteCreateSchema.safeParse(dataWithLongTitle);
    expect(result.success).toBe(false);
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

  it('should validate empty update', () => {
    const result = NoteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate all fields individually', () => {
    const fullUpdate = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated', 'tags'],
      isPublic: true,
    };

    const result = NoteUpdateSchema.safeParse(fullUpdate);
    expect(result.success).toBe(true);
  });

  it('should reject extra fields due to strict mode', () => {
    const updateWithExtraField = {
      title: 'Updated Title',
      extraField: 'not allowed',
    };

    const result = NoteUpdateSchema.safeParse(updateWithExtraField);
    expect(result.success).toBe(false);
  });

  it('should validate title constraints', () => {
    const updateWithEmptyTitle = {
      title: '',
    };

    const result = NoteUpdateSchema.safeParse(updateWithEmptyTitle);
    expect(result.success).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate all query parameters', () => {
    const query = {
      search: 'test query',
      tags: 'work,personal',
      isPublic: 'true',
      userId: '507f1f77bcf86cd799439012',
      createdAfter: '2023-01-01T00:00:00.000Z',
      createdBefore: '2023-12-31T23:59:59.999Z',
    };

    const result = NoteQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(true);
    }
  });

  it('should coerce boolean values', () => {
    const testCases = [
      { input: { isPublic: 'true' }, expected: true },
      { input: { isPublic: 'false' }, expected: false },
      { input: { isPublic: '1' }, expected: true },
      { input: { isPublic: '0' }, expected: false },
      { input: { isPublic: 'yes' }, expected: true },
      { input: { isPublic: 'no' }, expected: false },
      { input: { isPublic: true }, expected: true },
      { input: { isPublic: false }, expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = NoteQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(expected);
      }
    });
  });

  it('should validate ISO datetime strings', () => {
    const queryWithInvalidDate = {
      createdAfter: 'not-a-date',
    };

    const result = NoteQuerySchema.safeParse(queryWithInvalidDate);
    expect(result.success).toBe(false);
  });
});