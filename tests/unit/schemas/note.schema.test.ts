import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema, NoteQuerySchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  describe('NoteSchema validation', () => {
    it('should validate a complete note object', () => {
      const validNote = {
        id: '507f1f77bcf86cd799439011',
        title: 'My First Note',
        content: 'This is the content of my first note.',
        userId: '507f1f77bcf86cd799439012',
        tags: ['work', 'important'],
        archived: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = NoteSchema.safeParse(validNote);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalNote = {
        id: '507f1f77bcf86cd799439011',
        title: 'Title',
        content: 'Content',
        userId: '507f1f77bcf86cd799439012',
        tags: [],
        archived: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = NoteSchema.safeParse(minimalNote);
      expect(result.success).toBe(true);
    });

    it('should reject invalid title length', () => {
      const invalidNote = {
        id: '507f1f77bcf86cd799439011',
        title: '', // Too short
        content: 'Content',
        userId: '507f1f77bcf86cd799439012',
        tags: [],
        archived: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = NoteSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('title'))).toBe(true);
      }
    });

    it('should reject missing required fields', () => {
      const incompleteNote = {
        id: '507f1f77bcf86cd799439011',
        title: 'Title',
        // Missing content
        userId: '507f1f77bcf86cd799439012',
        tags: [],
        archived: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = NoteSchema.safeParse(incompleteNote);
      expect(result.success).toBe(false);
    });

    it('should reject invalid datetime format', () => {
      const invalidNote = {
        id: '507f1f77bcf86cd799439011',
        title: 'Title',
        content: 'Content',
        userId: '507f1f77bcf86cd799439012',
        tags: [],
        archived: false,
        createdAt: 'invalid-date',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = NoteSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
    });
  });

  describe('NoteCreateSchema validation', () => {
    it('should validate a complete create request', () => {
      const validCreate = {
        title: 'My New Note',
        content: 'This is the content.',
        tags: ['work', 'draft'],
        archived: false,
      };

      const result = NoteCreateSchema.safeParse(validCreate);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalCreate = {
        title: 'Title',
        content: 'Content',
      };

      const result = NoteCreateSchema.safeParse(minimalCreate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
        expect(result.data.archived).toBe(false);
      }
    });

    it('should reject title that is too long', () => {
      const invalidCreate = {
        title: 'x'.repeat(201), // Too long
        content: 'Content',
      };

      const result = NoteCreateSchema.safeParse(invalidCreate);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompleteCreate = {
        title: 'Title',
        // Missing content
      };

      const result = NoteCreateSchema.safeParse(incompleteCreate);
      expect(result.success).toBe(false);
    });
  });

  describe('NoteUpdateSchema validation', () => {
    it('should validate partial update with all fields', () => {
      const validUpdate = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated', 'tag'],
        archived: true,
      };

      const result = NoteUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate with single field update', () => {
      const partialUpdate = {
        title: 'New Title Only',
      };

      const result = NoteUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate empty object', () => {
      const emptyUpdate = {};

      const result = NoteUpdateSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject unknown fields due to strict mode', () => {
      const invalidUpdate = {
        title: 'Valid Title',
        unknownField: 'This should not be allowed',
      };

      const result = NoteUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should reject invalid title length', () => {
      const invalidUpdate = {
        title: '', // Too short
      };

      const result = NoteUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('NoteQuerySchema validation', () => {
    it('should validate complete query object', () => {
      const validQuery = {
        search: 'important notes',
        tags: 'work,personal',
        archived: true,
        createdAfter: '2023-01-01T00:00:00.000Z',
        createdBefore: '2023-12-31T23:59:59.999Z',
      };

      const result = NoteQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should validate empty query object', () => {
      const emptyQuery = {};

      const result = NoteQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
    });

    it('should validate single query parameter', () => {
      const singleParamQuery = {
        search: 'meeting notes',
      };

      const result = NoteQuerySchema.safeParse(singleParamQuery);
      expect(result.success).toBe(true);
    });

    it('should handle boolean coercion for archived field', () => {
      const queryWithStringBoolean = {
        archived: 'true',
      };

      const result = NoteQuerySchema.safeParse(queryWithStringBoolean);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.archived).toBe(true);
      }
    });

    it('should reject invalid datetime format', () => {
      const invalidQuery = {
        createdAfter: 'not-a-date',
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });
  });

  describe('Property-based testing', () => {
    it('should validate notes with random valid data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 24, maxLength: 24 }), // MongoDB ObjectId length
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 24, maxLength: 24 }), // MongoDB ObjectId length
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          fc.boolean(),
          (id, title, content, userId, tags, archived) => {
            const note = {
              id,
              title,
              content,
              userId,
              tags,
              archived,
              createdAt: '2023-01-01T00:00:00.000Z',
              updatedAt: '2023-01-01T00:00:00.000Z',
            };

            const result = NoteSchema.safeParse(note);
            expect(result.success).toBe(true);
          }
        )
      );
    });

    it('should validate create requests with random valid data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          fc.boolean(),
          (title, content, tags, archived) => {
            const createData = {
              title,
              content,
              tags,
              archived,
            };

            const result = NoteCreateSchema.safeParse(createData);
            expect(result.success).toBe(true);
          }
        )
      );
    });
  });
});