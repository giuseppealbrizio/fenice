import { describe, it, expect } from 'vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a correct note object', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Note',
      content: 'This is a test note content',
      tags: ['test', 'example'],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should validate note without tags', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Note',
      content: 'This is a test note content',
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should reject empty title', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: '',
      content: 'This is a test note content',
      isPinned: false,
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
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject title longer than 200 characters', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'a'.repeat(201),
      content: 'This is a test note content',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });
});

describe('NoteCreateSchema', () => {
  it('should validate create input with all fields', () => {
    const input = {
      title: 'Test Note',
      content: 'This is a test note content',
      tags: ['test', 'example'],
      isPinned: true,
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate create input with minimal fields', () => {
    const input = {
      title: 'Test Note',
      content: 'This is a test note content',
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject missing title', () => {
    const input = {
      content: 'This is a test note content',
      tags: ['test'],
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject missing content', () => {
    const input = {
      title: 'Test Note',
      tags: ['test'],
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate partial update', () => {
    const input = {
      title: 'Updated Title',
      isPinned: true,
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject extra fields due to strict mode', () => {
    const input = {
      title: 'Updated Title',
      extraField: 'not allowed',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject empty title in update', () => {
    const input = {
      title: '',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject empty content in update', () => {
    const input = {
      content: '',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });
});