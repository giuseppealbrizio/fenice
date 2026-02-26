import { describe, it, expect } from 'vitest';
import { NoteSchema, NoteCreateSchema, NoteUpdateSchema } from '../../../src/schemas/note.schema.js';

describe('NoteSchema', () => {
  it('should validate a correct note object', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Sample Note',
      content: 'This is the content of the note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should validate a note with optional content', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Sample Note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).not.toThrow();
  });

  it('should reject empty title', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: '',
      content: 'This is the content of the note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject title longer than 200 characters', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'a'.repeat(201),
      content: 'This is the content of the note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });

  it('should reject missing required fields', () => {
    const note = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      content: 'This is the content of the note',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => NoteSchema.parse(note)).toThrow();
  });
});

describe('NoteCreateSchema', () => {
  it('should validate correct create input', () => {
    const input = {
      title: 'New Note',
      content: 'Note content here',
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should validate create input without content', () => {
    const input = {
      title: 'New Note',
    };
    expect(() => NoteCreateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title in create', () => {
    const input = {
      title: '',
      content: 'Note content here',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject title longer than 200 characters in create', () => {
    const input = {
      title: 'a'.repeat(201),
      content: 'Note content here',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });

  it('should reject missing title in create', () => {
    const input = {
      content: 'Note content here',
    };
    expect(() => NoteCreateSchema.parse(input)).toThrow();
  });
});

describe('NoteUpdateSchema', () => {
  it('should validate correct update input', () => {
    const input = {
      title: 'Updated Note',
      content: 'Updated content',
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate partial update input', () => {
    const input = {
      title: 'Updated Note',
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate update with only content', () => {
    const input = {
      content: 'Updated content',
    };
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should validate empty update object', () => {
    const input = {};
    expect(() => NoteUpdateSchema.parse(input)).not.toThrow();
  });

  it('should reject empty title in update', () => {
    const input = {
      title: '',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject title longer than 200 characters in update', () => {
    const input = {
      title: 'a'.repeat(201),
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });

  it('should reject unknown fields due to strict mode', () => {
    const input = {
      title: 'Updated Note',
      unknownField: 'should be rejected',
    };
    expect(() => NoteUpdateSchema.parse(input)).toThrow();
  });
});