import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  NoteSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  NoteQuerySchema,
} from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  const validNote = {
    id: '507f1f77bcf86cd799439011',
    title: 'Test Note',
    content: 'This is test content for the note',
    tags: ['work', 'important'],
    isPinned: false,
    isPublic: true,
    authorId: '507f1f77bcf86cd799439012',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  it('should validate a valid note', () => {
    expect(NoteSchema.parse(validNote)).toEqual(validNote);
  });

  it('should require id field', () => {
    const { id, ...noteWithoutId } = validNote;
    expect(() => NoteSchema.parse(noteWithoutId)).toThrow();
  });

  it('should require title field', () => {
    const { title, ...noteWithoutTitle } = validNote;
    expect(() => NoteSchema.parse(noteWithoutTitle)).toThrow();
  });

  it('should require content field', () => {
    const { content, ...noteWithoutContent } = validNote;
    expect(() => NoteSchema.parse(noteWithoutContent)).toThrow();
  });

  it('should validate title length constraints', () => {
    // Empty title
    expect(() =>
      NoteSchema.parse({ ...validNote, title: '' })
    ).toThrow();

    // Title too long (201 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, title: 'a'.repeat(201) })
    ).toThrow();

    // Valid title at max length (200 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, title: 'a'.repeat(200) })
    ).not.toThrow();
  });

  it('should validate content length constraints', () => {
    // Empty content
    expect(() =>
      NoteSchema.parse({ ...validNote, content: '' })
    ).toThrow();

    // Content too long (10001 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, content: 'a'.repeat(10001) })
    ).toThrow();

    // Valid content at max length (10000 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, content: 'a'.repeat(10000) })
    ).not.toThrow();
  });

  it('should validate tag array with length constraints', () => {
    // Valid tags
    expect(() =>
      NoteSchema.parse({ ...validNote, tags: ['valid', 'tags'] })
    ).not.toThrow();

    // Empty tag in array
    expect(() =>
      NoteSchema.parse({ ...validNote, tags: ['valid', ''] })
    ).toThrow();

    // Tag too long (51 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, tags: ['a'.repeat(51)] })
    ).toThrow();

    // Valid tag at max length (50 chars)
    expect(() =>
      NoteSchema.parse({ ...validNote, tags: ['a'.repeat(50)] })
    ).not.toThrow();
  });

  it('should default empty tags array', () => {
    const { tags, ...noteWithoutTags } = validNote;
    const result = NoteSchema.parse(noteWithoutTags);
    expect(result.tags).toEqual([]);
  });

  it('should default isPinned to false', () => {
    const { isPinned, ...noteWithoutPinned } = validNote;
    const result = NoteSchema.parse(noteWithoutPinned);
    expect(result.isPinned).toBe(false);
  });

  it('should default isPublic to false', () => {
    const { isPublic, ...noteWithoutPublic } = validNote;
    const result = NoteSchema.parse(noteWithoutPublic);
    expect(result.isPublic).toBe(false);
  });

  it('should validate ISO datetime strings', () => {
    expect(() =>
      NoteSchema.parse({ ...validNote, createdAt: 'invalid-date' })
    ).toThrow();

    expect(() =>
      NoteSchema.parse({ ...validNote, updatedAt: 'invalid-date' })
    ).toThrow();
  });
});

describe('NoteCreateSchema', () => {
  const validCreateData = {
    title: 'New Note',
    content: 'This is new note content',
    tags: ['test'],
    isPinned: true,
    isPublic: false,
  };

  it('should validate valid create data', () => {
    expect(NoteCreateSchema.parse(validCreateData)).toEqual(validCreateData);
  });

  it('should require title and content', () => {
    const { title, ...withoutTitle } = validCreateData;
    expect(() => NoteCreateSchema.parse(withoutTitle)).toThrow();

    const { content, ...withoutContent } = validCreateData;
    expect(() => NoteCreateSchema.parse(withoutContent)).toThrow();
  });

  it('should default optional fields', () => {
    const minimal = {
      title: validCreateData.title,
      content: validCreateData.content,
    };
    const result = NoteCreateSchema.parse(minimal);
    expect(result.tags).toEqual([]);
    expect(result.isPinned).toBe(false);
    expect(result.isPublic).toBe(false);
  });

  it('should not allow id or authorId in create data', () => {
    const withId = { ...validCreateData, id: '507f1f77bcf86cd799439011' };
    const parseResult = NoteCreateSchema.safeParse(withId);
    // Should parse successfully but ignore the id field
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data).not.toHaveProperty('id');
    }
  });
});

describe('NoteUpdateSchema', () => {
  const validUpdateData = {
    title: 'Updated Note',
    content: 'Updated content',
    tags: ['updated'],
    isPinned: true,
  };

  it('should validate valid update data', () => {
    expect(NoteUpdateSchema.parse(validUpdateData)).toEqual(validUpdateData);
  });

  it('should allow partial updates', () => {
    expect(NoteUpdateSchema.parse({ title: 'New Title' })).toEqual({
      title: 'New Title',
    });

    expect(NoteUpdateSchema.parse({ isPinned: true })).toEqual({
      isPinned: true,
    });
  });

  it('should allow empty update (though not useful)', () => {
    expect(NoteUpdateSchema.parse({})).toEqual({});
  });

  it('should be strict - reject unknown fields', () => {
    const withUnknownField = {
      ...validUpdateData,
      unknownField: 'value',
    };
    expect(() => NoteUpdateSchema.parse(withUnknownField)).toThrow();
  });

  it('should not allow id or authorId updates', () => {
    const withId = { ...validUpdateData, id: '507f1f77bcf86cd799439011' };
    expect(() => NoteUpdateSchema.parse(withId)).toThrow();

    const withAuthorId = { ...validUpdateData, authorId: '507f1f77bcf86cd799439011' };
    expect(() => NoteUpdateSchema.parse(withAuthorId)).toThrow();
  });
});

describe('NoteQuerySchema', () => {
  it('should validate valid query parameters', () => {
    const validQuery = {
      search: 'test query',
      tags: 'work,important',
      isPinned: true,
      isPublic: false,
      authorId: '507f1f77bcf86cd799439011',
      createdAfter: '2024-01-01T00:00:00.000Z',
      createdBefore: '2024-12-31T23:59:59.000Z',
    };

    expect(NoteQuerySchema.parse(validQuery)).toEqual(validQuery);
  });

  it('should allow empty query', () => {
    expect(NoteQuerySchema.parse({})).toEqual({});
  });

  it('should coerce boolean query params', () => {
    const queryWithStringBooleans = {
      isPinned: 'true',
      isPublic: 'false',
    };

    const result = NoteQuerySchema.parse(queryWithStringBooleans);
    expect(result.isPinned).toBe(true);
    expect(result.isPublic).toBe(false);
  });

  it('should validate datetime strings', () => {
    expect(() =>
      NoteQuerySchema.parse({ createdAfter: 'invalid-date' })
    ).toThrow();

    expect(() =>
      NoteQuerySchema.parse({ createdBefore: 'not-a-date' })
    ).toThrow();
  });

  it('should allow partial query parameters', () => {
    const partialQueries = [
      { search: 'test' },
      { tags: 'work' },
      { isPinned: true },
      { authorId: '507f1f77bcf86cd799439011' },
      { createdAfter: '2024-01-01T00:00:00.000Z' },
    ];

    partialQueries.forEach((query) => {
      expect(() => NoteQuerySchema.parse(query)).not.toThrow();
    });
  });
});