import { describe, it, expect } from 'vitest';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  const validNote = {
    id: '6501234567890123456789ab',
    userId: '6501234567890123456789cd',
    title: 'My Note',
    content: 'This is my note content',
    tags: ['work', 'important'],
    archived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  it('should validate a valid note', () => {
    const result = NoteSchema.safeParse(validNote);
    expect(result.success).toBe(true);
  });

  it('should apply default values', () => {
    const noteWithDefaults = {
      id: '6501234567890123456789ab',
      userId: '6501234567890123456789cd',
      title: 'My Note',
      content: 'This is my note content',
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

  it('should reject invalid title length', () => {
    const invalidNote = { ...validNote, title: '' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject title longer than 200 characters', () => {
    const invalidNote = { ...validNote, title: 'a'.repeat(201) };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const invalidNote = { ...validNote, content: '' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });

  it('should reject invalid datetime formats', () => {
    const invalidNote = { ...validNote, createdAt: 'invalid-date' };
    const result = NoteSchema.safeParse(invalidNote);
    expect(result.success).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  const validCreateData = {
    title: 'New Note',
    content: 'This is new note content',
    tags: ['personal', 'thoughts'],
  };

  it('should validate valid create data', () => {
    const result = NoteCreateSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
  });

  it('should allow optional tags', () => {
    const createDataWithoutTags = {
      title: 'New Note',
      content: 'This is new note content',
    };

    const result = NoteCreateSchema.safeParse(createDataWithoutTags);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const incompleteData = { title: 'New Note' };
    const result = NoteCreateSchema.safeParse(incompleteData);
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

  it('should reject title longer than 200 characters', () => {
    const invalidData = { ...validCreateData, title: 'a'.repeat(201) };
    const result = NoteCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('NoteUpdateSchema', () => {
  const validUpdateData = {
    title: 'Updated Note',
    content: 'Updated content',
    tags: ['updated', 'modified'],
    archived: true,
  };

  it('should validate valid update data', () => {
    const result = NoteUpdateSchema.safeParse(validUpdateData);
    expect(result.success).toBe(true);
  });

  it('should allow partial updates', () => {
    const partialUpdate = { title: 'Only title update' };
    const result = NoteUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it('should allow empty updates', () => {
    const emptyUpdate = {};
    const result = NoteUpdateSchema.safeParse(emptyUpdate);
    expect(result.success).toBe(true);
  });

  it('should reject empty title when provided', () => {
    const invalidUpdate = { title: '' };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });

  it('should reject empty content when provided', () => {
    const invalidUpdate = { content: '' };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });

  it('should reject title longer than 200 characters', () => {
    const invalidUpdate = { title: 'a'.repeat(201) };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });

  it('should reject unknown fields due to strict mode', () => {
    const invalidUpdate = { title: 'Valid Title', unknownField: 'should not be allowed' };
    const result = NoteUpdateSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe('NoteQuerySchema', () => {
  it('should validate empty query', () => {
    const result = NoteQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate query with all fields', () => {
    const fullQuery = {
      search: 'important notes',
      tags: 'work,personal',
      archived: 'false',
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
    };

    const result = NoteQuerySchema.safeParse(fullQuery);
    expect(result.success).toBe(true);
  });

  it('should coerce boolean values', () => {
    const queryWithStringBoolean = { archived: 'true' };
    const result = NoteQuerySchema.safeParse(queryWithStringBoolean);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(true);
    }
  });

  it('should validate datetime formats', () => {
    const queryWithDates = {
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.999Z',
    };

    const result = NoteQuerySchema.safeParse(queryWithDates);
    expect(result.success).toBe(true);
  });

  it('should reject invalid datetime formats', () => {
    const queryWithInvalidDate = { createdAfter: 'not-a-date' };
    const result = NoteQuerySchema.safeParse(queryWithInvalidDate);
    expect(result.success).toBe(false);
  });

  it('should handle individual optional fields', () => {
    const queries = [
      { search: 'test search' },
      { tags: 'work,personal' },
      { archived: 'false' },
      { createdAfter: '2024-01-01T00:00:00.000Z' },
      { createdBefore: '2024-12-31T23:59:59.999Z' },
    ];

    for (const query of queries) {
      const result = NoteQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    }
  });
});