import { describe, it, expect } from 'vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a correct note object', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Note',
      content: 'This is test content',
      tags: ['work', 'important'],
      userId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should validate note with empty tags array', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Note',
      content: 'This is test content',
      tags: [],
      userId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should reject empty title', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: '',
      content: 'This is test content',
      tags: ['work'],
      userId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject title longer than 200 characters', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'a'.repeat(201),
      content: 'This is test content',
      tags: ['work'],
      userId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject empty content', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Note',
      content: '',
      tags: ['work'],
      userId: '550e8400-e29b-41d4-a716-446655440001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });
});

describe('NoteCreateSchema', () => {
  it('should validate create input with tags', () => {
    const input = {
      title: 'Test Note',
      content: 'This is test content',
      tags: ['work', 'important'],
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate create input without tags', () => {
    const input = {
      title: 'Test Note',
      content: 'This is test content',
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title in create', () => {
    const input = {
      title: '',
      content: 'This is test content',
      tags: ['work'],
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject empty content in create', () => {
    const input = {
      title: 'Test Note',
      content: '',
      tags: ['work'],
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate partial update', () => {
    const input = {
      title: 'Updated Title',
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate update with all fields', () => {
    const input = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated', 'tags'],
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject unknown fields (strict mode)', () => {
    const input = {
      title: 'Updated Title',
      unknownField: 'value',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });
});
