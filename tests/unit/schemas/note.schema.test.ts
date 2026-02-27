import { describe, it, expect } from 'vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a correct note object', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Note',
      content: 'This is the content of the note.',
      tags: ['work', 'important'],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should reject empty title', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: '',
      content: 'This is the content of the note.',
      tags: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject title longer than 200 characters', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'a'.repeat(201),
      content: 'This is the content of the note.',
      tags: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject empty content', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Note',
      content: '',
      tags: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should default tags to empty array', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Note',
      content: 'This is the content of the note.',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = NoteSchema.parse(note);
    expect(parsed.tags).toEqual([]);
  });

  it('should default isPinned to false', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Note',
      content: 'This is the content of the note.',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const parsed = NoteSchema.parse(note);
    expect(parsed.isPinned).toBe(false);
  });
});

describe('NoteCreateSchema', () => {
  it('should validate note creation input', () => {
    const input = {
      title: 'New Note',
      content: 'This is a new note content.',
      tags: ['personal'],
      isPinned: true,
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate minimal note creation input', () => {
    const input = {
      title: 'New Note',
      content: 'This is a new note content.',
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title', () => {
    const input = {
      title: '',
      content: 'This is a new note content.',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject empty content', () => {
    const input = {
      title: 'New Note',
      content: '',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject title longer than 200 characters', () => {
    const input = {
      title: 'a'.repeat(201),
      content: 'This is a new note content.',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate note update input', () => {
    const input = {
      title: 'Updated Note Title',
      content: 'Updated content',
      tags: ['updated', 'work'],
      isPinned: true,
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate partial note update', () => {
    const input = {
      title: 'Updated Title Only',
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject unknown properties (strict mode)', () => {
    const input = {
      title: 'Updated Title',
      unknownField: 'should fail',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject empty title', () => {
    const input = {
      title: '',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject empty content', () => {
    const input = {
      content: '',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });
});
