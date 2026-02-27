import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a complete note', () => {
    const validNote = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'This is a test note content',
      userId: '507f1f77bcf86cd799439012',
      tags: ['work', 'important'],
      isPublic: false,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validNote);
    }
  });

  it('should apply defaults for optional fields', () => {
    const noteWithDefaults = {
      id: '507f1f77bcf86cd799439011',
      title: 'Test Note',
      content: 'This is a test note content',
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

  it('should reject invalid note data', () => {
    const invalidNote = {
      id: '',
      title: '', // Too short
      content: 'Valid content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: 'invalid-date',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject title longer than 200 characters', () => {
    const longTitle = 'a'.repeat(201);
    const invalidNote = {
      id: '507f1f77bcf86cd799439011',
      title: longTitle,
      content: 'Valid content',
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject content longer than 10000 characters', () => {
    const longContent = 'a'.repeat(10001);
    const invalidNote = {
      id: '507f1f77bcf86cd799439011',
      title: 'Valid title',
      content: longContent,
      userId: '507f1f77bcf86cd799439012',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  it('should validate valid note creation data', () => {
    const validCreateData = {
      title: 'New Note',
      content: 'This is a new note',
      tags: ['work', 'project'],
      isPublic: true,
    };

    const result = NoteCreateSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validCreateData);
    }
  });

  it('should work with minimal required data', () => {
    const minimalData = {
      title: 'Title',
      content: 'Content',
    };

    const result = NoteCreateSchema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Title');
      expect(result.data.content).toBe('Content');
      expect(result.data.tags).toBeUndefined();
      expect(result.data.isPublic).toBeUndefined();
    }
  });

  it('should reject empty title', () => {
    const invalidData = {
      title: '',
      content: 'Valid content',
    };

    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const invalidData = {
      title: 'Valid title',
      // Missing content
    };

    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject tags with empty strings', () => {
    const invalidData = {
      title: 'Valid title',
      content: 'Valid content',
      tags: ['valid', '', 'another-valid'],
    };

    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject tags longer than 50 characters', () => {
    const longTag = 'a'.repeat(51);
    const invalidData = {
      title: 'Valid title',
      content: 'Valid content',
      tags: ['valid', longTag],
    };

    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate valid update data', () => {
    const validUpdateData = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated', 'tag'],
      isPublic: true,
    };

    const result = NoteUpdateSchema.safeParse(validUpdateData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validUpdateData);
    }
  });

  it('should work with partial update data', () => {
    const partialData = {
      title: 'Only title updated',
    };

    const result = NoteUpdateSchema.safeParse(partialData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Only title updated');
      expect(result.data.content).toBeUndefined();
    }
  });

  it('should work with empty object', () => {
    const result = NoteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data)).toHaveLength(0);
    }
  });

  it('should reject extra fields due to strict mode', () => {
    const dataWithExtra = {
      title: 'Valid title',
      extraField: 'should be rejected',
    };

    const result = NoteUpdateSchema.safeParse(dataWithExtra);
    expect(result.success).toBe(false);
  });

  it('should reject invalid field values', () => {
    const invalidData = {
      title: '', // Too short
      isPublic: 'not-a-boolean',
    };

    const result = NoteUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate valid query parameters', () => {
    const validQuery = {
      search: 'test search',
      tags: 'work,important,project',
      isPublic: 'true',
      createdAfter: '2023-01-01T00:00:00.000Z',
      createdBefore: '2023-12-31T23:59:59.999Z',
    };

    const result = NoteQuerySchema.safeParse(validQuery);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('test search');
      expect(result.data.tags).toBe('work,important,project');
      expect(result.data.isPublic).toBe(true); // Coerced to boolean
    }
  });

  it('should work with empty query parameters', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBeUndefined();
      expect(result.data.tags).toBeUndefined();
      expect(result.data.isPublic).toBeUndefined();
    }
  });

  it('should coerce boolean values correctly', () => {
    const testCases = [
      { input: { isPublic: 'true' }, expected: true },
      { input: { isPublic: 'false' }, expected: false },
      { input: { isPublic: '1' }, expected: true },
      { input: { isPublic: '0' }, expected: false },
    ];

    for (const testCase of testCases) {
      const result = NoteQuerySchema.safeParse(testCase.input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(testCase.expected);
      }
    }
  });

  it('should reject invalid date formats', () => {
    const invalidQuery = {
      createdAfter: 'not-a-date',
    };

    const result = NoteQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
  });
});